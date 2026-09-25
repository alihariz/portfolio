/**
 * The server half of prerendering, built by `vite build --ssr` into
 * dist-ssr/entry-server.js with React bundled in, so it runs on plain Node with
 * no node_modules: in CI, and on the box whenever the editor saves (see
 * scripts/prerender.mjs and scripts/render-live.sh).
 */
import { renderToString } from 'react-dom/server'
import App from './App'
import { NotFound } from './components/NotFound'
import { headTags, scriptJson } from './lib/head'
import { isUsable, type Site } from './lib/site'
import { formatIssues, validateSite } from '../cms/lib/validate-site.mjs'

export { headTags, isUsable, scriptJson }

/** The page body, exactly as the browser's first render will produce it. */
export function renderApp(site: Site, year: number): string {
  return renderToString(<App initialSite={site} year={year} />)
}

export function renderNotFound(site: Site): string {
  return renderToString(<NotFound site={site} />)
}

/** The same rules the editor and CI apply, so the box never renders a document they would refuse. */
export function validate(doc: unknown): { errors: string[]; warnings: string[] } {
  const { errors, warnings } = validateSite(doc)
  return { errors: formatIssues(errors), warnings: formatIssues(warnings) }
}
