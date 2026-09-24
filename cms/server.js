/**
 * portfolio-cms — the editor behind aliharizanuari.org
 *
 * SECURITY MODEL: there is none, deliberately.
 *
 * This service has no login, no password and no token. It is safe only
 * because it is never routed on the Cloudflare Tunnel, so the public internet
 * cannot reach it — exactly like Nextcloud and Uptime Kuma on this box. It
 * listens on a host port reachable over Tailscale and the LAN, and anyone on
 * the tailnet can edit the site. On a personal tailnet that is the intended
 * trade: no credentials to manage, nothing to leak.
 *
 * If a route for this is ever added to the tunnel, put Cloudflare Access in
 * front of it first.
 *
 * Layout on disk (all under CONTENT_DIR, which Caddy also serves read-only
 * to the public site at /content and /media):
 *   site.json            the live document
 *   site.<variant>.json  audience variants
 *   backups/             timestamped copies, last 30 kept
 *   media/              uploaded images, served at /media/<file>
 */
import express from 'express'
import multer from 'multer'
import { promises as fs } from 'node:fs'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const PORT = Number(process.env.PORT || 8095)
const CONTENT_DIR = process.env.CONTENT_DIR || '/content'
const MEDIA_DIR = path.join(CONTENT_DIR, 'media')
const BACKUP_DIR = path.join(CONTENT_DIR, 'backups')
const SCHEMA_VERSION = 2
const MAX_BACKUPS = 30

for (const d of [CONTENT_DIR, MEDIA_DIR, BACKUP_DIR]) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
}

const app = express()
app.use(express.json({ limit: '8mb' }))

/* ── Helpers ──────────────────────────────────────────────────────────── */

// Variant names become filenames. Anything outside this set is rejected
// rather than sanitised, so there is no path traversal to reason about.
const VARIANT_RE = /^[a-z0-9-]{1,32}$/i

function docPath(variant) {
  if (!variant || variant === 'default') return path.join(CONTENT_DIR, 'site.json')
  if (!VARIANT_RE.test(variant)) throw Object.assign(new Error('bad variant name'), { status: 400 })
  return path.join(CONTENT_DIR, `site.${variant}.json`)
}

async function readDoc(variant) {
  try {
    return JSON.parse(await fs.readFile(docPath(variant), 'utf8'))
  } catch (e) {
    if (e.code === 'ENOENT') return null
    throw e
  }
}

/** Write atomically: a half-written site.json would break the public site. */
async function writeDoc(variant, doc) {
  const target = docPath(variant)
  const tmp = `${target}.tmp`
  await fs.writeFile(tmp, JSON.stringify(doc, null, 2) + '\n', 'utf8')
  await fs.rename(tmp, target)
}

async function backup(variant) {
  const current = await readDoc(variant)
  if (!current) return
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const name = `${variant || 'default'}-${stamp}.json`
  await fs.writeFile(path.join(BACKUP_DIR, name), JSON.stringify(current, null, 2), 'utf8')

  // Trim oldest — this runs on every save and would grow without bound.
  const files = (await fs.readdir(BACKUP_DIR)).filter((f) => f.endsWith('.json')).sort()
  for (const f of files.slice(0, Math.max(0, files.length - MAX_BACKUPS))) {
    await fs.unlink(path.join(BACKUP_DIR, f)).catch(() => {})
  }
}

function validate(doc) {
  const errs = []
  if (!doc || typeof doc !== 'object') return ['document is not an object']
  if (doc.schemaVersion !== SCHEMA_VERSION) errs.push(`schemaVersion must be ${SCHEMA_VERSION}`)
  if (!doc.profile?.name) errs.push('profile.name is required')
  if (!Array.isArray(doc.sections)) errs.push('sections must be an array')
  else {
    const ids = new Set()
    doc.sections.forEach((s, i) => {
      if (!s.id) errs.push(`sections[${i}].id is required`)
      else if (ids.has(s.id)) errs.push(`duplicate section id "${s.id}"`)
      else ids.add(s.id)
      if (typeof s.visible !== 'boolean') errs.push(`sections[${i}].visible must be a boolean`)
    })
  }
  return errs
}

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e)
  res.status(e.status || 500).json({ error: e.message })
})

/* ── API ──────────────────────────────────────────────────────────────── */

app.get('/api/health', (_req, res) => res.json({ ok: true, schemaVersion: SCHEMA_VERSION }))

app.get('/api/variants', wrap(async (_req, res) => {
  const files = await fs.readdir(CONTENT_DIR)
  const variants = files
    .filter((f) => /^site\.[a-z0-9-]+\.json$/i.test(f))
    .map((f) => f.replace(/^site\./, '').replace(/\.json$/, ''))
  res.json({ variants: ['default', ...variants] })
}))

app.get('/api/content', wrap(async (req, res) => {
  const doc = await readDoc(req.query.variant)
  if (!doc) return res.status(404).json({ error: 'not found' })
  res.json(doc)
}))

app.put('/api/content', wrap(async (req, res) => {
  const variant = req.query.variant
  const errs = validate(req.body)
  if (errs.length) return res.status(422).json({ error: 'validation failed', details: errs })
  await backup(variant)
  await writeDoc(variant, req.body)
  res.json({ ok: true, savedAt: new Date().toISOString() })
}))

/** Copy the live document into a new variant, or promote a variant to live. */
app.post('/api/variants/:name/from/:source', wrap(async (req, res) => {
  const { name, source } = req.params
  const doc = await readDoc(source === 'default' ? null : source)
  if (!doc) return res.status(404).json({ error: `source "${source}" not found` })
  const target = name === 'default' ? null : name
  await backup(target)
  await writeDoc(target, doc)
  res.json({ ok: true })
}))

app.delete('/api/variants/:name', wrap(async (req, res) => {
  if (req.params.name === 'default') return res.status(400).json({ error: 'cannot delete the live document' })
  await backup(req.params.name)
  await fs.unlink(docPath(req.params.name))
  res.json({ ok: true })
}))

app.get('/api/backups', wrap(async (_req, res) => {
  const files = (await fs.readdir(BACKUP_DIR)).filter((f) => f.endsWith('.json')).sort().reverse()
  res.json({ backups: files.slice(0, MAX_BACKUPS) })
}))

app.post('/api/restore/:file', wrap(async (req, res) => {
  const file = req.params.file
  if (!/^[a-z0-9-]+\.json$/i.test(file)) return res.status(400).json({ error: 'bad name' })
  const doc = JSON.parse(await fs.readFile(path.join(BACKUP_DIR, file), 'utf8'))
  const variant = file.startsWith('default-') ? null : file.split('-')[0]
  await backup(variant)
  await writeDoc(variant, doc)
  res.json({ ok: true })
}))

/* ── Media ────────────────────────────────────────────────────────────── */

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/svg+xml'])

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, MEDIA_DIR),
    filename: (_req, file, cb) => {
      // Keep something human-readable, drop anything that could escape the dir.
      const safe = path.basename(file.originalname).replace(/[^a-z0-9._-]/gi, '-').toLowerCase()
      cb(null, `${Date.now()}-${safe}`)
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) =>
    ALLOWED.has(file.mimetype) ? cb(null, true) : cb(new Error(`unsupported type ${file.mimetype}`)),
})

app.post('/api/media', upload.array('files', 10), (req, res) => {
  res.json({ files: (req.files || []).map((f) => ({ name: f.filename, url: `/media/${f.filename}`, size: f.size })) })
})

app.get('/api/media', wrap(async (_req, res) => {
  const files = await fs.readdir(MEDIA_DIR)
  const out = []
  for (const f of files) {
    const st = await fs.stat(path.join(MEDIA_DIR, f))
    if (st.isFile()) out.push({ name: f, url: `/media/${f}`, size: st.size, mtime: st.mtimeMs })
  }
  out.sort((a, b) => b.mtime - a.mtime)
  res.json({ files: out })
}))

app.delete('/api/media/:name', wrap(async (req, res) => {
  const name = path.basename(req.params.name)
  await fs.unlink(path.join(MEDIA_DIR, name))
  res.json({ ok: true })
}))

// Preview uploads from the editor itself.
app.use('/media', express.static(MEDIA_DIR, { maxAge: '1h' }))

/* ── Admin UI ─────────────────────────────────────────────────────────── */

app.use('/', express.static(path.join(process.cwd(), 'public')))

app.listen(PORT, '0.0.0.0', () => {
  console.log(`portfolio-cms on :${PORT}, content dir ${CONTENT_DIR}`)
  console.log('No authentication by design — do not route this on the tunnel.')
})
