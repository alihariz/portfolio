#!/usr/bin/env node
/**
 * Writes index.html with the page already in it.
 *
 * Without this the HTML was an empty <div id="root">: a crawler or link
 * preview that does not run JavaScript saw no text, no headings and no links,
 * and on a phone nothing appeared until React had downloaded and run.
 *
 * It takes the index.html Vite built (the template, with three markers in it),
 * a site document, and the server bundle from `vite build --ssr`, and fills in:
 *
 *   <!--head:start-->…<!--head:end-->  title, description, canonical, Open Graph,
 *                                      Twitter and schema.org, from the document
 *   <!--app-->                         the page, rendered by the real components
 *   <!--site-data-->                   the document itself, which the browser
 *                                      hydrates from, so both render the same thing
 *
 * Two ways to run it:
 *
 *   node scripts/prerender.mjs --build
 *       After `vite build` and `vite build --ssr`: renders dist/index.html and
 *       dist/404.html from the bundled src/data/site.json, and packs
 *       dist-ssr/ (template, server bundle, this script) so the box can
 *       re-render later without the repo.
 *
 *   node prerender.mjs --template T --site S --out O [--renderer R]
 *       What scripts/render-live.sh runs on the box, inside a throwaway
 *       container, whenever the editor saves: the same page, from the live
 *       content. Refuses a document the validator rejects and leaves the old
 *       page in place.
 *
 * Plain Node, no dependencies: everything it needs is in the server bundle.
 */
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))

export class PrerenderError extends Error {}
/** The document itself was refused: not JSON, not a site, or invalid. Exit code 3. */
export class ContentRefused extends PrerenderError {}

function fail(message) {
  throw new PrerenderError(message)
}
function refuse(message) {
  throw new ContentRefused(message)
}

function args(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) fail(`unexpected argument "${a}"`)
    const key = a.slice(2)
    if (key === 'build') out.build = true
    else out[key] = argv[++i] ?? fail(`${a} needs a value`)
  }
  return out
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Write next to the target, then rename: a reader sees the old file or the new one, never half. */
function writeAtomic(file, text) {
  const tmp = `${file}.${process.pid}.tmp`
  writeFileSync(tmp, text)
  renameSync(tmp, file)
}

function once(html, marker, file) {
  const n = html.split(marker).length - 1
  if (n !== 1) fail(`${file} should contain ${marker} exactly once (found ${n}). Was it already prerendered?`)
}

/** sha256-… of each inline executable script, for the Content-Security-Policy. */
export function inlineScriptHashes(html) {
  const out = []
  for (const m of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    const attrs = m[1] || ''
    if (/\bsrc=/.test(attrs) || /type="application\/(ld\+)?json"/.test(attrs)) continue
    out.push(`sha256-${createHash('sha256').update(m[2], 'utf8').digest('base64')}`)
  }
  return out
}

export async function prerender({ renderer, template, site, out, notFound }) {
  const r = await import(pathToFileURL(path.resolve(renderer)).href)
  const tpl = readFileSync(template, 'utf8')
  for (const marker of ['<!--head:start-->', '<!--head:end-->', '<!--app-->', '<!--site-data-->']) once(tpl, marker, template)

  const bytes = readFileSync(site)
  let doc
  try {
    doc = JSON.parse(bytes.toString('utf8'))
  } catch (e) {
    refuse(`${site} is not JSON: ${e.message}`)
  }
  if (!r.isUsable(doc)) refuse(`${site} is not a site document the page can use (schemaVersion, sections, profile)`)
  const { errors, warnings } = r.validate(doc)
  if (errors.length) refuse(`${site} failed validation, page left as it was:\n  ${errors.join('\n  ')}`)
  for (const w of warnings) console.warn(`prerender: warning: ${w}`)

  const year = new Date().getFullYear()
  const hash = sha256(bytes)
  const body = r.renderApp(doc, year)
  if (!body.includes('<h1') || body.length < 2000) fail('the rendered page looks empty; not writing it')

  // Function replacers throughout: content may contain "$&" and friends.
  const html = tpl
    .replace(/<!--head:start-->[\s\S]*?<!--head:end-->/, () => `<!--head:start-->\n    ${r.headTags(doc)}\n    <!--head:end-->`)
    .replace('<!--app-->', () => body)
    .replace(
      '<!--site-data-->',
      () => `<script type="application/json" id="site-data" data-year="${year}" data-content-hash="${hash}">${r.scriptJson(doc)}</script>`,
    )
  writeAtomic(out, html)

  if (notFound) {
    const page = tpl
      .replace(
        /<!--head:start-->[\s\S]*?<!--head:end-->/,
        () => `<title>Not found — ${escapeHtml(doc.meta.title)}</title>\n    <meta name="robots" content="noindex" />`,
      )
      // No JavaScript on the 404 page: nothing to hydrate, nothing to fetch.
      .replace(/\s*<script type="module"[^>]*><\/script>/g, '')
      .replace(/\s*<link rel="modulepreload"[^>]*>/g, '')
      .replace('<!--app-->', () => r.renderNotFound(doc))
      .replace('<!--site-data-->', '')
    writeAtomic(notFound, page)
  }

  return { hash, year, bytes: Buffer.byteLength(html), scriptHashes: inlineScriptHashes(tpl) }
}

async function main() {
  const a = args(process.argv.slice(2))

  if (a.build) {
    // In the repo, after both Vite builds.
    const root = path.resolve(HERE, '..')
    const dist = path.join(root, 'dist')
    const ssr = path.join(root, 'dist-ssr')
    const template = path.join(ssr, 'template.html')
    mkdirSync(ssr, { recursive: true })
    // Normally straight after `vite build`; on a re-run, dist/index.html is
    // already rendered and the template from the first run is used again.
    const built = readFileSync(path.join(dist, 'index.html'), 'utf8')
    if (!(built.includes('id="site-data"') && existsSync(template))) copyFileSync(path.join(dist, 'index.html'), template)
    copyFileSync(fileURLToPath(import.meta.url), path.join(ssr, 'prerender.mjs'))
    // entry-server.js is an ES module; say so, or Node guesses (and warns).
    writeFileSync(path.join(ssr, 'package.json'), '{ "type": "module" }\n')
    const res = await prerender({
      renderer: path.join(ssr, 'entry-server.js'),
      template,
      site: path.join(root, 'src/data/site.json'),
      out: path.join(dist, 'index.html'),
      notFound: path.join(dist, '404.html'),
    })
    console.log(`prerendered dist/index.html (${(res.bytes / 1024).toFixed(1)} KB) and dist/404.html from src/data/site.json`)
    console.log(`inline script hash for the CSP: ${res.scriptHashes.join(' ')}`)
    return
  }

  for (const k of ['template', 'site', 'out']) if (!a[k]) fail(`--${k} is required (or use --build)`)
  const res = await prerender({
    renderer: a.renderer || path.join(HERE, 'entry-server.js'),
    template: a.template,
    site: a.site,
    out: a.out,
    notFound: a['not-found'],
  })
  console.log(`prerendered ${a.out} from ${a.site} (content ${res.hash.slice(0, 12)})`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main()
  } catch (e) {
    console.error(`prerender: ${e instanceof PrerenderError ? e.message : e.stack}`)
    // 3 tells render-live.sh the content was refused, so it waits for a new
    // save instead of retrying the same document; anything else is retried.
    process.exit(e instanceof ContentRefused ? 3 : 1)
  }
}
