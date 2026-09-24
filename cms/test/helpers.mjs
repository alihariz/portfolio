import http from 'node:http'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from '../src/app.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
// The real document the site ships with.
export const SITE_JSON = path.resolve(HERE, '../../src/data/site.json')

export const ORIGIN = 'https://alielitedesk.tail0000.ts.net:8443'
export const HOST = 'alielitedesk.tail0000.ts.net:8443'
export const OWNER = 'owner@github'

/**
 * Start a CMS on an ephemeral port with its own content and backup dirs.
 * `call()` defaults to what Tailscale Serve plus the editor page would send.
 */
export async function startCms(overrides = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'cms-test-'))
  const contentDir = path.join(root, 'content')
  const backupDir = path.join(root, 'backups')
  mkdirSync(contentDir, { recursive: true })
  writeFileSync(path.join(contentDir, 'site.json'), (await import('node:fs')).readFileSync(SITE_JSON))

  const config = {
    port: 8095,
    origin: ORIGIN,
    owner: OWNER,
    extraHosts: [],
    contentDir,
    backupDir,
    maxBackups: 5,
    mediaQuotaBytes: 5 * 1024 * 1024,
    problems: [],
    ...overrides,
  }
  const app = createApp(config)
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  const port = server.address().port

  /**
   * @param {string} method
   * @param {string} url
   * @param {object} o  body (object → JSON), raw (Buffer), headers, and
   *   host/owner/origin/xcms/site overrides; pass null to omit a header.
   */
  function call(method, url, o = {}) {
    const headers = {
      host: o.host === undefined ? HOST : o.host,
      'tailscale-user-login': o.owner === undefined ? OWNER : o.owner,
      ...(method !== 'GET' && method !== 'HEAD'
        ? {
            origin: o.origin === undefined ? ORIGIN : o.origin,
            'x-cms': o.xcms === undefined ? '1' : o.xcms,
            'sec-fetch-site': o.site === undefined ? 'same-origin' : o.site,
          }
        : {}),
      ...(o.headers || {}),
    }
    let body = o.raw
    if (o.body !== undefined) {
      body = Buffer.from(JSON.stringify(o.body))
      headers['content-type'] ??= 'application/json'
    }
    for (const k of Object.keys(headers)) if (headers[k] === null) delete headers[k]
    if (body) headers['content-length'] = body.length

    return new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port, method, path: url, headers, setHost: false }, (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const buf = Buffer.concat(chunks)
          let json
          try { json = JSON.parse(buf.toString('utf8')) } catch { /* not JSON */ }
          resolve({ status: res.statusCode, headers: res.headers, body: buf, json })
        })
      })
      req.on('error', reject)
      if (body) req.write(body)
      req.end()
    })
  }

  async function close() {
    await new Promise((r) => server.close(r))
    rmSync(root, { recursive: true, force: true })
  }

  return { call, close, contentDir, backupDir, config, store: app.locals.store }
}

/** Build a multipart body the way a browser's FormData would. */
export async function multipart(files) {
  const fd = new FormData()
  for (const f of files) fd.append(f.field || 'files', new Blob([f.data], { type: f.type }), f.name)
  const req = new Request('http://x/', { method: 'POST', body: fd })
  return { raw: Buffer.from(await req.arrayBuffer()), headers: { 'content-type': req.headers.get('content-type') } }
}
