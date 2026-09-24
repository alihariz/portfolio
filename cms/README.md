# portfolio-cms

The editor for aliharizanuari.org's content. It edits one JSON document,
`site.json`, which Caddy publishes at `/content/site.json`; the site fetches it
on every page load, so a save is live on the next reload with no build.

It runs on alielitedesk in Docker, reachable only through Tailscale. There is no
login page: Tailscale is the login.

## How it decides who may do what

| Check | Stops | Where |
|---|---|---|
| Port published on `127.0.0.1` only | Every other device on the LAN, and IPv6 | `docker-compose.yml` |
| Tailscale Serve in front (`https://…ts.net:8443`) | Anyone not on the tailnet; gives HTTPS | `tailscale serve` |
| `Tailscale-User-Login` must equal `CMS_OWNER_LOGIN` | Other people and tagged devices on the tailnet | `src/guard.mjs` |
| `Host` must be the Serve address | DNS rebinding — an attacker's domain pointed at the box | `src/guard.mjs` |
| Changes need `Sec-Fetch-Site: same-origin`, `Origin: CMS_ORIGIN` and `X-CMS: 1` | A website you visit using your own browser to post to the editor | `src/guard.mjs` |
| Every document is validated before it is written | A save that would blank or break the public page | `lib/validate-site.mjs` |
| Uploads must be real PNG/JPEG/WebP/AVIF and are re-encoded | HTML or SVG with script served from the site's own origin; EXIF/GPS leaking | `src/media.mjs` |

The owner header is only trustworthy because of the first row: if the port
were reachable from the LAN, anyone could send `Tailscale-User-Login` themselves.
Keep the `127.0.0.1:` in the port mapping.

It refuses to start without `CMS_ORIGIN` and `CMS_OWNER_LOGIN` rather than fall
back to letting anyone in. `docker logs portfolio-cms` says which is missing.

## How writes stay safe

Save, publish, restore and "new variant" all go through one function
(`write()` in `src/store.mjs`) that:

- **serialises** writes per document, so two saves never interleave;
- **checks the version** the editor saw (`If-Match`), so a second tab cannot
  silently overwrite the first — you get "changed somewhere else, reload";
- **validates** with `lib/validate-site.mjs`, the same rules CI and the editor use;
- **backs up** what it replaces, per document, to `BACKUP_DIR` — outside the
  published folder — keeping the last 30 of each;
- **writes atomically**: a uniquely named temp file, fsynced, renamed into
  place, directory fsynced. A crash or power cut leaves the old file or the new
  one, never half of each.

Everything under `CONTENT_DIR` is public. That includes variants: a variant is
a draft anyone can open at `/?v=<name>`, not a private copy.

## Developing

```bash
cd cms
npm ci
npm test                      # guard, writes, uploads — about 3 s
cd .. && npm test             # renders the site with ~2,800 mutated documents
```

To run it locally, it needs the same environment as on the box:

```bash
CMS_ORIGIN=https://localhost:8443 CMS_OWNER_LOGIN=you@github \
CONTENT_DIR=/tmp/content BACKUP_DIR=/tmp/backups node server.js
```

Requests must then carry `Tailscale-User-Login: you@github`, and changes the
headers the editor sends; `test/helpers.mjs` shows exactly what.

## Deploying

The first time, on alielitedesk. Each step is safe to stop after; the old
container keeps running until step 7.

**0. Tailscale Serve** — if not already done (Step 1 of the improvement plan):

```bash
sudo tailscale serve --bg --https=8443 http://127.0.0.1:8095
tailscale serve status                     # note the https://….ts.net:8443 address
tailscale whois --json $(tailscale ip -4 ali-acer) | grep -m1 LoginName   # note your login name
```

**1. Get the code and keep a way back**

```bash
git clone https://github.com/alihariz/portfolio.git ~/src/portfolio   # or: git -C ~/src/portfolio pull
docker tag "$(docker inspect portfolio-cms --format '{{.Image}}')" portfolio-cms:pre-hardening
cd ~/homelab
cp docker-compose.yml docker-compose.yml.bak-$(date +%F)
cp caddy/Caddyfile caddy/Caddyfile.bak-$(date +%F)
```

**2. Folders.** Backups move out of the published folder. Both are empty today.

```bash
mkdir -p ~/homelab/portfolio-backups
rmdir ~/homelab/portfolio-content/backups
```

**3. Pin the base image**

```bash
docker pull node:24-alpine >/dev/null && docker image inspect --format '{{index .RepoDigests 0}}' node:24-alpine
```

**4. Environment.** Add to `~/homelab/.env`, with your values from step 0:

```
CMS_ORIGIN=https://alielitedesk.<tailnet>.ts.net:8443
CMS_OWNER_LOGIN=<your login>
```

**5. Compose.** Replace the `portfolio-cms:` block in `docker-compose.yml`
with the one in `deploy/docker-compose.portfolio-cms.yml`, paste the digest
from step 3, and add `cms: {}` under the top-level `networks:`.

```bash
docker compose config --quiet && echo compose-ok
```

**6. Caddy.** Replace the `/content/*` and `/media/*` blocks with
`deploy/Caddyfile.snippet`, then:

```bash
docker exec caddy caddy validate --config /etc/caddy/Caddyfile
docker exec caddy caddy reload  --config /etc/caddy/Caddyfile
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: aliharizanuari.org' http://127.0.0.1/content/site.json   # 200
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: aliharizanuari.org' http://127.0.0.1/content/.staging/x  # 404
```

**7. Switch over**

```bash
docker compose up -d --build portfolio-cms
docker compose ps portfolio-cms            # "healthy" after ~30 s
docker logs portfolio-cms | tail -3        # names your login and the Serve address
```

**8. Check it**

```bash
docker port portfolio-cms                                         # only 127.0.0.1:8095
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8095/api/content               # 403: no identity
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: evil.example' http://127.0.0.1:8095/  # 421
```

Then open the Serve address on your laptop. From your phone on home Wi-Fi with
Tailscale off, `http://192.168.68.105:8095` should no longer connect.

If the page says it only answers at another address, Serve is passing a
different `Host` than expected: add the one in the message to
`CMS_EXTRA_HOSTS` in `.env` and run step 7 again.

### Updating later

```bash
git -C ~/src/portfolio pull && cd ~/homelab && docker compose up -d --build portfolio-cms
```

### Rolling back

In `docker-compose.yml`, restore the backup from step 1 (or replace the
`build:` block with `image: portfolio-cms:pre-hardening`), then
`docker compose up -d portfolio-cms`. The content format is unchanged, so the
old editor reads it as before. Nothing is lost: backups made by the new
editor stay in `~/homelab/portfolio-backups`.
