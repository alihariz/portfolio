import type { Profile } from '../../lib/site'

export function Footer({ profile }: { profile: Profile }) {
  return (
    <footer className="shell border-t border-divider py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 text-small text-muted">
        <p>© {new Date().getFullYear()} {profile.name}</p>
        <p>Self-hosted on an HP EliteDesk 800 G2 Mini in Malaysia</p>
      </div>
    </footer>
  )
}
