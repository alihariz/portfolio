#!/usr/bin/env node
/**
 * Smaller copies of the bundled pictures, generated before each build.
 *
 * The ten images in public/assets/images are 1.3 MB of PNG and JPEG, but none
 * is drawn wider than ~560 CSS px. For every image there this writes AVIF and
 * WebP at 400, 800 and 1200 px wide (never wider than the original) to
 * public/assets/img/<same path>.<width>.<format>, and a manifest of what it
 * made. vite.config.ts hands the manifest to src/lib/images.ts, and <Picture>
 * offers the copies through srcset, so each visitor downloads one file sized
 * for their screen.
 *
 * The originals stay where they are: the editor's content points at them, and
 * they remain the <img> fallback. public/assets/img/ is generated, so it is
 * not in git. Each manifest entry records a hash of the original and of the
 * encoder settings; while both match and the files are there, they are reused,
 * so re-runs (and CI with a restored cache) are quick.
 *
 *     node scripts/build-images.mjs          # what `npm run build` runs
 *     node scripts/build-images.mjs --force  # regenerate everything
 */
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { availableParallelism } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'public/assets/images')
const OUT = path.join(ROOT, 'public/assets/img')
const WIDTHS = [400, 800, 1200]
const FORCE = process.argv.includes('--force')
// Paths that are safe to put in a srcset unescaped: no spaces or commas.
const SAFE = /^[A-Za-z0-9._/-]+$/
const IMAGE = /\.(png|jpe?g|webp|avif)$/i

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else if (IMAGE.test(entry.name)) yield full
  }
}

const FORMATS = [
  ['avif', { quality: 55, effort: 4 }],
  ['webp', { quality: 80, effort: 4 }],
]
// Anything that changes the output: settings and the encoder itself.
const RECIPE = JSON.stringify({ WIDTHS, FORMATS, sharp: sharp.versions })

const previous = JSON.parse(await readFile(path.join(OUT, 'manifest.json'), 'utf8').catch(() => '{}'))
const exists = (f) => stat(f).then(() => true, () => false)

const manifest = {}
const jobs = []
let made = 0
let reused = 0
let before = 0
let after = 0

for await (const file of walk(SRC)) {
  const rel = path.relative(SRC, file).split(path.sep).join('/')
  const key = `/assets/images/${rel}`
  const src = await stat(file)
  const bytes = await readFile(file)
  const hash = createHash('sha256').update(bytes).update(RECIPE).digest('hex').slice(0, 16)
  const meta = await sharp(bytes).metadata()
  // Orientation 5–8 means the stored pixels are rotated a quarter turn.
  const [w, h] = (meta.orientation ?? 1) >= 5 ? [meta.height, meta.width] : [meta.width, meta.height]

  if (!SAFE.test(rel)) {
    console.warn(`  skipped ${rel}: rename it without spaces or commas to get smaller copies`)
    manifest[key] = { w, h, widths: [], hash }
    continue
  }

  // Every width below the original, and the original width itself if it is
  // smaller than the largest step, so the biggest screens still get full size.
  const widths = WIDTHS.filter((x) => x < w)
  if (w <= WIDTHS.at(-1) && !widths.includes(w)) widths.push(w)
  if (!widths.length) widths.push(w)

  const base = path.join(OUT, rel.replace(IMAGE, ''))
  await mkdir(path.dirname(base), { recursive: true })
  before += src.size
  const sample = widths.filter((x) => x <= 800).at(-1) ?? widths[0]
  const same = !FORCE && previous[key]?.hash === hash
  for (const width of widths) {
    for (const [format, options] of FORMATS) {
      const out = `${base}.${width}.${format}`
      jobs.push(async () => {
        if (same && (await exists(out))) reused++
        else {
          await sharp(bytes).rotate().resize({ width, withoutEnlargement: true })[format](options).toFile(out)
          made++
        }
        if (format === 'avif' && width === sample) after += (await stat(out)).size
      })
    }
  }
  manifest[key] = { w, h, widths, hash }
}

// AVIF encoding is mostly single-threaded: run several at once.
const workers = Array.from({ length: availableParallelism() }, async () => {
  while (jobs.length) await jobs.shift()()
})
await Promise.all(workers)

await mkdir(OUT, { recursive: true })
await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
const n = Object.keys(manifest).length
console.log(
  `images: ${n} originals, ${made} files written, ${reused} reused` +
    (after ? `; at 800 px AVIF they are ${Math.round(after / 1024)} KB against ${Math.round(before / 1024)} KB of originals` : ''),
)
