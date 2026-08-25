# aliharizanuari.org

Personal site. React 18 + TypeScript + Vite + Tailwind, no runtime dependencies
beyond React itself. Served as static files from a homelab box behind a
Cloudflare Tunnel.

```bash
npm ci
npm run dev        # http://localhost:3000
npm run build      # tsc && vite build -> dist/
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

## Content is edited live, not deployed

`src/lib/site.ts` renders the bundled copy of `site.json` first — so first paint
and SEO never wait on the network — then fetches `/content/site.json` and swaps
it in if the schema matches. If that endpoint is down, the bundled copy stands.

That endpoint is written by a small editor running on the homelab
(`alielitedesk:8095`, reachable over Tailscale only, no route on the tunnel).
**So text and image changes need no build and no deploy** — save in the editor
and reload. Only code and styling go through CI.

`?v=<name>` loads `/content/site.<name>.json` for per-audience variants.

## Deploying

Push to `main`. `.github/workflows/deploy.yml` typechecks, lints, validates
`site.json` and builds on a GitHub runner, then a self-hosted runner on the
homelab installs the artifact and verifies it, rolling back on its own if the
site does not answer.

See **[docs/DEPLOY.md](docs/DEPLOY.md)** for setup, rollback, and the reasoning
behind the parts that look fussy.

## Design

Built on the "Organic" design system: cream `#f5ead8`, terracotta `#c67139`,
sage `#7a8a5e`, Caprasimo over Figtree.

One deliberate deviation: primary buttons use `accent-700`, not the base accent.
Cream on `#c67139` is 3.30:1, below AA for a 15px label; step 700 is 6.22:1.
Re-check contrast after any colour change.
