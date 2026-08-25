#!/usr/bin/env node
/**
 * Validate a site document against schemaVersion 2.
 *
 * Why this exists: App.tsx's renderSection() ends in `default: return null`,
 * so a section whose `type` is misspelled — by hand, or by the CMS on :8095 —
 * disappears from the page with no error anywhere. Nothing else in the stack
 * catches that. This does.
 *
 * Zero dependencies on purpose, so portfolio-cms can call it on save without
 * pulling in a schema library.
 *
 *   node scripts/validate-site-json.mjs src/data/site.json
 *   node scripts/validate-site-json.mjs /content/site.json --quiet
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '..')

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const quiet = process.argv.includes('--quiet')
const target = resolve(process.cwd(), args[0] ?? 'src/data/site.json')

const errors = []
const warnings = []
const err = (path, msg) => errors.push(`${path}: ${msg}`)
const warn = (path, msg) => warnings.push(`${path}: ${msg}`)

const isStr = (v) => typeof v === 'string'
const nonEmpty = (v) => isStr(v) && v.trim().length > 0
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/**
 * The list of types App.tsx can actually render, read out of App.tsx itself so
 * this file cannot drift from the switch statement. Falls back to the known
 * set if the source moves.
 */
const FALLBACK_TYPES = [
  'proof', 'experience', 'projects', 'education',
  'certificates', 'skills', 'leadership', 'prose', 'contact',
]

function renderableTypes() {
  const appPath = resolve(REPO, 'src/App.tsx')
  if (!existsSync(appPath)) return { types: FALLBACK_TYPES, source: 'fallback list' }
  const src = readFileSync(appPath, 'utf8')
  const found = [...src.matchAll(/case\s+'([a-zA-Z0-9_-]+)'\s*:/g)].map((m) => m[1])
  if (found.length === 0) return { types: FALLBACK_TYPES, source: 'fallback list' }
  return { types: [...new Set(found)], source: 'src/App.tsx' }
}

// Sections that render a list. Everything else carries its content inline.
const LIST_TYPES = new Set([
  'proof', 'experience', 'projects', 'education',
  'certificates', 'skills', 'leadership',
])
const BODY_TYPES = new Set(['prose'])
// `proof` is the strip above the fold: no heading, no nav entry, by design.
const CHROMELESS_TYPES = new Set(['proof'])

// -- Load --------------------------------------------------------------------
if (!existsSync(target)) {
  console.error(`site.json validation: file not found: ${target}`)
  process.exit(1)
}

let doc
try {
  doc = JSON.parse(readFileSync(target, 'utf8'))
} catch (e) {
  console.error(`site.json validation: ${target} is not valid JSON\n  ${e.message}`)
  process.exit(1)
}

// -- Document ----------------------------------------------------------------
if (!isPlainObject(doc)) {
  err('$', 'document must be a JSON object')
} else {
  if (doc.schemaVersion !== 2) {
    err('$.schemaVersion', `expected 2, got ${JSON.stringify(doc.schemaVersion)}`)
  }

  for (const k of ['title', 'description', 'domain']) {
    if (!nonEmpty(doc.meta?.[k])) err(`$.meta.${k}`, 'required, must be a non-empty string')
  }

  for (const k of ['name', 'shortName', 'role', 'email']) {
    if (!nonEmpty(doc.profile?.[k])) err(`$.profile.${k}`, 'required, must be a non-empty string')
  }
  if (doc.profile?.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(doc.profile.email)) {
    err('$.profile.email', `does not look like an address: ${doc.profile.email}`)
  }
  if (doc.profile?.links !== undefined && !Array.isArray(doc.profile.links) && !isPlainObject(doc.profile.links)) {
    err('$.profile.links', 'must be an array or an object')
  }
}

// -- Sections ----------------------------------------------------------------
const { types, source } = renderableTypes()
const known = new Set(types)
const sections = doc?.sections

if (!Array.isArray(sections)) {
  err('$.sections', 'required, must be an array')
} else if (sections.length === 0) {
  err('$.sections', 'is empty - the page would render as the hero alone')
} else {
  const seenIds = new Set()
  const seenNav = new Set()

  sections.forEach((s, i) => {
    const at = `$.sections[${i}]${s?.id ? ` (${s.id})` : ''}`

    if (!isPlainObject(s)) {
      err(at, 'must be an object')
      return
    }

    if (!nonEmpty(s.id)) err(`${at}.id`, 'required, must be a non-empty string')
    else if (seenIds.has(s.id)) err(`${at}.id`, `duplicate id "${s.id}" - anchors and React keys collide`)
    else seenIds.add(s.id)

    if (!nonEmpty(s.type)) {
      err(`${at}.type`, 'required, must be a non-empty string')
    } else if (!known.has(s.type)) {
      err(
        `${at}.type`,
        `"${s.type}" is not rendered by App.tsx - renderSection() returns null, so this section ` +
          `would silently vanish. Known types (from ${source}): ${[...known].join(', ')}`,
      )
    }

    if (typeof s.visible !== 'boolean') {
      err(`${at}.visible`, `required, must be true or false (got ${JSON.stringify(s.visible)})`)
    }
    if (!isStr(s.title)) err(`${at}.title`, 'required, must be a string (may be empty)')
    if (!isStr(s.navLabel)) err(`${at}.navLabel`, 'required, must be a string (may be empty)')

    // A visible section with no nav label is unreachable from the nav.
    if (s.visible === true && !CHROMELESS_TYPES.has(s.type)) {
      if (!nonEmpty(s.navLabel)) {
        err(`${at}.navLabel`, 'visible section has no nav label - it would not appear in the nav')
      }
      if (!nonEmpty(s.title)) warn(`${at}.title`, 'visible section has an empty heading')
      const key = String(s.navLabel).trim().toLowerCase()
      if (key && seenNav.has(key)) warn(`${at}.navLabel`, `duplicate nav label "${s.navLabel}"`)
      else if (key) seenNav.add(key)
    }

    // Shape required by the component this type maps to.
    if (LIST_TYPES.has(s.type)) {
      if (!Array.isArray(s.items)) {
        err(`${at}.items`, `type "${s.type}" renders a list, so items must be an array`)
      } else if (s.items.length === 0 && s.visible === true) {
        warn(`${at}.items`, 'visible section has no items - it renders as an empty heading')
      } else {
        s.items.forEach((item, j) => {
          if (!isPlainObject(item)) err(`${at}.items[${j}]`, 'must be an object')
        })
      }
    }

    if (BODY_TYPES.has(s.type) && s.visible === true && !nonEmpty(s.body)) {
      err(`${at}.body`, `type "${s.type}" renders prose, so body must be a non-empty string`)
    }
  })
}

// -- Report ------------------------------------------------------------------
const rel = target.replace(process.cwd() + '/', '')
const ghError = (m) => (process.env.GITHUB_ACTIONS ? `::error::${m}` : `  x ${m}`)
const ghWarn = (m) => (process.env.GITHUB_ACTIONS ? `::warning::${m}` : `  ! ${m}`)

for (const w of warnings) console.warn(ghWarn(w))

if (errors.length > 0) {
  console.error(`\n${rel}: ${errors.length} error${errors.length === 1 ? '' : 's'}\n`)
  for (const e of errors) console.error(ghError(e))
  console.error('')
  process.exit(1)
}

if (!quiet) {
  const n = Array.isArray(sections) ? sections.length : 0
  const vis = Array.isArray(sections) ? sections.filter((s) => s?.visible).length : 0
  console.log(
    `${rel}: ok - schemaVersion 2, ${n} section${n === 1 ? '' : 's'} (${vis} visible)` +
      `${warnings.length ? `, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : ''}`,
  )
}
