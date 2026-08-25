import { useEffect, useState } from 'react'
import { useTheme } from '../../hooks/useTheme'
import type { Profile, Section } from '../../lib/site'
import { Button, IconButton } from '../ui/primitives'

// Nav is derived from whatever sections are visible, so hiding one from the
// editor removes its link too — no second list to keep in sync. Capped at
// four so the pill never wraps.
function navLinks(sections: Section[]) {
  return sections
    .filter((s) => s.navLabel)
    .slice(0, 5)
    .map((s) => ({ href: `#${s.id}`, label: s.navLabel as string }))
}

function SunMoon({ dark }: { dark: boolean }) {
  return dark ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}

export function Nav({ profile, sections }: { profile: Profile; sections: Section[] }) {
  const { theme, toggleTheme } = useTheme()
  const LINKS = navLinks(sections)
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // The mobile sheet owns the screen while open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-pill focus:bg-accent focus:px-6 focus:py-3 focus:text-neutral-100"
      >
        Skip to content
      </a>

      <header className="fixed inset-x-0 top-0 z-40 px-4 pt-4 sm:px-8 sm:pt-6">
        <nav
          aria-label="Primary"
          className={`mx-auto flex max-w-content items-center justify-between gap-3 rounded-pill border border-divider bg-surface/90 px-4 py-2 backdrop-blur transition-shadow duration-200 sm:px-6 ${
            scrolled ? 'shadow-md' : ''
          }`}
        >
          <a href="#top" className="font-heading text-h3 leading-none">
            {profile.shortName}
          </a>

          <div className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-pill px-4 py-2 text-body font-semibold text-muted transition-colors hover:bg-accent-100 hover:text-ink dark:hover:bg-neutral-800"
              >
                {l.label}
              </a>
            ))}
            <IconButton label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} onClick={toggleTheme}>
              <SunMoon dark={theme === 'dark'} />
            </IconButton>
            <Button as="a" href={profile.links.resume} download className="ml-1 !min-h-[40px] !px-5">
              Résumé
            </Button>
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <IconButton label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} onClick={toggleTheme}>
              <SunMoon dark={theme === 'dark'} />
            </IconButton>
            <IconButton label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </IconButton>
          </div>
        </nav>
      </header>

      {/* Full-height sheet, 56px rows */}
      {open && (
        <div className="fixed inset-0 z-50 animate-fade-in bg-bg md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="flex items-center justify-between px-4 pt-6 sm:px-8">
            <span className="font-heading text-h3">{profile.shortName}</span>
            <IconButton label="Close menu" onClick={() => setOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </IconButton>
          </div>
          <ul className="mt-6 px-4 sm:px-8">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex h-14 items-center border-b border-divider font-heading text-h3"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="px-4 pt-8 sm:px-8">
            <Button as="a" href={profile.links.resume} download className="w-full">
              Résumé (PDF)
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
