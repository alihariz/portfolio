import { ThemeProvider } from './contexts/ThemeContext'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { Hero } from './components/sections/Hero'
import { About } from './components/sections/About'
import { Education } from './components/sections/Education'
import { Experience } from './components/sections/Experience'
import { Projects } from './components/sections/Projects'
import { Skills } from './components/sections/Skills'
import { Certificates } from './components/sections/Certificates'
import { Leadership } from './components/sections/Leadership'
import { Contact } from './components/sections/Contact'
import { BackToTop } from './components/ui/BackToTop'

function App() {
  return (
    <ThemeProvider>
      <div className="app-shell min-h-screen bg-background-light dark:bg-background-dark text-text-primary-light dark:text-text-primary-dark transition-colors duration-300">
        <Header />
        <main id="main-content" role="main">
          <Hero />
          <About />
          <Projects />
          <Skills />
          <Experience />
          <Education />
          <Certificates />
          <Leadership />
          <Contact />
        </main>
        <Footer />
        <BackToTop />
      </div>
    </ThemeProvider>
  )
}

export default App
