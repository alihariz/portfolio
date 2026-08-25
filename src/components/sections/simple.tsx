import { formatMonth, yearOf } from '../../lib/content'
import type { Metric, Section } from '../../lib/site'
import { MetricBlock, SectionHeader, Tag, Washed } from '../ui/primitives'

/* The smaller sections live together: each is a single presentational block
   driven entirely by its section payload, so the editor can reorder or hide
   any of them without touching code. */

interface Props {
  section: Section
  index: string
}

/* ── Proof strip ──────────────────────────────────────────────────────── */

export function Proof({ section }: { section: Section }) {
  const items = (section.items ?? []) as Metric[]
  if (!items.length) return null
  return (
    <section className="shell pb-8">
      <div className="grid grid-cols-2 gap-8 border-t border-divider pt-8 lg:grid-cols-4">
        {items.map((m) => (
          <MetricBlock key={m.label} value={m.value} label={m.label} />
        ))}
      </div>
    </section>
  )
}

/* ── Education ────────────────────────────────────────────────────────── */

interface Edu {
  id: string
  institution: string
  degree: string
  location?: string
  startDate?: string
  endDate?: string
  gpa?: string
  maxGpa?: string
}

export function Education({ section, index }: Props) {
  const items = (section.items ?? []) as Edu[]
  return (
    <section className="shell py-16">
      <SectionHeader id={section.id} index={index} label="Education" title={section.title} lead={section.lead} />
      <div className="grid gap-3 lg:grid-cols-3">
        {items.map((e) => (
          <article key={e.id} className="rounded-lg bg-surface p-6">
            <div className="flex items-start justify-between gap-4">
              <h4 className="text-h3 leading-tight">{e.degree.replace(' with Honours', ', Hons')}</h4>
              <span className="shrink-0 text-small text-muted">
                {yearOf(e.startDate)} — {yearOf(e.endDate)}
              </span>
            </div>
            <p className="mt-2 text-body">{e.institution}</p>
            <p className="mt-2 text-small text-muted">
              {e.gpa && `CGPA ${e.gpa} / ${e.maxGpa}`}
              {e.gpa && e.location && ' · '}
              {e.location?.split(',')[0]}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}

/* ── Certificates ─────────────────────────────────────────────────────── */

interface Cert {
  id: string
  name: string
  shortName?: string
  issuer: string
  issueDate?: string
  score?: string
  description?: string
  featured?: boolean
  imagePath?: string
}

const display = (c: Cert) => c.shortName || c.name

export function Certificates({ section, index }: Props) {
  const items = (section.items ?? []) as Cert[]
  const featured = items.find((c) => c.featured) ?? items[0]
  const rest = items.filter((c) => c.id !== featured?.id)

  return (
    <section className="shell py-16">
      <SectionHeader id={section.id} index={index} label="Certificates" title={section.title} lead={section.lead} />
      <div className="grid gap-3 lg:grid-cols-2">
        {featured && (
          <article className="rounded-lg bg-surface p-6">
            <div className="grid gap-4 sm:grid-cols-[110px_1fr]">
              {featured.imagePath && (
                <Washed src={featured.imagePath} alt={featured.name} className="aspect-[3/4] w-full self-start" />
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Tag tone="accent">Featured</Tag>
                  <span className="text-small text-muted">
                    {formatMonth(featured.issueDate)}
                    {featured.score && ` · scored ${featured.score}`}
                  </span>
                </div>
                <h4 className="mt-3 text-h3 leading-tight">{display(featured)}</h4>
                <p className="mt-2 text-body text-muted">{featured.description}</p>
              </div>
            </div>
          </article>
        )}
        <div className="space-y-3">
          {rest.map((c) => (
            <div
              key={c.id}
              title={c.name}
              className="flex min-h-[60px] items-center justify-between gap-4 rounded-pill bg-surface px-5 py-3"
            >
              <span className="min-w-0 flex-1 truncate text-body font-semibold">{display(c)}</span>
              <span className="hidden max-w-[45%] shrink truncate text-small text-muted sm:block">
                {c.issuer} · {yearOf(c.issueDate)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Skills ───────────────────────────────────────────────────────────── */

interface SkillCat {
  id: string
  category: string
  skills: { name: string }[]
}

export function Skills({ section, index }: Props) {
  const items = (section.items ?? []) as SkillCat[]
  return (
    <section className="shell py-16">
      <SectionHeader id={section.id} index={index} label="Skills" title={section.title} lead={section.lead} />
      <dl className="max-w-prose space-y-4 lg:max-w-none">
        {items.map((cat) => (
          <div key={cat.id} className="grid gap-2 sm:grid-cols-[200px_1fr] sm:gap-6">
            <dt className="text-kicker font-semibold uppercase text-muted">{cat.category}</dt>
            <dd className="text-body">{cat.skills.map((s) => s.name).join(', ')}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-8 text-small text-muted">
        No percentage bars: a number I assigned myself isn't evidence. The projects are.
      </p>
    </section>
  )
}

/* ── Leadership ───────────────────────────────────────────────────────── */

interface Lead {
  id: string
  title?: string
  role?: string
  organization: string
  startDate?: string
  endDate?: string
}

export function Leadership({ section, index }: Props) {
  const items = (section.items ?? []) as Lead[]
  return (
    <section className="shell py-16">
      <SectionHeader id={section.id} index={index} label="Involvement" title={section.title} lead={section.lead} />
      <ul className="grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((l) => (
          <li key={l.id} className="border-t border-divider py-4">
            {/* `title` is the descriptive one; `role` is often just "Participant". */}
            <p className="text-body font-semibold">{l.title || l.role}</p>
            <p className="mt-1 text-small text-muted">
              {l.organization}
              {l.startDate && ` · ${yearOf(l.startDate)}`}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ── Free prose ───────────────────────────────────────────────────────── */

export function Prose({ section, index }: Props) {
  if (!section.body?.trim()) return null
  return (
    <section className="shell py-16">
      <SectionHeader id={section.id} index={index} label="Notes" title={section.title} />
      <div className="max-w-prose space-y-4 text-body-lg">
        {section.body.split(/\n{2,}/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </section>
  )
}
