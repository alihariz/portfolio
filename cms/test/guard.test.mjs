/**
 * Step 3: nobody but the owner, from the editor's own page, can change anything.
 * Each case is a real attack or mistake, not a unit of the implementation.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { startCms, ORIGIN } from './helpers.mjs'
import { loadConfig } from '../src/config.mjs'

let cms
let etag
before(async () => {
  cms = await startCms()
  etag = (await cms.call('GET', '/api/content')).headers.etag
})
after(() => cms.close())

const save = (o = {}) => cms.call('PUT', '/api/content', { body: { hello: 'not a site' }, headers: { 'if-match': etag }, ...o })

test('the owner, through Serve, can read the document and load the editor', async () => {
  const r = await cms.call('GET', '/api/content')
  assert.equal(r.status, 200)
  assert.equal(r.json.schemaVersion, 2)
  const page = await cms.call('GET', '/')
  assert.equal(page.status, 200)
  assert.match(page.headers['content-type'], /text\/html/)
  const lib = await cms.call('GET', '/lib/validate-site.mjs')
  assert.equal(lib.status, 200)
  assert.match(lib.headers['content-type'], /javascript/, 'module script needs a JavaScript MIME under nosniff')
})

test('health answers without identity, for the Docker healthcheck', async () => {
  const r = await cms.call('GET', '/api/health', { owner: null, host: '127.0.0.1:8095' })
  assert.equal(r.status, 200)
  assert.equal(r.json.ok, true)
})

test('a device on the LAN or tailnet that is not the owner is refused', async () => {
  for (const owner of [null, '', 'someone-else@github', 'OWNER@github.evil']) {
    const r = await cms.call('GET', '/api/content', { owner })
    assert.equal(r.status, 403, `login ${owner}`)
  }
})

test('the owner login is compared case-insensitively, as Tailscale may vary case', async () => {
  const r = await cms.call('GET', '/api/content', { owner: 'Owner@GitHub' })
  assert.equal(r.status, 200)
})

test('DNS rebinding: any other Host is refused, even with the owner header', async () => {
  for (const host of ['rebind.attacker.example:8443', 'alielitedesk:8095', '192.168.68.105:8095']) {
    const r = await cms.call('GET', '/api/content', { host })
    assert.equal(r.status, 421, `host ${host}`)
  }
  // No Host at all: Node's HTTP server refuses it before Express sees it.
  const none = await cms.call('GET', '/api/content', { host: null })
  assert.equal(none.status, 400)
  const put = await save({ host: 'rebind.attacker.example:8095' })
  assert.equal(put.status, 421)
})

test('Serve rewriting Host to the loopback address is still accepted', async () => {
  const r = await cms.call('GET', '/api/content', { host: '127.0.0.1:8095' })
  assert.equal(r.status, 200)
})

test('a page on another site cannot use the owner\'s browser to make changes', async () => {
  // What a browser attaches to a cross-site form post or fetch.
  const crossSite = await save({ site: 'cross-site', origin: 'https://evil.example' })
  assert.equal(crossSite.status, 403)
  // Older browsers omit Sec-Fetch-Site; Origin still gives it away.
  const noFetchMeta = await save({ site: null, origin: 'https://evil.example' })
  assert.equal(noFetchMeta.status, 403)
  // Same-site but a different origin (another service on the tailnet).
  const sameSite = await save({ site: 'same-site', origin: 'https://alielitedesk.tail0000.ts.net:3001' })
  assert.equal(sameSite.status, 403)
  // A plain HTML form cannot add X-CMS.
  const noHeader = await save({ xcms: null })
  assert.equal(noHeader.status, 403)
  // No Origin at all (curl, a script) is refused too.
  const noOrigin = await save({ origin: null, site: null })
  assert.equal(noOrigin.status, 403)
})

test('the three POST routes a cross-site form could reach before are closed', async () => {
  // Before: POST /api/variants/:n/from/:s, /api/restore/:file and /api/media took no body and checked nothing.
  const form = { site: 'cross-site', origin: 'null', xcms: null, raw: Buffer.from('a=b'), headers: { 'content-type': 'application/x-www-form-urlencoded' } }
  for (const url of ['/api/variants/default/from/default', '/api/variants', '/api/restore/default-x.json', '/api/restore', '/api/publish', '/api/media']) {
    const r = await cms.call('POST', url, form)
    assert.equal(r.status, 403, url)
  }
})

test('refusals are JSON with a reason the editor can show', async () => {
  const r = await save({ origin: 'https://evil.example', site: 'cross-site' })
  assert.match(r.headers['content-type'], /application\/json/)
  assert.ok(r.json.error.length > 10)
})

test('changes must be JSON, and a document over 1 MB is refused before parsing', async () => {
  const form = await cms.call('PUT', '/api/content', { raw: Buffer.from('a=b'), headers: { 'content-type': 'application/x-www-form-urlencoded', 'if-match': etag } })
  assert.equal(form.status, 415)
  const huge = await cms.call('PUT', '/api/content', { raw: Buffer.alloc(1.2 * 1024 * 1024, 32), headers: { 'content-type': 'application/json', 'if-match': etag } })
  assert.equal(huge.status, 413)
  assert.match(huge.headers['content-type'], /json/)
  const broken = await cms.call('PUT', '/api/content', { raw: Buffer.from('{"a":'), headers: { 'content-type': 'application/json', 'if-match': etag } })
  assert.equal(broken.status, 400)
})

test('responses carry the hardening headers and no framework fingerprint', async () => {
  const r = await cms.call('GET', '/')
  assert.equal(r.headers['x-powered-by'], undefined)
  assert.equal(r.headers['x-content-type-options'], 'nosniff')
  assert.equal(r.headers['x-frame-options'], 'SAMEORIGIN')
  assert.match(r.headers['content-security-policy'], /script-src 'self'/)
  assert.match(r.headers['content-security-policy'], /frame-ancestors 'self'/)
  const api = await cms.call('GET', '/api/variants')
  assert.equal(api.headers['cache-control'], 'no-store')
})

test('unknown API routes are JSON 404s, and server errors never leak paths', async () => {
  const r = await cms.call('GET', '/api/nope')
  assert.equal(r.status, 404)
  assert.match(r.headers['content-type'], /json/)
  const bad = await cms.call('GET', '/api/content?variant=../../etc/passwd')
  assert.equal(bad.status, 400)
  assert.doesNotMatch(bad.body.toString(), /\/content|\/tmp|node_modules/)
})

test('it refuses to start without an origin and an owner, rather than let anyone in', () => {
  const none = loadConfig({})
  assert.ok(none.problems.some((p) => p.includes('CMS_ORIGIN')))
  assert.ok(none.problems.some((p) => p.includes('CMS_OWNER_LOGIN')))
  assert.ok(loadConfig({ CMS_ORIGIN: 'http://alielitedesk:8095', CMS_OWNER_LOGIN: 'a@b' }).problems.some((p) => p.includes('https')))
  assert.ok(loadConfig({ CMS_ORIGIN: ORIGIN, CMS_OWNER_LOGIN: 'a@b', CONTENT_DIR: '/content', BACKUP_DIR: '/content/backups' }).problems.some((p) => p.includes('outside')))
  assert.deepEqual(loadConfig({ CMS_ORIGIN: ORIGIN, CMS_OWNER_LOGIN: 'a@b' }).problems, [])
})
