import { useEffect, useState } from 'react'
import type { Profile } from '../../lib/site'

/**
 * `year` is the year the HTML was prerendered in. Starting from it keeps
 * hydration exact even on a page rendered last December; the effect then
 * moves it to the visitor's current year.
 */
export function Footer({ profile, year }: { profile: Profile; year?: number }) {
  const [shownYear, setShownYear] = useState(() => year ?? new Date().getFullYear())
  useEffect(() => setShownYear(new Date().getFullYear()), [])

  return (
    <footer className="shell border-t border-divider py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 text-small text-muted">
        <p>© {shownYear} {profile.name}</p>
        <p>Self-hosted on an HP EliteDesk 800 G2 Mini in Malaysia</p>
      </div>
    </footer>
  )
}
