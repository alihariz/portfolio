import { useEffect, useState } from 'react'
import bundled from '../data/site.json'

/**
 * Content loading.
 *
 * The bundled site.json renders immediately — so first paint, and anything
 * that reads the HTML without running JavaScript, sees a complete page. Then
 * we fetch /content/site.json, which the CMS writes, and swap it in if it is
 * present and the schema matches. If the CMS is down, unreachable, or has
 * never been written to, the site is simply the bundled version: no spinner,
 * no error state, no blank page.
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

const FALLBACK = bundled as unknown as Site

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

function isUsable(doc: unknown): doc is Site {
  if (!doc || typeof doc !== 'object') return false
  const d = doc as Partial<Site>
  return d.schemaVersion === SCHEMA_VERSION && Array.isArray(d.sections) && !!d.profile
}

export function useSite(): { site: Site; source: 'bundled' | 'live' } {
  const [site, setSite] = useState<Site>(FALLBACK)
  const [source, setSource] = useState<'bundled' | 'live'>('bundled')

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
        if (isUsable(doc)) {
          setSite(absolutiseMedia(doc, origin))
          setSource('live')
        }
      })
      .catch(() => {
        /* bundled copy stands */
      })
      .finally(() => clearTimeout(timer))

    return () => {
      clearTimeout(timer)
      ctl.abort()
    }
  }, [])

  return { site, source }
}

/** Visible sections in author order. */
export function visibleSections(site: Site): Section[] {
  return site.sections.filter((s) => s.visible)
}
