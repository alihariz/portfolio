import { useEffect, useMemo, useState } from 'react'
import {
  blurbFor,
  categoryRows,
  filterProjects,
  formatRange,
  metricsFor,
  typeCounts,
  yearOf,
  type Project,
} from '../../lib/content'
import type { Section } from '../../lib/site'
import { Button, MetricBlock, SectionHeader, StatusTag, Tag, TypeTag, Washed } from '../ui/primitives'
import { ProjectDrawer } from '../features/ProjectDrawer'

/**
 * Where the work was done, plus when. Subtitles in the JSON are inconsistent
 * ("MAHB Industrial Training", "Academic Project - Developer"), and echoing
 * them raw next to the type tag repeats the word "Academic" twice. Pull out
 * the institution when there is one; otherwise show the dates alone.
 */
function provenance(project: Project): string {
  const org = /MAHB/i.test(project.subtitle) ? 'MAHB' : /UTM/i.test(project.subtitle) ? 'UTM' : ''
  const when = formatRange(project.startDate, project.endDate)
  return [org, when].filter(Boolean).join(' · ')
}

/* ── Flagship — the project I'd put in front of an interviewer first ───── */

function FlagshipCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const metrics = metricsFor(project)
  const shot = project.images[0]

  return (
    <article className="lift rounded-lg bg-surface p-4 sm:p-6">
      <div className={`grid gap-6 ${shot ? 'sm:grid-cols-[minmax(0,240px)_1fr]' : ''}`}>
        {shot && (
          <Washed
            src={shot}
            alt={`${project.title} interface`}
            sizes="(min-width: 640px) 240px, calc(100vw - 64px)"
            className="aspect-[4/3] w-full self-start"
          />
        )}

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Only genuinely featured work wears the Flagship tag. A lone
                project in a small category leads its row by default, and
                labelling that "flagship" would overstate it. */}
            {project.featured && <Tag tone="accent">Flagship</Tag>}
            <TypeTag type={project.type} />
            <StatusTag status={project.status} />
            <span className="text-small text-muted">{provenance(project)}</span>
          </div>

          <h3 className="mt-3 text-h3 sm:text-h3-lg">{project.title}</h3>

          <p className="mt-3 max-w-prose text-body text-muted">{project.shortDescription}</p>

          {metrics.length > 0 && (
            <div className="mt-6 grid grid-cols-3 gap-4">
              {metrics.map((m) => (
                <MetricBlock key={m.label} value={m.value} label={m.label} />
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {project.technologies.slice(0, 4).map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={onOpen}>Open project</Button>
            {/* A URL a reader can actually open beats any amount of prose. */}
            {project.links.live && (
              <Button
                as="a"
                href={project.links.live}
                target="_blank"
                rel="noreferrer noopener"
                variant="secondary"
              >
                Visit the live site ↗
              </Button>
            )}
            {/* Without this nobody discovers there is an installable app. */}
            {project.links.android && (
              <Button
                as="a"
                href={project.links.android}
                target="_blank"
                rel="noreferrer noopener"
                variant="secondary"
              >
                Install on Android ↗
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

/* ── Compact row — provenance, stack, year. Nothing else. ─────────────── */

function CompactRow({ project, onOpen }: { project: Project; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="lift group flex min-h-[60px] w-full items-center gap-4 rounded-pill bg-surface px-5 py-3 text-left transition-[transform,background-color] hover:bg-accent-100 dark:hover:bg-neutral-800"
    >
      <span className="line-clamp-2 flex-1 text-body font-semibold sm:line-clamp-1">{project.title}</span>

      <span className="hidden shrink-0 items-center gap-3 sm:flex">
        {project.status === 'In Progress' ? <StatusTag status={project.status} /> : <TypeTag type={project.type} />}
        <span className="text-small text-muted">{project.technologies.slice(0, 3).join(' · ')}</span>
        <span className="w-10 text-right text-small text-muted">{yearOf(project.endDate)}</span>
      </span>

      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-bg text-ink transition-transform group-hover:translate-x-1"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </button>
  )
}

/* ── Section ──────────────────────────────────────────────────────────── */

export function Projects({ section, index }: { section: Section; index: string }) {
  // Memoised because it feeds three hooks below: without this, an undefined
  // `items` produces a fresh [] each render and re-runs all of them.
  const projects = useMemo(() => (section.items ?? []) as Project[], [section.items])
  const [query, setQuery] = useState('')
  const [type, setType] = useState('All')
  const [openId, setOpenId] = useState<string | null>(null)

  // Deep links: ?project=proj-2 so a recruiter can be sent straight to one.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('project')
    if (id && projects.some((p) => p.id === id)) setOpenId(id)
  }, [projects])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (openId) url.searchParams.set('project', openId)
    else url.searchParams.delete('project')
    window.history.replaceState({}, '', url)
  }, [openId])

  const filtered = useMemo(() => filterProjects(projects, query, type), [projects, query, type])
  const rows = useMemo(() => categoryRows(filtered, section.categoryOrder ?? []), [filtered, section.categoryOrder])
  const counts = useMemo(() => typeCounts(projects), [projects])
  const open = projects.find((p) => p.id === openId) ?? null

  return (
    <section className="shell py-16">
      <SectionHeader id={section.id} index={index} label="Projects" title={section.title} lead={section.lead} />

      <div className="mb-12 flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="project-search">
          Search projects
        </label>
        <input
          id="project-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects, stacks, tags…"
          className="min-h-[44px] w-full max-w-xs rounded-pill border border-divider bg-transparent px-5 text-body placeholder:text-muted focus:border-accent"
        />

        <div className="flex flex-wrap gap-2">
          {counts.map((c) => (
            <button
              key={c.label}
              onClick={() => setType(c.label)}
              aria-pressed={type === c.label}
              className={`min-h-[44px] rounded-pill px-5 text-body font-semibold transition-colors ${
                type === c.label
                  ? 'bg-accent-700 text-neutral-100 dark:bg-accent-400 dark:text-neutral-900'
                  : 'bg-surface text-muted hover:bg-accent-100 dark:hover:bg-neutral-800'
              }`}
            >
              {c.label} {c.count}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 && (
        <p className="rounded-lg bg-surface p-6 text-body text-muted">
          Nothing matches “{query}”. Try a stack name, a category, or clear the filter.
        </p>
      )}

      <div className="space-y-16">
        {rows.map((row) => (
          <div key={row.name} className="grid gap-6 lg:grid-cols-[220px_1fr] lg:gap-12">
            <div>
              <h3 className="text-h3 sm:text-h3-lg">{row.name}</h3>
              <p className="mt-2 text-small text-muted">
                {row.count} project{row.count === 1 ? '' : 's'}
                {row.span && ` · ${row.span}`}
              </p>
              <p className="mt-3 hidden text-small text-muted lg:block">{blurbFor(row.name)}</p>
            </div>

            <div className="space-y-3">
              <FlagshipCard project={row.lead} onOpen={() => setOpenId(row.lead.id)} />
              {row.rest.map((p) => (
                <CompactRow key={p.id} project={p} onOpen={() => setOpenId(p.id)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <ProjectDrawer project={open} onClose={() => setOpenId(null)} />
    </section>
  )
}

export { formatRange }
