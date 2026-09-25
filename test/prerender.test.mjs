/**
 * The prerendered page: what crawlers, link previews and no-JavaScript
 * visitors get, and what React hydrates.
 *
 * Builds the server bundle and the browser bundle from the real sources, runs
 * scripts/prerender.mjs exactly as the build and the box do, then loads the
 * result in jsdom and hydrates it with the real main.tsx. Checks that:
 *
 *   - the HTML carries the whole page and a head written from the document;
 *   - content cannot break out of the embedded JSON or the head;
 *   - React adopts the HTML as it is (no mismatch, no redraw), in light and
 *     dark mode and with reduced motion;
 *   - newer content fetched after load still replaces what was prerendered;
 *   - a document the validator rejects is never rendered, and the old page stays.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { JSDOM, VirtualConsole } from 'jsdom'
import { prerender } from '../scripts/prerender.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = JSON.parse(readFileSync(path.join(ROOT, 'src/data/site.json'), 'utf8'))
const clone = (v) => structuredClone(v)
const macrotask = () => new Promise((r) => setTimeout(r, 0))

let tmp
let renderer
let client
let imports = 0

const COMMON = {
  bundle: true,
  format: 'esm',
  target: 'es2022',
  jsx: 'automatic',
  // Same image manifest on both sides, as in the real build.
  define: { __IMAGES__: '{}', 'process.env.NODE_ENV': '"development"' },
  loader: { '.css': 'empty', '.woff': 'empty', '.woff2': 'empty' },
  logLevel: 'silent',
}

before(async () => {
  // Inside the repo, so the server bundle can import react from node_modules.
  mkdirSync(path.join(ROOT, 'node_modules/.cache'), { recursive: true })
  tmp = mkdtempSync(path.join(ROOT, 'node_modules/.cache/prerender-test-'))
  renderer = path.join(tmp, 'entry-server.mjs')
  client = path.join(tmp, 'client.mjs')
  await build({ ...COMMON, entryPoints: [path.join(ROOT, 'src/entry-server.tsx')], platform: 'node', packages: 'external', outfile: renderer })
  // Development React, which reports hydration mismatches in detail.
  await build({ ...COMMON, entryPoints: [path.join(ROOT, 'src/main.tsx')], platform: 'browser', outfile: client })
})

after(() => tmp && rmSync(tmp, { recursive: true, force: true }))

/** Prerender `doc` through the real script; returns the HTML. */
async function page(doc, name = 'index') {
  const site = path.join(tmp, `${name}.json`)
  const out = path.join(tmp, `${name}.html`)
  writeFileSync(site, JSON.stringify(doc, null, 2))
  const logged = []
  const original = console.error
  console.error = (...a) => logged.push(a.map(String).join(' '))
  try {
    await prerender({ renderer, template: path.join(ROOT, 'index.html'), site, out, notFound: path.join(tmp, `${name}-404.html`) })
  } finally {
    console.error = original
  }
  assert.deepEqual(logged, [], 'React logged nothing while rendering on the server')
  return readFileSync(out, 'utf8')
}

/** Load prerendered HTML without running its scripts. */
function load(html) {
  return new JSDOM(html, { url: 'https://aliharizanuari.org/' })
}

/**
 * Hydrate prerendered HTML with the real browser bundle, the way a visitor's
 * browser would: the inline theme script has run, then main.tsx.
 */
async function hydrate(html, { theme, reducedMotion = false, fetched } = {}) {
  const logs = []
  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', (e) => logs.push(`jsdomError: ${e}`))
  const dom = new JSDOM(html, { url: 'https://aliharizanuari.org/', pretendToBeVisual: true, virtualConsole })
  const w = dom.window
  if (theme) w.localStorage.setItem('theme', theme)
  w.document.documentElement.classList.add(theme === 'dark' ? 'dark' : 'light') // what the inline script does
  w.matchMedia = (q) => ({ matches: reducedMotion && q.includes('reduce'), addEventListener() {}, removeEventListener() {} })
  w.scrollTo = () => {}
  for (const k of ['window', 'document', 'localStorage', 'requestAnimationFrame', 'cancelAnimationFrame', 'HTMLElement', 'Node', 'getComputedStyle', 'CustomEvent']) {
    Object.defineProperty(globalThis, k, { value: k === 'window' ? w : w[k], configurable: true, writable: true })
  }
  Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true })
  const doc = fetched ?? JSON.parse(w.document.getElementById('site-data').textContent)
  globalThis.fetch = async () => ({ ok: true, json: async () => clone(doc) })

  const before = { h1: w.document.querySelector('h1'), main: w.document.querySelector('main') }
  const original = { error: console.error, warn: console.warn }
  console.error = (...a) => logs.push(a.map(String).join(' '))
  console.warn = (...a) => logs.push(a.map(String).join(' '))
  try {
    await import(`${pathToFileURL(client).href}?run=${++imports}`)
    // Hydration, the fetch, and the transition that swaps newer content in.
    for (let i = 0; i < 8; i++) await macrotask()
    await new Promise((r) => setTimeout(r, 50))
    for (let i = 0; i < 4; i++) await macrotask()
  } finally {
    Object.assign(console, original)
  }
  return { dom, w, logs, before }
}

const MISMATCH = /did not match|hydrat|server html|server rendered html|text content does not match/i

/* ── The HTML ──────────────────────────────────────────────────────────── */

test('the HTML carries the whole page, readable without JavaScript', async () => {
  const html = await page(BASE)
  const { document } = load(html).window
  const root = document.getElementById('root')
  const text = root.textContent

  assert.equal(document.querySelectorAll('h1').length, 1)
  assert.ok(text.includes(BASE.profile.name))
  assert.ok(text.includes(BASE.profile.intro.slice(0, 60)))
  const headings = [...root.querySelectorAll('h2')].map((h) => h.textContent)
  for (const s of BASE.sections.filter((s) => s.visible && s.title && s.type !== 'proof')) {
    assert.ok(headings.includes(s.title), `section "${s.id}" is in the HTML`)
  }
  for (const s of BASE.sections.filter((s) => !s.visible && s.title)) {
    assert.ok(!headings.includes(s.title), `hidden section "${s.id}" is not`)
  }
  assert.ok(root.querySelectorAll('a[href]').length > 10, 'links are real links')
  // No section waits for a script to become visible.
  for (const h of root.querySelectorAll('h1, h2')) {
    for (let el = h; el && el !== root; el = el.parentElement) {
      assert.ok(!el.classList.contains('opacity-0') && !el.hidden, `"${h.textContent}" is visible without JavaScript`)
    }
  }
})

test('the head is written from the document, including the parts the editor could never reach before', async () => {
  const doc = clone(BASE)
  doc.meta.description = 'A description set in the editor.'
  doc.meta.title = 'Someone Else'
  const { document } = load(await page(doc)).window
  const meta = (sel) => document.querySelector(sel)?.getAttribute('content')

  assert.equal(document.title, `Someone Else — ${doc.profile.role}`)
  assert.equal(meta('meta[name="description"]'), 'A description set in the editor.')
  assert.equal(meta('meta[property="og:description"]'), 'A description set in the editor.')
  assert.equal(document.querySelectorAll('meta[name="description"]').length, 1, 'exactly one description')
  assert.equal(document.querySelector('link[rel="canonical"]').href, 'https://aliharizanuari.org/')
  assert.equal(meta('meta[property="og:image"]'), 'https://aliharizanuari.org/og.png')
  assert.ok(meta('meta[property="og:image:alt"]'))
  assert.equal(meta('meta[name="twitter:card"]'), 'summary_large_image')
  assert.ok(!document.head.innerHTML.includes('graduating'), 'nothing time-bound typed into the template')

  const ld = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)
  const person = ld['@graph'].find((n) => n['@type'] === 'Person')
  assert.equal(person.name, doc.profile.name)
  assert.deepEqual(person.sameAs, [doc.profile.links.github, doc.profile.links.linkedin])
  assert.ok(person.alumniOf.length > 0)
})

test('content cannot break out of the embedded JSON or the head', async () => {
  const doc = clone(BASE)
  const evil = '</script><script>window.pwned=1</script><!--'
  doc.profile.headline = evil
  doc.meta.description = `"><script>window.pwned=2</script>`
  doc.profile.intro = 'Costs $& and $1 and $$, literally.'
  const html = await page(doc)
  const { document } = load(html).window

  const scripts = [...document.querySelectorAll('script')].map((s) => s.type || 'classic')
  assert.deepEqual(scripts.sort(), ['application/json', 'application/ld+json', 'classic', 'module'].sort(), 'no script element was injected')
  assert.deepEqual(JSON.parse(document.getElementById('site-data').textContent), doc, 'the embedded document round-trips exactly')
  assert.equal(document.querySelector('meta[name="description"]').getAttribute('content'), doc.meta.description)
  assert.ok(document.getElementById('root').textContent.includes(evil), 'shown as text')
  assert.ok(document.getElementById('root').textContent.includes('Costs $& and $1 and $$, literally.'))
})

test('the 404 page is plain HTML with no script and is not indexed', async () => {
  await page(BASE, 'nf')
  const { document } = load(readFileSync(path.join(tmp, 'nf-404.html'), 'utf8')).window
  assert.equal(document.querySelectorAll('script[src], script[type="module"], link[rel="modulepreload"]').length, 0)
  assert.equal(document.querySelector('meta[name="robots"]').getAttribute('content'), 'noindex')
  assert.ok(document.body.textContent.includes('Not found'))
  assert.ok(document.querySelector('a[href="/"]'))
})

test('a document the validator rejects is never rendered, and the page already there stays', async () => {
  const out = path.join(tmp, 'kept.html')
  writeFileSync(out, 'the previous page')
  const bad = clone(BASE)
  bad.sections.find((s) => s.type === 'education').items[0].degree = 5
  const site = path.join(tmp, 'bad.json')
  writeFileSync(site, JSON.stringify(bad))
  await assert.rejects(
    prerender({ renderer, template: path.join(ROOT, 'index.html'), site, out }),
    /failed validation[\s\S]*degree/,
  )
  assert.equal(readFileSync(out, 'utf8'), 'the previous page')
  assert.ok(!existsSync(`${out}.${process.pid}.tmp`), 'no temp file left behind')
})

test('Cloudflare is asked not to rewrite the email links inside the page', async () => {
  const html = await page(BASE)
  const root = html.match(/<!--email_off--><div id="root">([\s\S]*?)<\/div><!--\/email_off-->\s*<script type="application\/json" id="site-data"/)
  assert.ok(root, '#root sits between <!--email_off--> and <!--/email_off-->')
  assert.ok(root[1].includes('mailto:'), 'and it does contain mailto: links, which is why')
})

test('a section the server cannot draw is left out of the HTML, and the rest still renders and hydrates', async () => {
  const r = await import(pathToFileURL(renderer).href)
  const bad = clone(BASE)
  bad.sections.find((s) => s.type === 'education').items[0].degree = 5 // the validator would refuse this
  const logged = []
  const original = console.error
  console.error = (...a) => logged.push(a.map(String).join(' '))
  let body
  try {
    body = r.renderApp(bad, 2026) // must not throw: that would stop the box re-rendering at all
  } finally {
    console.error = original
  }
  const template = readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  const html = template
    .replace('<!--app-->', () => body)
    .replace('<!--site-data-->', () => `<script type="application/json" id="site-data">${r.scriptJson(bad)}</script>`)
  const education = bad.sections.find((s) => s.type === 'education')
  const projects = bad.sections.find((s) => s.type === 'projects')
  assert.ok(!load(html).window.document.getElementById('root').textContent.includes(education.title))
  assert.ok(load(html).window.document.getElementById('root').textContent.includes(projects.title))

  const { w, before } = await hydrate(html, { fetched: bad })
  assert.equal(w.document.querySelector('h1'), before.h1, 'the rest of the page was adopted, not redrawn')
  assert.ok(w.document.getElementById('root').textContent.includes(projects.title))
  assert.ok(!w.document.getElementById('root').textContent.includes(education.title))
})

test('a newer document that cannot be drawn steps back to the prerendered one, not to the bundled copy', async () => {
  const embedded = clone(BASE)
  embedded.profile.headline = 'The headline the HTML was rendered with'
  const html = await page(embedded)
  const broken = clone(embedded)
  broken.profile.name = 5
  broken.profile.headline = 'A headline only the broken document has'
  const { w } = await hydrate(html, { fetched: broken })
  const text = w.document.getElementById('root').textContent
  assert.ok(text.includes('The headline the HTML was rendered with'))
  assert.ok(!text.includes('A headline only the broken document has'))
})

/* ── Hydration ─────────────────────────────────────────────────────────── */

for (const [label, opts] of [
  ['light mode', {}],
  ['dark mode, chosen earlier', { theme: 'dark' }],
  ['reduced motion', { reducedMotion: true }],
]) {
  test(`React adopts the prerendered HTML without redrawing it (${label})`, async () => {
    const html = await page(BASE)
    const { w, logs, before } = await hydrate(html, opts)
    assert.deepEqual(logs.filter((l) => MISMATCH.test(l)), [], 'no hydration mismatch')
    assert.equal(w.document.querySelector('h1'), before.h1, 'the same <h1> node: hydrated, not replaced')
    assert.equal(w.document.querySelector('main'), before.main)
    assert.ok(before.h1.isConnected)
    const toggle = w.document.querySelector('button[aria-label^="Switch to"]')
    assert.equal(toggle.getAttribute('aria-label'), `Switch to ${opts.theme === 'dark' ? 'light' : 'dark'} theme`, 'the toggle matches the theme on screen')
    assert.equal(w.document.title, `${BASE.meta.title} — ${BASE.profile.role}`)
  })
}

test('content saved after the page was rendered still replaces it once loaded', async () => {
  const html = await page(BASE)
  const newer = clone(BASE)
  newer.profile.headline = 'Saved in the editor a minute ago'
  const { w, logs } = await hydrate(html, { fetched: newer })
  assert.deepEqual(logs.filter((l) => MISMATCH.test(l)), [])
  assert.ok(w.document.getElementById('root').textContent.includes('Saved in the editor a minute ago'))
})
