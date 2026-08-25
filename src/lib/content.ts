/**
 * Pure helpers. Deliberately holds no data of its own — everything arrives as
 * arguments now that content is loaded at runtime and can change without a
 * rebuild.
 */

export interface Metric {
  value: string
  label: string
}

export interface Project {
  id: string
  title: string
  subtitle: string
  category: string
  type: string
  status: string
  featured: boolean
  startDate: string
  endDate: string
  shortDescription: string
  description: string
  problem?: string
  solution?: string
  myRole?: string
  outcome?: string
  technologies: string[]
  achievements: string[]
  responsibilities: string[]
  links: Record<string, string | undefined>
  images: string[]
  tags: string[]
  metrics?: Metric[]
  /** Manual override for which project leads its category row. Lower first. */
  priority?: number
}

/* ── Dates ────────────────────────────────────────────────────────────── */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatMonth(iso?: string | null): string {
  if (!iso) return ''
  const [y, m] = iso.split('-')
  const idx = Number(m) - 1
  return MONTHS[idx] ? `${MONTHS[idx]} ${y}` : y ?? ''
}

export function formatRange(start?: string, end?: string, current?: boolean): string {
  const a = formatMonth(start)
  const b = current ? 'Present' : formatMonth(end)
  if (a && b) return `${a} — ${b}`
  return a || b
}

export function yearOf(iso?: string): string {
  return iso ? iso.split('-')[0] : ''
}

/* ── Metrics ──────────────────────────────────────────────────────────── */

// Pulls the first quantity out of an achievement sentence: "Achieved 95%
// visual similarity through…" → { value: "95%", label: "visual similarity" }.
// Curated `metrics` always win; this only covers entries without them.
const QUANTITY = /(\d[\d,]*(?:\.\d+)?\s*(?:%\+?|\+|×|x\b|MB|GB|k\b)?)/i

function deriveMetric(sentence: string): Metric | null {
  const m = sentence.match(QUANTITY)
  if (!m) return null
  const value = m[1].replace(/\s+/g, '')
  const after = sentence
    .slice((m.index ?? 0) + m[1].length)
    .replace(/^[\s,–—-]+/, '')
    .split(/[,(]|\bthrough\b|\bwith\b|\bfrom\b|\bacross\b|\breducing\b/i)[0]
    .trim()
  const label = after.split(/\s+/).slice(0, 4).join(' ')
  return label ? { value, label } : null
}

export function metricsFor(project: Project): Metric[] {
  if (project.metrics?.length) return project.metrics.slice(0, 3)
  const out: Metric[] = []
  for (const a of project.achievements ?? []) {
    const m = deriveMetric(a)
    if (m) out.push(m)
    if (out.length === 3) break
  }
  return out
}

/* ── Project grouping ─────────────────────────────────────────────────── */

export interface CategoryRow {
  name: string
  lead: Project
  rest: Project[]
  count: number
  span: string
}

const CATEGORY_BLURB: Record<string, string> = {
  'Full-Stack Development': 'Enterprise migration through to self-deployed side projects.',
  'Machine Learning': 'Computer vision and NLP, both shipped and running.',
  'Data Engineering': 'Moving records between systems without losing any of them.',
  'Technical Documentation': 'Reading undocumented systems and writing them down.',
  'Mobile Development': 'Cross-platform apps with role-separated flows.',
  'Software Design': 'Architecture and specification handed over to be built.',
}

export function blurbFor(category: string): string {
  return CATEGORY_BLURB[category] ?? ''
}

const byNewest = (a: Project, b: Project) => (b.endDate || '').localeCompare(a.endDate || '')

// Provenance carries more weight than recency when choosing what leads a row:
// paid production work outranks coursework, finished outranks in-progress.
const TYPE_WEIGHT: Record<string, number> = { Enterprise: 0, 'Open Source': 1, Academic: 2, Personal: 3 }

const byStrength = (a: Project, b: Project) => {
  const pa = a.priority ?? Infinity
  const pb = b.priority ?? Infinity
  if (pa !== pb) return pa - pb

  const t = (TYPE_WEIGHT[a.type] ?? 9) - (TYPE_WEIGHT[b.type] ?? 9)
  if (t !== 0) return t
  const s = Number(a.status === 'In Progress') - Number(b.status === 'In Progress')
  if (s !== 0) return s
  return byNewest(a, b)
}

export function categoryRows(source: Project[], order: string[] = []): CategoryRow[] {
  const groups = new Map<string, Project[]>()
  for (const p of source) {
    const list = groups.get(p.category) ?? []
    list.push(p)
    groups.set(p.category, list)
  }

  const ordered = [
    ...order.filter((c) => groups.has(c)),
    ...[...groups.keys()].filter((c) => !order.includes(c)),
  ]

  return ordered.map((name) => {
    const all = [...(groups.get(name) ?? [])].sort(byStrength)
    const lead = all.find((p) => p.featured) ?? all[0]
    const rest = all.filter((p) => p.id !== lead.id)
    const years = all.map((p) => yearOf(p.endDate) || yearOf(p.startDate)).filter(Boolean).sort()
    const span = years.length
      ? years[0] === years[years.length - 1]
        ? years[0]
        : `${years[0]} — ${years[years.length - 1]}`
      : ''
    return { name, lead, rest, count: all.length, span }
  })
}

/* ── Search & filter ──────────────────────────────────────────────────── */

export function filterProjects(source: Project[], query: string, type: string): Project[] {
  const q = query.trim().toLowerCase()
  return source.filter((p) => {
    if (type !== 'All' && p.type !== type) return false
    if (!q) return true
    const haystack = [p.title, p.subtitle, p.shortDescription, p.category, p.type, ...(p.technologies ?? []), ...(p.tags ?? [])]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

export function typeCounts(source: Project[]): { label: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const p of source) counts.set(p.type, (counts.get(p.type) ?? 0) + 1)
  return [
    { label: 'All', count: source.length },
    ...[...counts.entries()]
      .sort((a, b) => (TYPE_WEIGHT[a[0]] ?? 9) - (TYPE_WEIGHT[b[0]] ?? 9))
      .map(([label, count]) => ({ label, count })),
  ]
}
