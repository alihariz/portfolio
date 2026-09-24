/**
 * Image uploads.
 *
 * Whatever is uploaded is served from aliharizanuari.org/media, so only real
 * images may land there. The old code trusted the browser's declared MIME
 * type, which meant an HTML page or an SVG with a script in it could be
 * stored and served as active content from the site's own origin.
 *
 * Now:
 *   - the first bytes must be a PNG, JPEG, WebP or AVIF signature (SVG and
 *     everything else are refused, whatever they claim to be);
 *   - sharp decodes and re-encodes every image to WebP, which also drops EXIF
 *     (phone photos carry GPS) and caps the width at 2400 px;
 *   - the file is named by a hash of its bytes, so two uploads can never
 *     overwrite each other and re-uploading the same picture is a no-op;
 *   - a total quota stops the disk filling up;
 *   - failures are JSON with a reason, not an HTML 500.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import express from 'express'
import multer from 'multer'
import sharp from 'sharp'
import { HttpError, wrap } from './errors.mjs'

const MAX_FILE = 8 * 1024 * 1024
const MAX_FILES = 10
const MAX_WIDTH = 2400
// Anything already in media/ from before this change may still be shown, but
// only if it is an image by extension; the directory is empty on the box today.
const SERVABLE_RE = /^[a-z0-9._-]+\.(webp|avif|png|jpe?g)$/i

const SIGNATURES = [
  ['PNG', (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))],
  ['JPEG', (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  ['WebP', (b) => b.length > 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP'],
  ['AVIF', (b) => b.length > 12 && b.toString('latin1', 4, 8) === 'ftyp' && /^avi[fs]$/.test(b.toString('latin1', 8, 12))],
]
export const sniff = (buf) => SIGNATURES.find(([, is]) => is(buf))?.[0] || null

async function usedBytes(dir) {
  let total = 0
  for (const f of await fs.readdir(dir)) {
    const st = await fs.stat(path.join(dir, f)).catch(() => null)
    if (st?.isFile()) total += st.size
  }
  return total
}

export function mediaRoutes({ store, quotaBytes }) {
  const router = express.Router()
  const dir = store.mediaDir

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE, files: MAX_FILES, fields: 0, parts: MAX_FILES },
  }).array('files', MAX_FILES)

  const MULTER_MESSAGES = {
    LIMIT_FILE_SIZE: [413, `Each image must be under ${MAX_FILE / 1024 / 1024} MB.`],
    LIMIT_FILE_COUNT: [413, `Upload at most ${MAX_FILES} images at a time.`],
    LIMIT_PART_COUNT: [413, `Upload at most ${MAX_FILES} images at a time.`],
    LIMIT_FIELD_COUNT: [400, 'Send only image files, under the field name "files".'],
    LIMIT_UNEXPECTED_FILE: [400, 'Send only image files, under the field name "files".'],
  }

  router.post('/api/media', (req, res, next) => {
    if (!req.is('multipart/form-data')) return next(new HttpError(415, 'Upload images as multipart/form-data.'))
    upload(req, res, (err) => {
      if (!err) return next()
      const known = err instanceof multer.MulterError && MULTER_MESSAGES[err.code]
      next(known ? new HttpError(known[0], known[1]) : new HttpError(400, 'The upload could not be read.'))
    })
  }, wrap(async (req, res) => {
    const files = req.files || []
    if (!files.length) throw new HttpError(400, 'No images were attached.')

    // Check every file before writing any, so a batch lands whole or not at all.
    const encoded = []
    for (const f of files) {
      const kind = sniff(f.buffer)
      if (!kind) {
        throw new HttpError(415, `"${f.originalname}" is not a PNG, JPEG, WebP or AVIF image. (SVG and other formats are not accepted.)`)
      }
      let out
      try {
        out = await sharp(f.buffer, { failOn: 'error', limitInputPixels: 64_000_000 })
          .rotate() // apply the EXIF orientation before the EXIF is dropped
          .resize({ width: MAX_WIDTH, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer({ resolveWithObject: true })
      } catch {
        throw new HttpError(415, `"${f.originalname}" looks like a ${kind} but could not be read. It may be damaged.`)
      }
      const name = crypto.createHash('sha256').update(out.data).digest('hex').slice(0, 16) + '.webp'
      encoded.push({ original: f.originalname, name, data: out.data, width: out.info.width, height: out.info.height })
    }

    const incoming = encoded.reduce((n, e) => n + e.data.length, 0)
    const used = await usedBytes(dir)
    if (used + incoming > quotaBytes) {
      throw new HttpError(507, `Not uploaded: the image folder would pass its ${Math.round(quotaBytes / 1024 / 1024)} MB limit. Delete some unused images first.`)
    }

    for (const e of encoded) {
      await fs.writeFile(path.join(dir, e.name), e.data, { flag: 'wx', mode: 0o644 }).catch((err) => {
        if (err.code !== 'EEXIST') throw err // same bytes, same name: already there
      })
    }
    res.json({
      files: encoded.map((e) => ({ name: e.name, url: `/media/${e.name}`, width: e.width, height: e.height, size: e.data.length, original: e.original })),
    })
  }))

  router.get('/api/media', wrap(async (_req, res) => {
    const out = []
    for (const name of await fs.readdir(dir)) {
      if (!SERVABLE_RE.test(name)) continue
      const st = await fs.stat(path.join(dir, name))
      if (st.isFile()) out.push({ name, url: `/media/${name}`, size: st.size, mtime: st.mtimeMs })
    }
    out.sort((a, b) => b.mtime - a.mtime)
    res.json({ files: out })
  }))

  router.delete('/api/media/:name', wrap(async (req, res) => {
    const name = req.params.name
    if (!SERVABLE_RE.test(name)) throw new HttpError(400, 'That is not an image name.')
    const users = await store.mediaUsers(name)
    if (users.length && req.query.force !== '1') {
      throw new HttpError(409, `Still used by: ${users.join(', ')}. Remove it from ${users.length === 1 ? 'that document' : 'those documents'} first.`, { usedBy: users })
    }
    try {
      await fs.unlink(path.join(dir, name))
    } catch (e) {
      if (e.code === 'ENOENT') throw new HttpError(404, 'That image does not exist.')
      throw e
    }
    res.json({ ok: true })
  }))

  // Previews inside the editor. Images only; anything else is a 404.
  const serve = express.static(dir, { maxAge: '1h', index: false, dotfiles: 'deny' })
  router.use('/media', (req, res, next) => {
    if (!SERVABLE_RE.test(path.basename(req.path))) return res.status(404).json({ error: 'Not found.' })
    res.set('Content-Security-Policy', "default-src 'none'; sandbox")
    serve(req, res, next)
  })

  return router
}

