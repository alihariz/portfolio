import React from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
// Self-hosted, and only the three faces the design uses. Loading them from
// Google Fonts through an @import in the stylesheet cost about 750 ms of
// render blocking on mobile: HTML, then CSS, then Google's CSS, then the fonts.
import '@fontsource/caprasimo/400.css'
import '@fontsource/figtree/400.css'
import '@fontsource/figtree/600.css'
import './styles/index.css'
import App from './App.tsx'
import { isUsable, type Site } from './lib/site'

/** The document index.html was prerendered from, if it was. */
function embedded(): { site: Site; year?: number } | null {
  const el = document.getElementById('site-data')
  if (!el?.textContent) return null
  try {
    const site: unknown = JSON.parse(el.textContent)
    return isUsable(site) ? { site, year: Number(el.dataset.year) || undefined } : null
  } catch {
    return null
  }
}

const container = document.getElementById('root')!
const data = embedded()
const app = (
  <React.StrictMode>
    <App initialSite={data?.site} year={data?.year} />
  </React.StrictMode>
)

if (data && container.firstElementChild) {
  // Attach to the HTML that is already on screen instead of drawing it again.
  hydrateRoot(container, app, {
    onRecoverableError: (error) =>
      console.warn('[site] The prerendered HTML did not match; React redrew the page in the browser.', error),
  })
} else {
  // No prerendered page: local development, or a build that skipped it.
  createRoot(container).render(app)
}
