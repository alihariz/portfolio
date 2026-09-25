import { useEffect, useRef } from 'react'
import { formatRange, metricsFor, type Project } from '../../lib/content'
import { IconButton, Kicker, MetricBlock, StatusTag, Tag, TypeTag, Washed } from '../ui/primitives'

/** JSON keys are terse; these are what a reader should see. */
const LINK_LABEL: Record<string, string> = {
  live: 'Open the live site ↗',
  android: 'Install the Android app ↗',
  demo: 'Demo ↗',
  github: 'Source on GitHub ↗',
  documentation: 'Documentation ↗',
}

/**
 * Slides in from the right at 620px on desktop, becomes a full-screen sheet
 * that slides up on mobile. Traps focus, closes on Escape or backdrop, and
 * never changes the page — so scroll position in the project list survives.
 */
export function ProjectDrawer({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreTo = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!project) return

    restoreTo.current = document.activeElement as HTMLElement
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      // Focus trap — without it, tabbing walks into the page behind.
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      restoreTo.current?.focus()
    }
  }, [project, onClose])

  if (!project) return null

  const metrics = metricsFor(project)
  const links = Object.entries(project.links).filter(([, v]) => v)

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 animate-fade-in bg-neutral-900/50"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={project.title}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 top-12 animate-slide-in-up overflow-y-auto rounded-t-lg bg-bg p-6 outline-none sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[620px] sm:max-w-full sm:animate-slide-in-right sm:rounded-none sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {project.featured && <Tag tone="accent">Flagship</Tag>}
            <TypeTag type={project.type} />
            <StatusTag status={project.status} />
          </div>
          <IconButton label="Close" onClick={onClose} className="shrink-0 bg-surface">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </IconButton>
        </div>

        <h2 className="text-h2">{project.title}</h2>
        <p className="mt-2 text-small text-muted">
          {project.subtitle} · {formatRange(project.startDate, project.endDate)}
        </p>

        <p className="mt-4 text-body-lg">{project.shortDescription}</p>

        {metrics.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-6">
            {metrics.map((m) => (
              <MetricBlock key={m.label} value={m.value} label={m.label} />
            ))}
          </div>
        )}

        {project.images[0] && (
          <Washed
            src={project.images[0]}
            alt={`${project.title} interface`}
            sizes="(min-width: 640px) 556px, calc(100vw - 48px)"
            className="mt-6 aspect-[16/10] w-full"
          />
        )}

        {project.problem && (
          <div className="mt-8">
            <Kicker>The problem</Kicker>
            <p className="mt-2 text-body text-muted">{project.problem}</p>
          </div>
        )}

        {project.solution && (
          <div className="mt-6">
            <Kicker>What I built</Kicker>
            <p className="mt-2 text-body text-muted">{project.solution}</p>
          </div>
        )}

        {project.myRole && (
          <div className="mt-6">
            <Kicker>My role</Kicker>
            <p className="mt-2 text-body text-muted">{project.myRole}</p>
          </div>
        )}

        {project.outcome && (
          <div className="mt-6">
            <Kicker>Outcome</Kicker>
            <p className="mt-2 text-body text-muted">{project.outcome}</p>
          </div>
        )}

        {project.achievements.length > 0 && (
          <div className="mt-6">
            <Kicker>Detail</Kicker>
            <ul className="mt-2 space-y-2">
              {project.achievements.map((a) => (
                <li key={a} className="flex gap-3 text-body text-muted">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-pill bg-accent" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8">
          <Kicker>Stack</Kicker>
          <div className="mt-3 flex flex-wrap gap-2">
            {project.technologies.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        </div>

        {links.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-4">
            {links.map(([key, href]) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="text-body font-semibold text-accent-text underline"
              >
                {LINK_LABEL[key] ?? key}
              </a>
            ))}
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  )
}
