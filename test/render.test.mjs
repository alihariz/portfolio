/**
 * Proves the content validator is strong enough: any document it accepts
 * renders the whole site without crashing.
 *
 * Why this exists: the CMS can save a document that React cannot draw — an
 * item missing a field a component calls .replace() or .map() on. The site's
 * error boundaries now contain the damage (a bad section is left out; a bad
 * header falls back to the bundled copy), but a visitor still loses content,
 * so cms/lib/validate-site.mjs is meant to reject those documents outright.
 * This test checks that claim instead of trusting it. The boundaries report
 * every failure they hide as a `site:render-error` event, and the harness
 * counts those as crashes, so the boundaries cannot make a bad document pass:
 *
 *   1. Take the real src/data/site.json.
 *   2. Mutate it hundreds of ways — delete a field, make it null, a number, an
 *      object, a list, a javascript: link — across the profile, every section,
 *      the first items of each list and their nested lists.
 *   3. For each mutant the validator ACCEPTS, render the real App.tsx in jsdom,
 *      through the real runtime path (the page fetches /content/site.json and
 *      swaps it in), including the project drawer via ?project=<id>.
 *   4. Fail if any accepted mutant crashes.
 *
 * A control case renders a known-crashing document with the validator
 * bypassed, to prove the harness notices crashes at all.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { JSDOM, VirtualConsole } from 'jsdom'
import { validateSite, formatIssues, itemTemplate } from '../cms/lib/validate-site.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = JSON.parse(readFileSync(path.join(ROOT, 'src/data/site.json'), 'utf8'))
const clone = (v) => structuredClone(v)

let dom
let harness
let outDir
let currentDoc = null
const stray = []

before(async () => {
  // Errors thrown outside React (a requestAnimationFrame callback in CountUp,
  // say) surface here rather than in the error boundary.
  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', (e) => stray.push(e))
  dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'https://aliharizanuari.org/',
    pretendToBeVisual: true, // requestAnimationFrame, which CountUp uses
    virtualConsole,
  })
  process.on('unhandledRejection', (e) => stray.push(e))
  const w = dom.window
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
  w.scrollTo = () => {}
  // Sections start off screen in jsdom (every rect is zero), then "scroll in"
  // on the next tick, so the fade and the count-up run for every document.
  w.IntersectionObserver = class {
    constructor(cb) { this.cb = cb }
    observe(el) { setTimeout(() => this.cb([{ isIntersecting: true, target: el }]), 0) }
    disconnect() {}
    unobserve() {}
  }
  // Two frames per count-up, half way then past the end, so both branches of
  // the animation run inside the few ticks each render waits.
  let frame = 0
  w.requestAnimationFrame = (cb) => setTimeout(() => cb(w.performance.now() + (++frame % 2 ? 450 : 5000)), 0)
  w.cancelAnimationFrame = (id) => clearTimeout(id)
  for (const k of ['window', 'document', 'localStorage', 'requestAnimationFrame', 'cancelAnimationFrame', 'HTMLElement', 'Node', 'getComputedStyle', 'IntersectionObserver', 'CustomEvent']) {
    Object.defineProperty(globalThis, k, { value: k === 'window' ? w : w[k], configurable: true, writable: true })
  }
  Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true })

  // The page fetches /content/site.json after first paint and swaps it in.
  // Serve it whatever document the current case is testing.
  globalThis.fetch = async () => ({ ok: true, json: async () => clone(currentDoc) })

  outDir = mkdtempSync(path.join(tmpdir(), 'render-test-'))
  const outfile = path.join(outDir, 'harness.mjs')
  await build({
    stdin: {
      resolveDir: ROOT,
      sourcefile: 'render-harness.tsx',
      loader: 'tsx',
      contents: `
        import { Component } from 'react'
        import { flushSync } from 'react-dom'
        import { createRoot } from 'react-dom/client'
        import App from './src/App'

        class Catch extends Component {
          state = { failed: false }
          static getDerivedStateFromError() { return { failed: true } }
          componentDidCatch(error) { this.props.onError(error) }
          render() { return this.state.failed ? null : this.props.children }
        }

        const macrotask = () => new Promise((r) => setTimeout(r, 0))

        export async function renderSite(marker) {
          const errors = []
          const where = []
          // What the site's own error boundaries caught and hid.
          const onBoundary = (e) => { errors.push(e.detail.error); where.push(e.detail.where) }
          window.addEventListener('site:render-error', onBoundary)
          const host = document.createElement('div')
          document.body.append(host)
          const root = createRoot(host)
          try {
            flushSync(() => root.render(<Catch onError={(e) => { errors.push(e); where.push('uncaught') }}><App /></Catch>))
            // Let the fetch resolve, the fetched document swap in, and its
            // effects (the scroll-in, CountUp, the ?project= deep link) run.
            // The swap is a transition, which React spreads over as many turns
            // of the event loop as the machine needs, so wait for the page to
            // show the document (or fail) rather than for a fixed count.
            const deadline = Date.now() + 5000
            while (!errors.length && !host.textContent.includes(marker) && Date.now() < deadline) await macrotask()
            for (let i = 0; i < 8; i++) await macrotask()
          } catch (e) {
            errors.push(e)
            where.push('uncaught')
          }
          const text = host.textContent || ''
          const drawerOpen = !!host.querySelector('[role="dialog"]')
          flushSync(() => root.unmount())
          host.remove()
          window.removeEventListener('site:render-error', onBoundary)
          return { errors, where, text, drawerOpen }
        }
      `,
    },
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    jsx: 'automatic',
    outfile,
    loader: { '.png': 'dataurl', '.jpg': 'dataurl', '.svg': 'dataurl', '.css': 'empty' },
    define: { 'process.env.NODE_ENV': '"development"' },
    logLevel: 'silent',
  })
  harness = await import(pathToFileURL(outfile).href)
})

after(() => {
  if (outDir) rmSync(outDir, { recursive: true, force: true })
  dom?.window.close()
})

const SENTINEL = 'render-test-sentinel'

/**
 * Render the site as a visitor would see it after the page fetched `doc`.
 * A hidden-by-nothing prose section carrying a unique string is appended, so
 * the test can tell the fetched document really replaced the bundled one —
 * otherwise a mutant that silently fell back would pass without being drawn.
 */
async function render(doc, query = '') {
  const marker = `${SENTINEL}-${Math.random().toString(36).slice(2)}`
  currentDoc = doc && Array.isArray(doc.sections)
    ? { ...doc, sections: [...doc.sections, { id: 'zz-sentinel', type: 'prose', title: '', navLabel: 'Z', visible: true, body: marker }] }
    : doc
  dom.reconfigure({ url: `https://aliharizanuari.org/${query}` })
  stray.length = 0
  // React logs expected noise (duplicate keys and the like) through console.error.
  const original = console.error
  console.error = () => {}
  try {
    const r = await harness.renderSite(marker)
    return { ...r, errors: [...r.errors, ...stray], swapped: r.text.includes(marker) }
  } finally {
    console.error = original
  }
}

/* ── Mutations ───────────────────────────────────────────────────────────── */

const VALUES = [
  ['deleted', undefined],
  ['null', null],
  ['0', 0],
  ['42', 42],
  ['true', true],
  ['""', ''],
  ['"x"', 'x'],
  ['{}', {}],
  ['[]', []],
  ['["x"]', ['x']],
  ['[{}]', [{}]],
  ['[null]', [null]],
  ['javascript:', 'javascript:alert(1)'],
]

/** Set (or delete) the value at a path like ['sections', 2, 'items', 0, 'title']. */
function setAt(doc, p, value) {
  const out = clone(doc)
  let node = out
  for (const k of p.slice(0, -1)) {
    if (node == null || typeof node !== 'object') return null
    node = node[k]
  }
  if (node == null || typeof node !== 'object') return null
  const last = p[p.length - 1]
  if (value === undefined) {
    if (Array.isArray(node)) node.splice(last, 1)
    else delete node[last]
  } else node[last] = clone(value)
  return out
}

function* keysOf(obj) {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) yield* Object.keys(obj)
}

/** Every path worth mutating, derived from the real document's shape. */
function mutationTargets(doc) {
  const targets = []
  const add = (p) => targets.push(p)

  for (const k of keysOf(doc.profile)) add(['profile', k])
  for (const k of keysOf(doc.profile.links)) add(['profile', 'links', k])
  add(['schemaVersion'])

  doc.sections.forEach((s, i) => {
    for (const k of keysOf(s)) add(['sections', i, k])
    if (!Array.isArray(s.items)) return
    const firstTwo = s.items.slice(0, s.type === 'projects' ? 2 : 1)
    firstTwo.forEach((item, j) => {
      add(['sections', i, 'items', j])
      for (const k of keysOf(item)) {
        add(['sections', i, 'items', j, k])
        const v = item[k]
        if (Array.isArray(v) && v.length) {
          add(['sections', i, 'items', j, k, 0])
          if (v[0] && typeof v[0] === 'object') for (const kk of keysOf(v[0])) add(['sections', i, 'items', j, k, 0, kk])
        }
        if (v && typeof v === 'object' && !Array.isArray(v)) for (const kk of keysOf(v)) add(['sections', i, 'items', j, k, kk])
      }
    })
    if (Array.isArray(s.categoryOrder) && s.categoryOrder.length) add(['sections', i, 'categoryOrder', 0])
  })
  return targets
}

function drawerQuery(doc, p) {
  // When a project is mutated, open it in the drawer too — deep links can.
  const s = doc.sections?.[p[1]]
  if (p[0] !== 'sections' || s?.type !== 'projects' || p[2] !== 'items' || typeof p[3] !== 'number') return ''
  const id = s.items?.[p[3]]?.id
  return typeof id === 'string' && id ? `?project=${encodeURIComponent(id)}` : ''
}

/* ── Tests ───────────────────────────────────────────────────────────────── */

test('the real document validates and renders', async () => {
  const v = validateSite(BASE)
  assert.deepEqual(formatIssues(v.errors), [])
  const r = await render(BASE)
  assert.deepEqual(r.errors.map(String), [])
  assert.ok(r.text.includes(BASE.profile.name), 'page shows the profile name')
  assert.ok(r.swapped, 'the fetched document replaced the bundled one')
})

test('control: the harness notices a crash when the validator is bypassed', async () => {
  const bad = clone(BASE)
  bad.sections.find((s) => s.type === 'education').items[0].degree = 5 // e.degree.replace → TypeError
  assert.ok(validateSite(bad).errors.length > 0, 'validator rejects it')
  const r = await render(bad)
  assert.ok(r.errors.length > 0, 'rendering it crashes, and the harness saw the crash')
})

test('a section that cannot be drawn is left out, and the rest of the page still renders', async () => {
  const bad = clone(BASE)
  bad.sections.find((s) => s.type === 'education').items[0].degree = 5
  const r = await render(bad)
  assert.deepEqual(r.where, ['section "education"'])
  assert.ok(r.swapped, 'the rest of the fetched document is on the page')
  assert.ok(r.text.includes(BASE.profile.name))
  for (const s of BASE.sections.filter((s) => s.visible && s.type !== 'education' && s.title)) {
    assert.ok(r.text.includes(s.title), `section "${s.id}" still renders`)
  }
  const education = BASE.sections.find((s) => s.type === 'education')
  assert.ok(!r.text.includes(education.title), 'the broken section is left out rather than half drawn')
})

test('a document whose header cannot be drawn falls back to the bundled copy, not a blank page', async () => {
  const bad = clone(BASE)
  bad.profile.name = 5 // the hero splits the name into initials
  bad.profile.headline = 'A headline only the broken document has'
  const r = await render(bad)
  assert.ok(r.where.includes('page'), `the page boundary caught it (${r.where.join(', ')})`)
  assert.ok(!r.where.includes('uncaught'), 'nothing escaped to the outside')
  assert.ok(!r.swapped && !r.text.includes(bad.profile.headline), 'the broken document is not shown')
  assert.ok(r.text.includes(BASE.profile.headline), 'the bundled copy is')
})

test('control: a project opens in the drawer through ?project=', async () => {
  const p = BASE.sections.find((s) => s.type === 'projects').items[0]
  const r = await render(BASE, `?project=${p.id}`)
  assert.deepEqual(r.errors.map(String), [])
  assert.ok(r.drawerOpen, 'drawer rendered, so drawer-only fields are exercised')
})

test('every mutant the validator accepts renders without crashing', async () => {
  const crashes = []
  const notDrawn = []
  let accepted = 0
  let rejected = 0
  for (const target of mutationTargets(BASE)) {
    for (const [label, value] of VALUES) {
      const mutant = setAt(BASE, target, value)
      if (!mutant) continue
      if (validateSite(mutant).errors.length) { rejected++; continue }
      accepted++
      const r = await render(mutant, drawerQuery(BASE, target))
      if (r.errors.length) crashes.push(`${target.join('.')} = ${label}: ${String(r.errors[0]).split('\n')[0]}`)
      else if (!r.swapped) notDrawn.push(`${target.join('.')} = ${label}`)
    }
  }
  console.log(`  ${accepted} accepted mutants rendered, ${rejected} rejected by the validator`)
  assert.ok(accepted > 200, `expected a meaningful number of accepted mutants, got ${accepted}`)
  assert.deepEqual(crashes, [], `the validator accepted documents that crash the site:\n${crashes.join('\n')}`)
  assert.deepEqual(notDrawn, [], `accepted documents the page silently refused to show:\n${notDrawn.join('\n')}`)
})

test('an item added from the editor template, once its required fields are filled, renders', async () => {
  const doc = clone(BASE)
  for (const s of doc.sections) {
    if (!Array.isArray(s.items)) continue
    const blank = itemTemplate(s.type)
    // Fill exactly what the validator insists on, and nothing else.
    for (const issue of validateSite({ ...doc, sections: [{ ...s, items: [blank] }] }).errors) {
      const key = issue.path.split('.').pop()
      if (typeof blank[key] === 'string') blank[key] = `new ${key}`
    }
    for (const [key, kind] of Object.entries(blank)) {
      if (Array.isArray(kind) && key === 'skills') blank.skills.push({ ...itemTemplate('skills', ['items', 'skills']), name: 'Go' })
    }
    s.items.push(blank)
  }
  const v = validateSite(doc)
  assert.deepEqual(formatIssues(v.errors), [])
  const p = doc.sections.find((s) => s.type === 'projects').items.at(-1)
  const r = await render(doc, `?project=${p.id}`)
  assert.deepEqual(r.errors.map(String), [])
})

test('an item added from the blank template is rejected until filled in', () => {
  for (const type of ['projects', 'experience', 'education', 'certificates', 'skills', 'leadership']) {
    const doc = clone(BASE)
    doc.sections.find((s) => s.type === type).items.push(itemTemplate(type))
    assert.ok(validateSite(doc).errors.length > 0, `${type}: an empty new item is not saved as-is`)
  }
})
