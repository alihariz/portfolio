/**
 * The one definition of a valid site document (schemaVersion 2).
 *
 * Used in three places, so they can never disagree:
 *   - the CMS, inside every write (server.js) — a document that fails here is
 *     never written, so it can never reach a visitor;
 *   - the editor in the browser, before it sends anything (public/editor.mjs);
 *   - CI, against the bundled src/data/site.json (scripts/validate-site-json.mjs).
 *
 * What it checks is deliberately narrow: exactly the fields the React
 * components read without a guard. Those are the ones that crash the page
 * (`e.degree.replace`, `project.images[0]`, `value.match` in CountUp …) or make
 * content vanish silently (an unknown section `type`, missing ids that make
 * `rest = all.filter(p => p.id !== lead.id)` drop everything). Every other
 * field is free-form, so adding a key to the JSON never needs a change here.
 * test/render.test.mjs at the repo root proves the claim: it mutates the real
 * document thousands of ways and renders every version this file accepts.
 *
 * No imports, no Node APIs — the same file is served to the browser.
 */

export const SCHEMA_VERSION = 2

/** Every type App.tsx's renderSection() handles. CI fails if the two drift. */
export const SECTION_TYPES = [
  'proof', 'experience', 'projects', 'education',
  'certificates', 'skills', 'leadership', 'prose', 'contact',
]

/* ── Field kinds ───────────────────────────────────────────────────────────
 *   str       string, required (may be empty unless listed in NON_EMPTY)
 *   str?      string, null or absent
 *   text?     string, number, null or absent (rendered in a template literal)
 *   date?     like str?, and should look like YYYY, YYYY-MM or YYYY-MM-DD
 *   bool?     boolean, null or absent
 *   num?      finite number, null or absent
 *   url?      str? that is safe to put in href/src
 *   strs      array of strings, required
 *   strs?     array of strings, null or absent
 *   urls      array of url strings, required
 *   links     object whose values are url strings (or empty/null), required
 *   { list }  array of objects checked against a nested spec
 */

const ITEM_SPECS = {
  proof: {
    value: 'str', // CountUp calls value.match() — a number here throws
    label: 'str',
  },
  experience: {
    id: 'str',
    company: 'str', // .replace()
    position: 'str', // .replace()
    department: 'str?',
    location: 'str?',
    startDate: 'date?',
    endDate: 'date?',
    current: 'bool?',
    accomplishments: {
      optional: true,
      list: { title: 'str', description: 'str?', impact: 'str?', technologies: 'strs?' },
    },
  },
  projects: {
    id: 'str',
    title: 'str',
    category: 'str',
    subtitle: 'str?',
    type: 'str?',
    status: 'str?',
    featured: 'bool?',
    priority: 'num?',
    startDate: 'date?',
    endDate: 'date?', // byNewest calls endDate.localeCompare()
    shortDescription: 'str?',
    description: 'str?',
    problem: 'str?',
    solution: 'str?',
    myRole: 'str?',
    outcome: 'str?',
    technologies: 'strs', // .slice(), .map() — unguarded
    achievements: 'strs', // .length in the drawer — unguarded
    responsibilities: 'strs?',
    tags: 'strs?',
    images: 'urls', // images[0] — unguarded
    links: 'links', // links.live — unguarded
    metrics: { optional: true, list: { value: 'str', label: 'str' } },
  },
  education: {
    id: 'str',
    institution: 'str',
    degree: 'str', // .replace()
    location: 'str?', // .split()
    startDate: 'date?',
    endDate: 'date?',
    current: 'bool?',
    gpa: 'text?',
    maxGpa: 'text?',
  },
  certificates: {
    id: 'str',
    name: 'str',
    shortName: 'str?',
    issuer: 'str?',
    issueDate: 'date?',
    score: 'text?',
    description: 'str?',
    featured: 'bool?',
    imagePath: 'url?',
    credentialUrl: 'url?',
  },
  skills: {
    id: 'str',
    category: 'str',
    skills: { list: { name: 'str' } }, // cat.skills.map(s => s.name)
  },
  leadership: {
    id: 'str',
    title: 'str?',
    role: 'str?',
    organization: 'str',
    startDate: 'date?',
    endDate: 'date?',
    current: 'bool?',
  },
}

/** Required strings that must also have content, not just exist. */
const NON_EMPTY = {
  projects: ['id', 'title', 'category'],
  experience: ['id', 'company', 'position'],
  education: ['id', 'institution', 'degree'],
  certificates: ['id', 'name'],
  skills: ['id', 'category'],
  leadership: ['id', 'organization'],
}

/** Section types whose content is a list of items. */
const LIST_TYPES = new Set(['proof', 'experience', 'projects', 'education', 'certificates', 'skills', 'leadership'])
/** `proof` is the strip above the fold: no heading, no nav entry, by design. */
const CHROMELESS = new Set(['proof'])
/** Item ids must be unique where a component looks items up by id. */
const ID_KEYED = new Set(['experience', 'projects', 'education', 'certificates', 'skills', 'leadership'])

const PROFILE_SPEC = {
  name: 'str', // .split() for initials
  shortName: 'str',
  role: 'str',
  email: 'str',
  location: 'str?',
  portrait: 'url?',
  availability: 'str?',
  headline: 'str?',
  intro: 'str?',
  links: 'links',
}
const PROFILE_NON_EMPTY = ['name', 'shortName', 'role', 'email']

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const isStr = (v) => typeof v === 'string'
const absent = (v) => v === undefined || v === null
const DATE_RE = /^\d{4}(-\d{2}(-\d{2})?)?$/
const SAFE_SCHEMES = new Set(['http', 'https', 'mailto'])

/**
 * An href/src value is safe if it is empty, relative, or uses http(s)/mailto.
 * Browsers ignore ASCII whitespace and control characters inside a scheme
 * ("java\tscript:"), so those are stripped before looking.
 */
export function isSafeUrl(v) {
  if (!isStr(v)) return false
  // eslint-disable-next-line no-control-regex
  const squashed = v.replace(/[\u0000- \u007f]/g, '')
  const m = squashed.match(/^([a-z][a-z0-9+.-]*):/i)
  return !m || SAFE_SCHEMES.has(m[1].toLowerCase())
}

function checkField(kind, value, at, err, warn) {
  switch (kind) {
    case 'str':
      if (!isStr(value)) err(at, `must be text (got ${describe(value)})`)
      return
    case 'str?':
      if (!absent(value) && !isStr(value)) err(at, `must be text or empty (got ${describe(value)})`)
      return
    case 'text?':
      if (!absent(value) && !isStr(value) && !(typeof value === 'number' && Number.isFinite(value))) {
        err(at, `must be text or a number (got ${describe(value)})`)
      }
      return
    case 'date?':
      if (absent(value) || value === '') return
      if (!isStr(value)) err(at, `must be a date like 2026-10 (got ${describe(value)})`)
      else if (!DATE_RE.test(value)) warn(at, `"${value}" is not YYYY, YYYY-MM or YYYY-MM-DD, so it may display oddly`)
      return
    case 'bool?':
      if (!absent(value) && typeof value !== 'boolean') err(at, `must be true or false (got ${describe(value)})`)
      return
    case 'num?':
      if (!absent(value) && !(typeof value === 'number' && Number.isFinite(value))) {
        err(at, `must be a number (got ${describe(value)})`)
      }
      return
    case 'url?':
      if (absent(value)) return
      if (!isStr(value)) err(at, `must be a link or path (got ${describe(value)})`)
      else if (!isSafeUrl(value)) err(at, `"${value}" is not an http(s), mailto or relative link`)
      return
    case 'strs':
    case 'strs?':
      if (kind === 'strs?' && absent(value)) return
      if (!Array.isArray(value)) return err(at, `must be a list of text (got ${describe(value)})`)
      value.forEach((v, i) => { if (!isStr(v)) err(`${at}[${i}]`, `must be text (got ${describe(v)})`) })
      return
    case 'urls':
      if (!Array.isArray(value)) return err(at, `must be a list of image paths (got ${describe(value)})`)
      value.forEach((v, i) => {
        if (!isStr(v)) err(`${at}[${i}]`, `must be a path (got ${describe(v)})`)
        else if (!isSafeUrl(v)) err(`${at}[${i}]`, `"${v}" is not an http(s) or relative path`)
      })
      return
    case 'links':
      if (!isObj(value)) return err(at, `must be a set of named links (got ${describe(value)})`)
      for (const [k, v] of Object.entries(value)) {
        if (absent(v) || v === '') continue
        if (!isStr(v)) err(`${at}.${k}`, `must be a link (got ${describe(v)})`)
        else if (!isSafeUrl(v)) err(`${at}.${k}`, `"${v}" is not an http(s), mailto or relative link`)
      }
      return
    default:
      throw new Error(`unknown field kind ${kind}`)
  }
}

function describe(v) {
  if (v === null) return 'nothing'
  if (Array.isArray(v)) return 'a list'
  if (typeof v === 'object') return 'a group of fields'
  if (typeof v === 'string') return v === '' ? 'empty text' : 'text'
  return typeof v === 'number' ? 'a number' : typeof v
}

function checkObject(spec, obj, at, err, warn) {
  for (const [key, kind] of Object.entries(spec)) {
    const value = obj[key]
    const here = `${at}.${key}`
    if (typeof kind === 'string') {
      checkField(kind, value, here, err, warn)
      continue
    }
    // Nested list of objects.
    if (absent(value) && kind.optional) continue
    if (!Array.isArray(value)) {
      err(here, `must be a list (got ${describe(value)})`)
      continue
    }
    value.forEach((entry, i) => {
      if (!isObj(entry)) err(`${here}[${i}]`, `must be a group of fields (got ${describe(entry)})`)
      else checkObject(kind.list, entry, `${here}[${i}]`, err, warn)
    })
  }
}

/* ── The validator ─────────────────────────────────────────────────────── */

/**
 * @returns {{ errors: {path: string, message: string}[], warnings: {path: string, message: string}[] }}
 * Errors mean the document would break or silently lose part of the page and
 * must not be saved. Warnings are worth a look but render fine.
 */
export function validateSite(doc) {
  const errors = []
  const warnings = []
  const err = (path, message) => errors.push({ path, message })
  const warn = (path, message) => warnings.push({ path, message })

  if (!isObj(doc)) {
    err('$', 'the document must be a JSON object')
    return { errors, warnings }
  }

  if (doc.schemaVersion !== SCHEMA_VERSION) {
    err('$.schemaVersion', `must be ${SCHEMA_VERSION} (got ${JSON.stringify(doc.schemaVersion)}) — the site ignores any other version`)
  }

  if (!isObj(doc.meta)) err('$.meta', 'is required')
  else {
    for (const k of ['title', 'description', 'domain']) {
      if (!isStr(doc.meta[k]) || !doc.meta[k].trim()) err(`$.meta.${k}`, 'is required')
    }
  }

  if (!isObj(doc.profile)) err('$.profile', 'is required')
  else {
    checkObject(PROFILE_SPEC, doc.profile, '$.profile', err, warn)
    for (const k of PROFILE_NON_EMPTY) {
      if (isStr(doc.profile[k]) && !doc.profile[k].trim()) err(`$.profile.${k}`, 'must not be empty')
    }
    const email = doc.profile.email
    if (isStr(email) && email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      err('$.profile.email', `"${email}" does not look like an email address`)
    }
  }

  if (!Array.isArray(doc.sections)) {
    err('$.sections', 'must be a list')
    return { errors, warnings }
  }
  if (doc.sections.length === 0) err('$.sections', 'is empty — the page would be the hero and nothing else')

  const known = new Set(SECTION_TYPES)
  const sectionIds = new Set()
  const navLabels = new Set()

  doc.sections.forEach((s, i) => {
    const at = `$.sections[${i}]${isObj(s) && isStr(s.id) && s.id ? ` (${s.id})` : ''}`
    if (!isObj(s)) return err(at, `must be a group of fields (got ${describe(s)})`)

    if (!isStr(s.id) || !s.id.trim()) err(`${at}.id`, 'is required')
    else if (sectionIds.has(s.id)) err(`${at}.id`, `"${s.id}" is used twice — the nav anchors would collide`)
    else {
      sectionIds.add(s.id)
      if (!/^[a-z0-9][a-z0-9-]*$/i.test(s.id)) warn(`${at}.id`, `"${s.id}" is used as a #link; letters, digits and hyphens are safest`)
    }

    if (!known.has(s.type)) {
      err(`${at}.type`, `"${s.type}" is not a section the site can draw, so the whole section would silently vanish. Use one of: ${SECTION_TYPES.join(', ')}`)
    }
    if (typeof s.visible !== 'boolean') err(`${at}.visible`, `must be true or false (got ${describe(s.visible)})`)
    if (!isStr(s.title)) err(`${at}.title`, `must be text, even if empty (got ${describe(s.title)})`)
    if (!isStr(s.navLabel)) err(`${at}.navLabel`, `must be text, even if empty (got ${describe(s.navLabel)})`)
    checkField('str?', s.lead, `${at}.lead`, err, warn)
    checkField('str?', s.body, `${at}.body`, err, warn)
    checkField('strs?', s.categoryOrder, `${at}.categoryOrder`, err, warn)

    if (s.visible === true && !CHROMELESS.has(s.type)) {
      if (isStr(s.navLabel) && !s.navLabel.trim()) err(`${at}.navLabel`, 'a visible section needs a nav label, or it cannot be reached from the menu')
      if (isStr(s.title) && !s.title.trim()) warn(`${at}.title`, 'visible section has an empty heading')
      const key = isStr(s.navLabel) ? s.navLabel.trim().toLowerCase() : ''
      if (key && navLabels.has(key)) warn(`${at}.navLabel`, `"${s.navLabel}" appears twice in the menu`)
      else if (key) navLabels.add(key)
    }

    if (s.type === 'prose' && s.visible === true && !(isStr(s.body) && s.body.trim())) {
      err(`${at}.body`, 'a visible prose section needs some text')
    }

    if (!LIST_TYPES.has(s.type)) return
    if (!Array.isArray(s.items)) return err(`${at}.items`, `a ${s.type} section needs a list of items (got ${describe(s.items)})`)
    if (s.items.length === 0 && s.visible === true) warn(`${at}.items`, 'visible section has no items, so it shows only a heading')

    const spec = ITEM_SPECS[s.type]
    const ids = new Set()
    s.items.forEach((item, j) => {
      const label = isObj(item) && (item.id || item.title || item.name || item.label)
      const iat = `${at}.items[${j}]${isStr(label) && label ? ` (${label})` : ''}`
      if (!isObj(item)) return err(iat, `must be a group of fields (got ${describe(item)})`)
      checkObject(spec, item, iat, err, warn)
      for (const k of NON_EMPTY[s.type] || []) {
        if (isStr(item[k]) && !item[k].trim()) err(`${iat}.${k}`, 'must not be empty')
      }
      if (ID_KEYED.has(s.type) && isStr(item.id) && item.id) {
        if (ids.has(item.id)) err(`${iat}.id`, `"${item.id}" is used twice in this section — one of them would disappear`)
        ids.add(item.id)
      }
    })
  })

  return { errors, warnings }
}

/** "path: message" lines, for logs, CLIs and API responses. */
export const formatIssues = (issues) => issues.map((i) => `${i.path}: ${i.message}`)

/* ── What the editor needs to build forms without guessing ──────────────── */

/**
 * Whether a field holds a list of text or a list of groups, from the schema
 * rather than from its current contents — an emptied list otherwise looks
 * like a list of text, and the editor would turn `skills: [{name}]` into
 * `skills: ["…"]`.
 */
export function listKind(sectionType, path) {
  if (path.length === 1 && path[0] === 'items') return LIST_TYPES.has(sectionType) ? 'objects' : undefined
  if (path.length === 1 && path[0] === 'categoryOrder') return 'strings'
  let spec = ITEM_SPECS[sectionType]
  if (!spec || path[0] !== 'items') return undefined
  for (const key of path.slice(1)) {
    const kind = spec?.[key]
    if (kind === undefined) return undefined
    if (typeof kind === 'object') { spec = kind.list; continue }
    return kind === 'strs' || kind === 'strs?' || kind === 'urls' ? 'strings' : undefined
  }
  return spec ? 'objects' : undefined
}

function blankFor(spec) {
  const out = {}
  for (const [key, kind] of Object.entries(spec)) {
    if (typeof kind === 'object') { if (!kind.optional) out[key] = []; continue }
    if (kind === 'str' || kind === 'str?' || kind === 'date?' || kind === 'url?' || kind === 'text?') out[key] = ''
    else if (kind === 'strs' || kind === 'urls') out[key] = []
    else if (kind === 'links') out[key] = {}
    else if (kind === 'bool?') out[key] = false
    // num?, strs? are left out: absent is their natural empty state
  }
  return out
}

/**
 * A blank entry for a list, with every field the site reads, so a new item
 * has inputs to fill rather than being an empty `{}` with none.
 * `path` is ['items'] for a section's items, or ['items', 'accomplishments'] etc.
 */
export function itemTemplate(sectionType, path = ['items']) {
  let spec = ITEM_SPECS[sectionType]
  if (!spec) return {}
  for (const key of path.slice(1)) {
    const kind = spec?.[key]
    if (!kind || typeof kind !== 'object') return {}
    spec = kind.list
  }
  const blank = blankFor(spec)
  if ('id' in blank) blank.id = `new-${Math.random().toString(36).slice(2, 8)}`
  // The editor cannot add keys to an object, so offer the links the project
  // drawer knows how to label; empty ones are simply not shown.
  if (sectionType === 'projects' && path.length === 1) blank.links = { live: '', github: '', demo: '' }
  return blank
}
