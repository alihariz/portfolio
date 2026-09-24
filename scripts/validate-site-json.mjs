#!/usr/bin/env node
/**
 * Validate a site document — the CLI face of cms/lib/validate-site.mjs.
 *
 * The rules live in that one module so CI, the CMS (on every save) and the
 * editor (before it sends) all apply exactly the same ones. This wrapper adds
 * the one check that needs the repo: that the section types the validator
 * knows are exactly the ones App.tsx's renderSection() can draw. A type in
 * one list and not the other means either a section that silently vanishes or
 * a validator that rejects something the site supports.
 *
 *   node scripts/validate-site-json.mjs src/data/site.json
 *   node scripts/validate-site-json.mjs /path/to/site.json --quiet
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateSite, formatIssues, SECTION_TYPES } from '../cms/lib/validate-site.mjs'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const quiet = process.argv.includes('--quiet')
const target = resolve(process.cwd(), args[0] ?? 'src/data/site.json')

const gh = !!process.env.GITHUB_ACTIONS
const showError = (m) => console.error(gh ? `::error::${m}` : `  x ${m}`)
const showWarning = (m) => console.warn(gh ? `::warning::${m}` : `  ! ${m}`)

// -- The validator and App.tsx must agree on section types ---------------------
const appPath = resolve(REPO, 'src/App.tsx')
if (existsSync(appPath)) {
  const drawn = new Set([...readFileSync(appPath, 'utf8').matchAll(/case\s+'([a-zA-Z0-9_-]+)'\s*:/g)].map((m) => m[1]))
  const known = new Set(SECTION_TYPES)
  const missing = [...drawn].filter((t) => !known.has(t))
  const extra = [...known].filter((t) => !drawn.has(t))
  if (missing.length || extra.length) {
    if (missing.length) showError(`App.tsx draws ${missing.join(', ')}, which cms/lib/validate-site.mjs does not know — add to SECTION_TYPES (and ITEM_SPECS if it has items)`)
    if (extra.length) showError(`cms/lib/validate-site.mjs allows ${extra.join(', ')}, which App.tsx cannot draw — such a section would silently vanish`)
    process.exit(1)
  }
}

// -- The document ----------------------------------------------------------------
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

const { errors, warnings } = validateSite(doc)
const rel = target.replace(process.cwd() + '/', '')

for (const w of formatIssues(warnings)) showWarning(w)

if (errors.length) {
  console.error(`\n${rel}: ${errors.length} error${errors.length === 1 ? '' : 's'}\n`)
  for (const e of formatIssues(errors)) showError(e)
  console.error('')
  process.exit(1)
}

if (!quiet) {
  const n = doc.sections.length
  const vis = doc.sections.filter((s) => s?.visible).length
  console.log(
    `${rel}: ok - schemaVersion 2, ${n} section${n === 1 ? '' : 's'} (${vis} visible)` +
      (warnings.length ? `, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : ''),
  )
}
