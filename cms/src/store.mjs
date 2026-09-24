/**
 * Reading and writing the site documents.
 *
 * Every write — save, publish, restore, new variant — goes through write(),
 * which in one place:
 *   - serialises writes per file, so two saves can never interleave;
 *   - checks the caller saw the current version (ETag / If-Match), so a
 *     second tab cannot silently erase the first tab's edit;
 *   - validates the document with the same rules as CI and the editor, so a
 *     document that would break the page is never written;
 *   - backs up the version it replaces, per document, outside the published
 *     directory;
 *   - writes to a uniquely named temp file, fsyncs it, renames it into place
 *     and fsyncs the directory, so a crash or power cut leaves either the old
 *     file or the new one, never half of one.
 *
 * Layout:
 *   CONTENT_DIR/site.json              live document      (published at /content)
 *   CONTENT_DIR/site.<variant>.json    audience variants  (published too — not private)
 *   CONTENT_DIR/media/                 uploaded images    (published at /media)
 *   CONTENT_DIR/.staging/              temp files; same filesystem so rename is atomic
 *   BACKUP_DIR/<doc>.<timestamp>.json  last MAX_BACKUPS of each document (never published)
 */
import { promises as fs, mkdirSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { validateSite, formatIssues } from '../lib/validate-site.mjs'
import { HttpError } from './errors.mjs'

export const VARIANT_RE = /^[a-z0-9-]{1,32}$/
const BACKUP_RE = /^(default|[a-z0-9-]{1,32})\.(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)(-\d{4})?\.json$/

export const etagOf = (bytes) => `"${crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 24)}"`

export function createStore({ contentDir, backupDir, maxBackups }) {
  const staging = path.join(contentDir, '.staging')
  const mediaDir = path.join(contentDir, 'media')
  for (const d of [contentDir, backupDir, staging, mediaDir]) mkdirSync(d, { recursive: true })
  // Anything left in staging is from a write that never finished.
  for (const f of readdirSync(staging)) rmSync(path.join(staging, f), { force: true })

  /* ── naming ─────────────────────────────────────────────────────────── */

  function keyOf(variant) {
    if (variant === undefined || variant === null || variant === '' || variant === 'default') return 'default'
    if (!VARIANT_RE.test(variant)) {
      throw new HttpError(400, `"${variant}" is not a valid variant name: use 1–32 lowercase letters, digits or hyphens.`)
    }
    return variant
  }
  const fileOf = (key) => path.join(contentDir, key === 'default' ? 'site.json' : `site.${key}.json`)

  /* ── locking ────────────────────────────────────────────────────────── */

  const queues = new Map()
  function withLock(key, fn) {
    const prev = queues.get(key) || Promise.resolve()
    const run = prev.then(fn, fn)
    const tail = run.catch(() => {})
    queues.set(key, tail)
    tail.then(() => { if (queues.get(key) === tail) queues.delete(key) })
    return run
  }

  /* ── primitives ─────────────────────────────────────────────────────── */

  async function readBytes(key) {
    try {
      return await fs.readFile(fileOf(key))
    } catch (e) {
      if (e.code === 'ENOENT') return null
      throw e
    }
  }

  async function fsyncDir(dir) {
    const fh = await fs.open(dir, 'r')
    try { await fh.sync() } finally { await fh.close() }
  }

  async function atomicWrite(target, bytes) {
    const tmp = path.join(staging, `${path.basename(target)}.${crypto.randomUUID()}.tmp`)
    const fh = await fs.open(tmp, 'wx', 0o644)
    try {
      await fh.writeFile(bytes)
      await fh.sync()
    } finally {
      await fh.close()
    }
    try {
      await fs.rename(tmp, target)
    } catch (e) {
      await fs.unlink(tmp).catch(() => {})
      throw e
    }
    await fsyncDir(path.dirname(target))
  }

  let seq = 0
  async function backup(key, bytes) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const name = `${key}.${stamp}-${String(seq++ % 10000).padStart(4, '0')}.json`
    await fs.writeFile(path.join(backupDir, name), bytes, { flag: 'wx', mode: 0o600 })
    const mine = (await fs.readdir(backupDir)).filter((f) => f.startsWith(`${key}.`) && f.endsWith('.json')).sort()
    for (const old of mine.slice(0, Math.max(0, mine.length - maxBackups))) {
      await fs.unlink(path.join(backupDir, old)).catch(() => {})
    }
    return name
  }

  function checkValid(doc) {
    const { errors, warnings } = validateSite(doc)
    if (errors.length) {
      throw new HttpError(422, 'Not saved: the site could not display this.', {
        details: formatIssues(errors),
        warnings: formatIssues(warnings),
      })
    }
    return formatIssues(warnings)
  }

  /* ── public API ─────────────────────────────────────────────────────── */

  async function read(variant) {
    const key = keyOf(variant)
    const bytes = await readBytes(key)
    if (!bytes) throw new HttpError(404, key === 'default' ? 'There is no live document yet.' : `There is no variant "${key}".`)
    return { key, doc: JSON.parse(bytes.toString('utf8')), etag: etagOf(bytes) }
  }

  /**
   * @param {object} opts
   *   ifMatch  the ETag the caller last saw; required unless `create` or `force`
   *   create   the document must not exist yet (new variant)
   *   force    skip the ETag check (publish and restore, which are explicit
   *            overwrites and back the old version up first)
   */
  function write(variant, doc, { ifMatch, create = false, force = false } = {}) {
    const key = keyOf(variant)
    return withLock(key, async () => {
      const current = await readBytes(key)
      if (create && current) throw new HttpError(409, `A variant called "${key}" already exists.`)
      if (!create && !current) throw new HttpError(404, `There is no variant "${key}" to save over.`)
      if (!create && !force) {
        if (!ifMatch) throw new HttpError(428, 'Not saved: the request did not say which version it was editing (If-Match).')
        const now = etagOf(current)
        if (ifMatch !== now) {
          throw new HttpError(412, 'Not saved: this document was changed somewhere else since you opened it. Reload to see the latest version, then make your edit again.', { etag: now })
        }
      }
      const warnings = checkValid(doc)
      const bytes = Buffer.from(JSON.stringify(doc, null, 2) + '\n', 'utf8')
      const backedUp = current ? await backup(key, current) : null
      await atomicWrite(fileOf(key), bytes)
      return { key, etag: etagOf(bytes), backup: backedUp, warnings }
    })
  }

  async function remove(variant) {
    const key = keyOf(variant)
    if (key === 'default') throw new HttpError(400, 'The live document cannot be deleted.')
    return withLock(key, async () => {
      const current = await readBytes(key)
      if (!current) throw new HttpError(404, `There is no variant "${key}".`)
      const backedUp = await backup(key, current)
      await fs.unlink(fileOf(key))
      await fsyncDir(contentDir)
      return { key, backup: backedUp }
    })
  }

  async function listVariants() {
    const names = (await fs.readdir(contentDir))
      .map((f) => f.match(/^site\.([a-z0-9-]{1,32})\.json$/)?.[1])
      .filter(Boolean)
      .sort()
    return ['default', ...names]
  }

  async function listBackups(variant) {
    const key = variant ? keyOf(variant) : null
    const out = []
    for (const file of await fs.readdir(backupDir)) {
      const m = file.match(BACKUP_RE)
      if (!m || (key && m[1] !== key)) continue
      const st = await fs.stat(path.join(backupDir, file))
      const iso = m[2].replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, 'T$1:$2:$3.$4Z')
      out.push({ file, variant: m[1], savedAt: iso, size: st.size })
    }
    return out.sort((a, b) => (a.file < b.file ? 1 : -1))
  }

  /** Put a backup back. The document it belongs to is in its name. */
  async function restore(file) {
    const m = typeof file === 'string' && file.match(BACKUP_RE)
    if (!m) throw new HttpError(400, 'That is not a backup file name.')
    let bytes
    try {
      bytes = await fs.readFile(path.join(backupDir, file))
    } catch (e) {
      if (e.code === 'ENOENT') throw new HttpError(404, 'That backup no longer exists.')
      throw e
    }
    const key = m[1]
    const exists = !!(await readBytes(key))
    return write(key, JSON.parse(bytes.toString('utf8')), exists ? { force: true } : { create: true })
  }

  /** Copy a variant over the live document, if it is still the version the caller saw. */
  async function publish(variant, ifMatch) {
    const source = await read(variant)
    if (source.key === 'default') throw new HttpError(400, 'That already is the live document.')
    if (!ifMatch) throw new HttpError(428, 'Not published: the request did not say which version of the variant it saw (If-Match).')
    if (ifMatch !== source.etag) {
      throw new HttpError(412, `Not published: "${source.key}" changed since you opened it. Reload it and check before publishing.`, { etag: source.etag })
    }
    return write('default', source.doc, { force: true })
  }

  /** Every document that currently mentions a /media/ path. */
  async function mediaUsers(name) {
    const users = []
    for (const key of await listVariants()) {
      const bytes = await readBytes(key)
      if (bytes && bytes.includes(`/media/${name}`)) users.push(key)
    }
    return users
  }

  return {
    contentDir, mediaDir, backupDir, staging,
    read, write, remove, publish, restore, listVariants, listBackups, mediaUsers, keyOf,
  }
}
