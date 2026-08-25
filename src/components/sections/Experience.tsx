import { formatRange } from '../../lib/content'
import type { Section } from '../../lib/site'
import { SectionHeader, Tag } from '../ui/primitives'

interface Accomplishment {
  title: string
  description: string
  impact?: string
  technologies?: string[]
}

/**
 * One role, several distinct deliverables. Rather than a timeline — which
 * implies a sequence there isn't much of — the role sits left and its
 * accomplishments stack as cards on the right, so what was actually built
 * gets the width.
 */
interface Role {
  id: string
  company: string
  position: string
  department?: string
  location?: string
  startDate?: string
  endDate?: string
  accomplishments?: Accomplishment[]
}

export function Experience({ section, index }: { section: Section; index: string }) {
  const roles = (section.items ?? []) as Role[]
  return (
    <section className="shell py-16">
      <SectionHeader id={section.id} index={index} label="Experience" title={section.title} lead={section.lead} />

      {roles.map((role) => {
        const accomplishments = (role.accomplishments ?? []) as Accomplishment[]
        const primary = accomplishments.slice(0, 3)
        const extra = accomplishments.slice(3)

        return (
          <div key={role.id} className="grid gap-8 lg:grid-cols-[280px_1fr] lg:gap-16">
            <div>
              <h3 className="text-h3 sm:text-h3-lg">{role.position.replace(/\s*-\s*/, ', ')}</h3>
              <p className="mt-2 text-body font-semibold">{role.company.replace(/\s*\(.*\)$/, '')}</p>
              <p className="mt-2 text-small text-muted">{role.department}</p>
              <p className="mt-1 text-small text-muted">
                {role.location} · {formatRange(role.startDate, role.endDate, false)}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {[...new Set(primary.flatMap((a) => a.technologies ?? []))].slice(0, 4).map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {primary.map((a) => (
                <article key={a.title} className="rounded-lg bg-surface p-6">
                  <h4 className="text-h3 leading-tight">{a.title}</h4>
                  <p className="mt-2 text-body text-muted">{a.impact || a.description}</p>
                </article>
              ))}

              {extra.length > 0 && (
                <p className="rounded-lg border border-divider p-6 text-small text-muted">
                  Also: {extra.map((a) => a.title).join(' · ')}.
                </p>
              )}
            </div>
          </div>
        )
      })}
    </section>
  )
}
