import { FALLBACK, type Site } from './site'
import { portraitChain } from './images'

/**
 * Everything in <head> that depends on content, from one place.
 *
 * Before this, the title and description were typed into index.html by hand,
 * so the "meta" fields in the editor never reached search results or link
 * previews, and the head drifted from the page (it still said "graduating
 * October 2026"). Now the prerender writes the head from the same document
 * the page is drawn from, and the page keeps document.title in step when a
 * different document is swapped in.
 */

const DOMAIN_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i

/** Written by scripts/make-brand-assets.mjs; kept in public/. */
export const OG_IMAGE = { path: '/og.png', width: 1200, height: 630, type: 'image/png' }

export function canonicalOrigin(site: Site): string {
  const d = site.meta?.domain
  return `https://${(typeof d === 'string' && DOMAIN_RE.test(d) ? d : FALLBACK.meta.domain).toLowerCase()}`
}

/** "Ali Hariz Anuari — Software engineer": the name alone says nothing in a list of results. */
export function pageTitle(site: Site): string {
  const title = site.meta.title.trim()
  const role = site.profile.role?.trim()
  return role && !title.toLowerCase().includes(role.toLowerCase()) ? `${title} — ${role}` : title
}

export function pageDescription(site: Site): string {
  return site.meta.description.trim()
}

const absolute = (origin: string, url: string) => (url.startsWith('/') ? origin + url : url)

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** JSON that is safe inside a <script> element: no "</script>", no "<!--". */
export function scriptJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

interface Item {
  institution?: unknown
  skills?: { name?: unknown }[]
}

/** schema.org Person and WebSite, for search engines' knowledge panels. */
export function structuredData(site: Site): object {
  const origin = canonicalOrigin(site)
  const p = site.profile
  const portrait = portraitChain(p)[0]
  const sameAs = [p.links.github, p.links.linkedin].filter((u): u is string => typeof u === 'string' && u.startsWith('https://'))
  const itemsOf = (type: string) =>
    site.sections.filter((s) => s.visible && s.type === type).flatMap((s) => (Array.isArray(s.items) ? (s.items as Item[]) : []))
  const schools = [...new Set(itemsOf('education').map((e) => e.institution).filter((i): i is string => typeof i === 'string' && !!i))]
  const skills = itemsOf('skills')
    .flatMap((c) => (Array.isArray(c.skills) ? c.skills : []))
    .map((s) => s?.name)
    .filter((n): n is string => typeof n === 'string' && !!n)
    .slice(0, 20)

  const person: Record<string, unknown> = {
    '@type': 'Person',
    '@id': `${origin}/#person`,
    name: p.name,
    url: `${origin}/`,
    jobTitle: p.role,
    description: pageDescription(site),
  }
  if (p.shortName && p.shortName !== p.name) person.alternateName = p.shortName
  if (portrait) person.image = absolute(origin, portrait)
  if (p.email) person.email = p.email
  if (p.location) person.homeLocation = { '@type': 'Place', name: p.location }
  if (sameAs.length) person.sameAs = sameAs
  if (schools.length) person.alumniOf = schools.map((name) => ({ '@type': 'CollegeOrUniversity', name }))
  if (skills.length) person.knowsAbout = skills

  return {
    '@context': 'https://schema.org',
    '@graph': [
      person,
      { '@type': 'WebSite', '@id': `${origin}/#website`, url: `${origin}/`, name: site.meta.title, about: { '@id': `${origin}/#person` } },
    ],
  }
}

/** The content-dependent part of <head>, as HTML. */
export function headTags(site: Site): string {
  const origin = canonicalOrigin(site)
  const url = `${origin}/`
  const title = pageTitle(site)
  const description = pageDescription(site)
  const image = origin + OG_IMAGE.path
  const imageAlt = `${site.profile.name} — ${site.profile.headline || site.profile.role}`

  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta name="author" content="${esc(site.profile.name)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${esc(site.meta.title)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:locale" content="en_MY" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:type" content="${OG_IMAGE.type}" />`,
    `<meta property="og:image:width" content="${OG_IMAGE.width}" />`,
    `<meta property="og:image:height" content="${OG_IMAGE.height}" />`,
    `<meta property="og:image:alt" content="${esc(imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    `<meta name="twitter:image:alt" content="${esc(imageAlt)}" />`,
    `<script type="application/ld+json">${scriptJson(structuredData(site))}</script>`,
  ]
  return tags.join('\n    ')
}
