import { useEffect } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import { Nav } from './components/layout/Nav'
import { Footer } from './components/layout/Footer'
import { Hero } from './components/sections/Hero'
import { Experience } from './components/sections/Experience'
import { Projects } from './components/sections/Projects'
import { Contact } from './components/sections/Contact'
import { Certificates, Education, Leadership, Proof, Prose, Skills } from './components/sections/simple'
import { Boundary } from './components/Boundary'
import { FALLBACK, useSite, visibleSections, type Site, type Section } from './lib/site'
import { Reveal, markPageSettled } from './lib/motion'

/**
 * The page is whatever `sections` says it is, in that order. Nothing here
 * knows the site has an education section or a homelab section — it maps a
 * type to a component, so reordering or hiding one from the editor is a
 * content change rather than a code change.
 */
function renderSection(section: Section, index: string, profile: Site['profile']) {
  switch (section.type) {
    case 'proof':
      return <Proof section={section} />
    case 'experience':
      return <Experience section={section} index={index} />
    case 'projects':
      return <Projects section={section} index={index} />
    case 'education':
      return <Education section={section} index={index} />
    case 'certificates':
      return <Certificates section={section} index={index} />
    case 'skills':
      return <Skills section={section} index={index} />
    case 'leadership':
      return <Leadership section={section} index={index} />
    case 'prose':
      return <Prose section={section} index={index} />
    case 'contact':
      return <Contact profile={profile} section={section} index={index} />
    default:
      return null
  }
}

function Page({ site }: { site: Site }) {
  const sections = visibleSections(site)

  // The numbered kickers count only sections that carry one, so hiding a
  // section never leaves a gap in the sequence.
  let n = 0

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Nav profile={site.profile} sections={sections} />
      <main id="main">
        <Hero profile={site.profile} />
        {sections.map((s) => {
          const numbered = s.type !== 'proof'
          const index = numbered ? String(++n).padStart(2, '0') : ''
          // One boundary per section: a section the page cannot draw is left
          // out, and everything else still renders.
          return (
            <Boundary key={s.id} where={`section "${s.id}"`} resetKey={s}>
              <Reveal>{renderSection(s, index, site.profile)}</Reveal>
            </Boundary>
          )
        })}
      </main>
      <Footer profile={site.profile} />
    </div>
  )
}

/** Shown only if even the bundled copy cannot be drawn. */
function Unavailable() {
  const email = typeof FALLBACK.profile?.email === 'string' ? FALLBACK.profile.email : ''
  return (
    <main className="shell flex min-h-screen flex-col justify-center py-16">
      <h1 className="text-h2 sm:text-h2-lg">This page could not be displayed.</h1>
      <p className="mt-3 max-w-prose text-body-lg text-muted">
        Please reload in a moment.{' '}
        {email && (
          <>
            Or write to <a className="font-semibold text-accent-text underline" href={`mailto:${email}`}>{email}</a>.
          </>
        )}
      </p>
    </main>
  )
}

function App() {
  const { site, fallBack } = useSite()

  useEffect(markPageSettled, [])

  return (
    <ThemeProvider>
      {/* If the header, hero or footer cannot draw this document, fall back to
          the bundled copy: slightly stale content instead of a white page. */}
      <Boundary where="page" resetKey={site} onError={site === FALLBACK ? undefined : fallBack} fallback={<Unavailable />}>
        <Page site={site} />
      </Boundary>
    </ThemeProvider>
  )
}

export default App
