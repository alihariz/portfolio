/**
 * Collapse the seven data files into one site.json.
 *
 * Why one file: the editor has to reorder sections, hide them, and keep
 * several audience variants. Doing that across seven documents means seven
 * writes to keep in sync and no single place that describes the page. One
 * document with a `sections` array is the whole page, in order, and a variant
 * is just a copy of it.
 *
 * Run:  node scripts/build-site-json.mjs
 * Writes src/data/site.json, which is bundled as the fallback and also the
 * seed for the CMS's editable copy.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const data = (f) => JSON.parse(readFileSync(resolve(here, '../src/data', f), 'utf8'))

const profile = data('profile.json')
const projects = data('projects.json')
const experience = data('experience.json')
const education = data('education.json')
const certificates = data('certificates.json')
const skills = data('skills.json')
const leadership = data('leadership.json')

const site = {
  // Bumped whenever the shape changes, so the app can refuse a stale document
  // rather than rendering something half-broken.
  schemaVersion: 2,
  meta: {
    title: 'Ali Hariz Anuari',
    description:
      'Software engineer in Malaysia. Road-hazard detection with computer vision, ' +
      'a decade-old finance tool rebuilt for the browser, and a homelab that runs it all.',
    domain: 'aliharizanuari.org',
  },
  profile: {
    name: profile.personal.name,
    shortName: 'Ali Hariz',
    role: 'Software engineer',
    location: profile.personal.location,
    email: profile.personal.email,
    portrait: profile.personal.profileImage,
    availability: profile.personal.availability,
    headline: profile.personal.headline,
    intro: profile.personal.intro,
    links: {
      github: profile.social.github,
      linkedin: profile.social.linkedin,
      resume: profile.social.resume,
    },
  },
  sections: [
    { id: 'proof',        type: 'proof',        title: '',                       visible: true, items: profile.proof },
    { id: 'experience',   type: 'experience',   title: 'Where I have worked',    visible: true, items: experience.experience },
    { id: 'projects',     type: 'projects',     title: 'Things I have built',    visible: true,
      lead: 'Every row opens with the one I would show you first.',
      items: projects.projects, categoryOrder: projects.categories.filter((c) => c !== 'All') },
    { id: 'education',    type: 'education',    title: 'Where I trained',        visible: true, items: education.education },
    { id: 'certificates', type: 'certificates', title: 'Assessed on',            visible: true, items: certificates.certificates },
    { id: 'skills',       type: 'skills',       title: 'What I work with',       visible: true, items: skills.skillCategories },
    { id: 'leadership',   type: 'leadership',   title: 'Elsewhere on campus',    visible: true, items: leadership.leadership },
    // Off by default — turn on from the editor when there is something to say.
    { id: 'homelab',      type: 'prose',        title: 'The homelab',            visible: false,
      body: 'An HP EliteDesk 800 G2 Mini in Negeri Sembilan running everything on this domain: '
          + 'Docker Compose behind Caddy, exposed through a Cloudflare Tunnel with no ports open on the router, '
          + 'reached privately over Tailscale. It hosts this site, HARDA, Nextcloud, uptime monitoring and a '
          + 'Minecraft server, and backs itself up nightly.' },
    { id: 'writing',      type: 'prose',        title: 'Writing',                visible: false, body: '' },
    { id: 'contact',      type: 'contact',      title: 'Get in touch',           visible: true,
      lead: 'Happy to talk about any of this — the projects, the homelab, or something you are working on.' },
  ],
}

writeFileSync(resolve(here, '../src/data/site.json'), JSON.stringify(site, null, 2) + '\n')
console.log('site.json written —', site.sections.length, 'sections,', projects.projects.length, 'projects')
