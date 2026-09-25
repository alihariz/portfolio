import { startTransition, useCallback, useEffect, useState } from 'react'
import bundled from '../data/site.json'

/**
 * Content loading.
 *
 * index.html arrives already rendered, from the document embedded in it as
 * <script id="site-data">: on the box that is the content the editor last
 * saved, re-rendered on every save. So first paint, and anything that reads the
 * HTML without running JavaScript, sees the complete page. React hydrates from
 * that same document, then fetches /content/site.json and swaps it in if it is
 * newer and the schema matches. If the CMS is down, unreachable, or has never
 * been written to, what the HTML showed stands: no spinner, no error state, no
 * blank page. The bundled site.json is the last resort, for a page with no
 * embedded document (local development) or one that fails to render.
 *
 * A variant can be requested with ?v=<name>, which loads /content/site.<name>.json.
 */

export const SCHEMA_VERSION = 2

export interface Metric { value: string; label: string }

export interface Profile {
  name: string
  shortName: string
  role: string
  location: string
  email: string
  portrait?: string
  availability?: string
  headline: string
  intro: string
  links: { github?: string; linkedin?: string; resume?: string }
}

export interface Section {
  id: string
  type: 'proof' | 'experience' | 'projects' | 'education' | 'certificates' | 'skills' | 'leadership' | 'prose' | 'contact'
  title: string
  /** Short label for the nav pill; the title is usually too long. */
  navLabel?: string
  lead?: string
  body?: string
  visible: boolean
  items?: unknown[]
  categoryOrder?: string[]
}

export interface Site {
  schemaVersion: number
  meta: { title: string; description: string; domain: string }
  profile: Profile
  sections: Section[]
}

export const FALLBACK = bundled as unknown as Site

/**
 * Where content is fetched from.
 *
 * The homelab is the only place content is written, so it is the only place
 * content is read from. When this bundle is served from anywhere else — the
 * Netlify mirror, a local preview — it fetches across to the canonical origin
 * rather than looking for a /content directory that will never exist there.
 * That is what stops the mirror drifting: both hosts render the same document,
 * and if the homelab is unreachable both fall back to their bundled copy.
 *
 * Caddy sets Access-Control-Allow-Origin on /content and /media for exactly
 * this request.
 */
const CANONICAL = `https://${FALLBACK.meta.domain}`

function contentOrigin(): string {
  if (typeof window === 'undefined') return ''
  const host = window.location.hostname
  const isCanonical = host === FALLBACK.meta.domain || host === `www.${FALLBACK.meta.domain}`
  // Same-origin on the real site and during local development; absolute
  // everywhere else.
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')
  return isCanonical || isLocal ? '' : CANONICAL
}

/**
 * Media uploaded through the editor is stored as a root-relative path
 * (/media/foo.png) because that is what it is on the canonical host. Served
 * from the mirror, those paths would 404, so they are rewritten to absolute.
 */
function absolutiseMedia(doc: Site, origin: string): Site {
  if (!origin) return doc
  const fix = (v: unknown): unknown => {
    if (typeof v === 'string') return v.startsWith('/media/') ? origin + v : v
    if (Array.isArray(v)) return v.map(fix)
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, val] of Object.entries(v)) out[k] = fix(val)
      return out
    }
    return v
  }
  return fix(doc) as Site
}

function variantName(): string | null {
  if (typeof window === 'undefined') return null
  const v = new URLSearchParams(window.location.search).get('v')
  // Only simple names — this becomes part of a URL path.
  return v && /^[a-z0-9-]{1,32}$/i.test(v) ? v : null
}

export function isUsable(doc: unknown): doc is Site {
  if (!doc || typeof doc !== 'object') return false
  const d = doc as Partial<Site>
  return d.schemaVersion === SCHEMA_VERSION && Array.isArray(d.sections) && !!d.profile
}

export type Source = 'bundled' | 'embedded' | 'live'

/**
 * @param initial What the page was prerendered from (the JSON embedded in
 *   index.html), so hydration starts from exactly the document the HTML was
 *   drawn with. Falls back to the bundled copy when there is none.
 */
export function useSite(initial: Site = FALLBACK): {
  site: Site
  source: Source
  /**
   * Step back from a document the page could not draw: to the one the HTML was
   * rendered from, and from that to the bundled copy. The page's root error
   * boundary calls this.
   */
  fallBack: () => void
} {
  const [state, setState] = useState<{ site: Site; source: Source }>(() => ({
    site: initial,
    source: initial === FALLBACK ? 'bundled' : 'embedded',
  }))

  useEffect(() => {
    const v = variantName()
    const origin = contentOrigin()
    const url = `${origin}/content/${v ? `site.${v}.json` : 'site.json'}`
    const ctl = new AbortController()
    // Short timeout: a slow or hanging CMS must never hold up the page, since
    // we already have something good enough to show.
    const timer = setTimeout(() => ctl.abort(), 3000)

    fetch(url, { signal: ctl.signal, cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((doc) => {
        if (!isUsable(doc)) return
        // Usually the page was prerendered from this very document. Then do
        // nothing at all: any state update here, even one that changes only
        // `source`, re-renders the page, and on a slow phone that can land
        // while React is still adopting the prerendered sections, which makes
        // it throw them away and draw them again.
        if (!origin && JSON.stringify(doc) === JSON.stringify(initial)) return
        // A transition, so React finishes adopting the prerendered HTML before
        // it redraws anything with the newer content.
        startTransition(() => setState({ site: absolutiseMedia(doc, origin), source: 'live' }))
      })
      .catch(() => {
        /* what the page already shows stands */
      })
      .finally(() => clearTimeout(timer))

    return () => {
      clearTimeout(timer)
      ctl.abort()
    }
  }, [initial])

  const fallBack = useCallback(() => {
    setState((s) => {
      if (s.site !== initial && initial !== FALLBACK) return { site: initial, source: 'embedded' }
      return s.site === FALLBACK ? s : { site: FALLBACK, source: 'bundled' }
    })
  }, [initial])

  return { site: state.site, source: state.source, fallBack }
}

/** Visible sections in author order. */
export function visibleSections(site: Site): Section[] {
  return site.sections.filter((s) => s.visible)
}
