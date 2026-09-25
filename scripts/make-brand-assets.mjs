#!/usr/bin/env node
/**
 * The link-preview image and the icons in public/, drawn with the site's own
 * fonts and palette. Run by hand when the name or headline changes; the output
 * is committed, so neither CI nor the box needs a browser.
 *
 *     npm i --no-save playwright-core
 *     CHROME=/path/to/chrome node scripts/make-brand-assets.mjs
 *
 * Writes: og.png (1200×630, what LinkedIn, WhatsApp and others show for a
 * shared link), favicon.ico (16/32/48), apple-touch-icon.png (180),
 * icon-192.png, icon-512.png and icon-maskable-512.png (for the manifest).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = path.join(ROOT, 'public')
const site = JSON.parse(readFileSync(path.join(ROOT, 'src/data/site.json'), 'utf8'))

let chromium
try {
  ;({ chromium } = await import('playwright-core'))
} catch {
  console.error('Needs playwright-core: npm i --no-save playwright-core')
  process.exit(1)
}

// Inlined: a page opened with setContent may not load file:// fonts.
const font = (pkg, file) =>
  `data:font/woff2;base64,${readFileSync(path.join(ROOT, 'node_modules/@fontsource', pkg, 'files', file)).toString('base64')}`
const FONTS = `
  @font-face { font-family: Caprasimo; font-weight: 400; src: url(${font('caprasimo', 'caprasimo-latin-400-normal.woff2')}) format('woff2'); }
  @font-face { font-family: Figtree; font-weight: 400; src: url(${font('figtree', 'figtree-latin-400-normal.woff2')}) format('woff2'); }
  @font-face { font-family: Figtree; font-weight: 600; src: url(${font('figtree', 'figtree-latin-600-normal.woff2')}) format('woff2'); }
  * { margin: 0; box-sizing: border-box; }
  body { -webkit-font-smoothing: antialiased; }
`
// Organic tokens, from src/styles/index.css.
const C = { ground: '#f5ead8', ink: '#201e1d', muted: '#645c50', accentText: '#8c491a', accent: '#c67139', sage200: '#e1eecc', sage800: '#3d472b' }

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const initials = site.profile.name.split(/\s+/).filter((w) => !/^bin$|^binti$/i.test(w)).slice(0, 2).map((w) => w[0]).join('')
// "Ali Hariz" over "Anuari": break before the last word.
const words = site.meta.title.split(' ')
const [first, rest] = words.length > 1 ? [words.slice(0, -1).join(' '), words.at(-1)] : [site.meta.title, '']

const og = `<!doctype html><style>${FONTS}
  body { width: 1200px; height: 630px; background: ${C.ground}; position: relative; overflow: hidden; font-family: Figtree; }
  .text { position: absolute; left: 88px; top: 0; bottom: 0; width: 620px; display: flex; flex-direction: column; justify-content: center; }
  .kicker { font-weight: 600; font-size: 22px; letter-spacing: 0.14em; text-transform: uppercase; color: ${C.accentText}; }
  h1 { font-family: Caprasimo; font-weight: 400; font-size: 96px; line-height: 1.02; letter-spacing: -0.02em; color: ${C.ink}; margin-top: 22px; }
  .lead { font-size: 34px; line-height: 1.35; color: ${C.accentText}; margin-top: 26px; }
  .disc { position: absolute; width: 440px; height: 440px; border-radius: 50%; right: 70px; top: 95px; background: ${C.sage200};
          display: flex; align-items: center; justify-content: center; font-family: Caprasimo; font-size: 190px; color: ${C.sage800}; letter-spacing: -0.02em; }
  .dot { position: absolute; width: 88px; height: 88px; border-radius: 50%; background: ${C.accent}; right: 438px; top: 70px; }
  .rule { position: absolute; left: 88px; right: 88px; bottom: 56px; border-top: 2px solid rgb(32 30 29 / 16%); }
</style>
<div class="disc">${esc(initials)}</div><div class="dot"></div>
<div class="text">
  <div class="kicker">${esc(site.meta.domain)}</div>
  <h1>${esc(first)}<br>${esc(rest)}</h1>
  <div class="lead">${esc(site.profile.headline)}</div>
</div>
<div class="rule"></div>`

const icon = (size, { letters, bleed, safe = 1, bg = C.sage200, fg = C.sage800 }) => `<!doctype html><style>${FONTS}
  body { width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; background: ${bleed ? bg : 'transparent'}; }
  div { width: ${size * safe}px; height: ${size * safe}px; border-radius: ${bleed ? 0 : '50%'}; background: ${bg};
        display: flex; align-items: center; justify-content: center; font-family: Caprasimo; color: ${fg};
        font-size: ${size * safe * (letters.length > 1 ? 0.46 : 0.74)}px; line-height: 1; padding-top: ${size * safe * 0.04}px; letter-spacing: -0.02em; }
</style><div>${esc(letters)}</div>`

const browser = await chromium.launch({ executablePath: process.env.CHROME })
async function shot(html, width, height, out, { transparent = false } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  await page.setContent(html)
  await page.evaluate(() => document.fonts.ready)
  const missing = await page.evaluate(() => [...document.fonts].filter((f) => f.status !== 'loaded').map((f) => f.family))
  if (missing.length && !(await page.evaluate(() => document.fonts.check('16px Caprasimo')))) throw new Error(`fonts did not load: ${missing}`)
  const buf = await page.screenshot({ omitBackground: transparent, type: 'png' })
  await page.close()
  if (out) writeFileSync(out, await sharp(buf).png({ compressionLevel: 9, palette: false }).toBuffer())
  return buf
}

await shot(og, 1200, 630, path.join(PUBLIC, 'og.png'))
await shot(icon(180, { letters: initials, bleed: true }), 180, 180, path.join(PUBLIC, 'apple-touch-icon.png'))
await shot(icon(192, { letters: initials, bleed: false }), 192, 192, path.join(PUBLIC, 'icon-192.png'), { transparent: true })
await shot(icon(512, { letters: initials, bleed: false }), 512, 512, path.join(PUBLIC, 'icon-512.png'), { transparent: true })
// Maskable: launchers crop to their own shape, keeping the middle 80%.
await shot(icon(512, { letters: initials, bleed: true, safe: 0.8 }), 512, 512, path.join(PUBLIC, 'icon-maskable-512.png'))

// favicon.ico: one letter reads at 16 px where two do not, and terracotta
// stands out on light and dark tab strips alike. PNG-in-ICO, which every
// current browser reads.
const big = await shot(icon(256, { letters: initials[0], bleed: false, bg: C.accent, fg: '#f9f4ed' }), 256, 256, null, { transparent: true })
const sizes = [16, 32, 48]
const pngs = await Promise.all(sizes.map((s) => sharp(big).resize(s, s).png().toBuffer()))
const header = Buffer.alloc(6 + 16 * sizes.length)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2) // icon
header.writeUInt16LE(sizes.length, 4)
let offset = header.length
sizes.forEach((s, i) => {
  const e = 6 + 16 * i
  header.writeUInt8(s, e)
  header.writeUInt8(s, e + 1)
  header.writeUInt16LE(1, e + 4) // planes
  header.writeUInt16LE(32, e + 6) // bits per pixel
  header.writeUInt32LE(pngs[i].length, e + 8)
  header.writeUInt32LE(offset, e + 12)
  offset += pngs[i].length
})
writeFileSync(path.join(PUBLIC, 'favicon.ico'), Buffer.concat([header, ...pngs]))

await browser.close()
console.log('wrote og.png, favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png, icon-maskable-512.png')
