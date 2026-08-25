import { ThemeProvider } from './contexts/ThemeContext'
import { Nav } from './components/layout/Nav'
import { Footer } from './components/layout/Footer'
import { Hero } from './components/sections/Hero'
import { Experience } from './components/sections/Experience'
import { Projects } from './components/sections/Projects'
import { Contact } from './components/sections/Contact'
import { Certificates, Education, Leadership, Proof, Prose, Skills } from './components/sections/simple'
import { useSite, visibleSections, type Section } from './lib/site'
import { Reveal } from './lib/motion'

/**
 * The page is whatever `sections` says it is, in that order. Nothing here
 * knows the site has an education section or a homelab section — it maps a
 * type to a component, so reordering or hiding one from the editor is a
 * content change rather than a code change.
 */
function renderSection(section: Section, index: string, profile: ReturnType<typeof useSite>['site']['profile']) {
  switch (section.type) {
    case 'proof':
      return <Proof key={section.id} section={section} />
    case 'experience':
      return <Experience key={section.id} section={section} index={index} />
    case 'projects':
      return <Projects key={section.id} section={section} index={index} />
    case 'education':
      return <Education key={section.id} section={section} index={index} />
    case 'certificates':
      return <Certificates key={section.id} section={section} index={index} />
    case 'skills':
      return <Skills key={section.id} section={section} index={index} />
    case 'leadership':
      return <Leadership key={section.id} section={section} index={index} />
    case 'prose':
      return <Prose key={section.id} section={section} index={index} />
    case 'contact':
      return <Contact key={section.id} profile={profile} section={section} index={index} />
    default:
      return null
  }
}

function App() {
  const { site } = useSite()
  const sections = visibleSections(site)

  // The numbered kickers count only sections that carry one, so hiding a
  // section never leaves a gap in the sequence.
  let n = 0

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-bg text-ink">
        <Nav profile={site.profile} sections={sections} />
        <main id="main">
          <Hero profile={site.profile} />
          {sections.map((s) => {
            const numbered = s.type !== 'proof'
            const index = numbered ? String(++n).padStart(2, '0') : ''
            return (
              <Reveal key={s.id}>{renderSection(s, index, site.profile)}</Reveal>
            )
          })}
        </main>
        <Footer profile={site.profile} />
      </div>
    </ThemeProvider>
  )
}

export default App
