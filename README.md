# aliharizanuari.org

Personal site. React 18 + TypeScript + Vite + Tailwind, no runtime dependencies
beyond React itself. Served as static files from a homelab box behind a
Cloudflare Tunnel.

```bash
npm ci
npm run dev        # http://localhost:3000
npm run build      # images, tsc, vite build, SSR build, prerender -> dist/ and dist-ssr/
npm test           # render test, prerender + hydration, CSP hash
npm run lint
npm run validate   # check src/data/site.json against schemaVersion 2
```

## How the page is assembled

The whole site is one document: **`src/data/site.json`** (`schemaVersion: 2`).
It carries `meta`, `profile`, and a `sections` array; each section has an `id`,
a `type`, a `title`, a `navLabel`, a `visible` flag and its `items`.

`App.tsx` maps `type` → component and renders the array in order, so **reordering
or hiding a section is a content change, not a code change**. The nine types it
can render are `proof, experience, projects, education, certificates, skills,
leadership, prose, contact`.

`renderSection()` ends in `default: return null`, which means a mistyped `type`
drops the section silently. `scripts/validate-site-json.mjs` exists to catch
that — it reads the valid type list out of `App.tsx` so it cannot drift.

## The HTML is the page

`index.html` is prerendered: the real components, rendered to HTML by
`vite build --ssr` and `scripts/prerender.mjs`, with a `<head>` (title,
description, Open Graph, schema.org) written from the same document. Crawlers,
link previews and visitors without JavaScript get the whole page; everyone else
sees it before React has loaded, and React then hydrates it rather than drawing
it again. The document the page was rendered from is embedded as
`<script id="site-data">`, so the browser starts from exactly the same data.

Every section sits in an error boundary: a section that cannot be drawn is left
out, and if the header cannot be drawn the page falls back to the bundled copy
instead of going blank.

## Content is edited live, not deployed

On the box, `index.html` is re-rendered from the editor's `site.json` every
time it is saved (`scripts/render-live.sh`, run by a systemd path unit), so the
HTML shows live content within seconds. In the browser, `src/lib/site.ts` also
fetches `/content/site.json` after load and swaps it in if it is newer. If that
endpoint is down, what the HTML showed stands.

That endpoint is written by the editor in [`cms/`](cms/README.md), running on
the homelab behind Tailscale Serve (loopback-bound, owner-only, no route on the
tunnel). It validates every document with the same rules as CI before writing
it, so **text and image changes need no build and no deploy** — save in the
editor and reload. Only code and styling go through CI.

`?v=<name>` loads `/content/site.<name>.json` for per-audience variants.

## Deploying

Push to `main`. `.github/workflows/deploy.yml` typechecks, lints, validates
`site.json`, runs the tests and builds on a GitHub runner, then a self-hosted
runner on the homelab installs the artifact, re-renders it with the live
content and verifies it, rolling back on its own if the site does not answer.

See **[docs/DEPLOY.md](docs/DEPLOY.md)** for setup, rollback, and the reasoning
behind the parts that look fussy.

## Design

Built on the "Organic" design system: cream `#f5ead8`, terracotta `#c67139`,
sage `#7a8a5e`, Caprasimo over Figtree (self-hosted through Fontsource; only
Caprasimo 400 and Figtree 400/600 are loaded).

Pictures under `public/assets/images/` are the originals. `npm run build`
generates AVIF and WebP copies at 400/800/1200 px in `public/assets/img/`
(not in git), and `<Picture>` serves them through `srcset`. To change the
hero portrait, commit a square photo as `public/assets/images/profile.jpg`,
or upload one in the editor; until then the hero uses the GitHub avatar.

`og.png` and the icons in `public/` are drawn by
`scripts/make-brand-assets.mjs`; re-run it if the name or headline changes.

One deliberate deviation: primary buttons use `accent-700`, not the base accent.
Cream on `#c67139` is 3.30:1, below AA for a 15px label; step 700 is 6.22:1.
Re-check contrast after any colour change.
