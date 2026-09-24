# Deploying aliharizanuari.org

How a commit becomes the live site, and what to do when it goes wrong.

## The shape of it

```
  git push (default branch)
        │
        ├─ job: ci ────────────────────── GitHub-hosted runner
        │     npm ci
        │     tsc --noEmit
        │     eslint
        │     validate-site-json.mjs      <- the CMS's own validator, plus App.tsx drift
        │     npm test                    <- renders ~2,800 mutated documents
        │     vite build
        │     stamp dist/version.json
        │     upload artifact
        │
        ├─ job: cms ───────────────────── GitHub-hosted runner
        │     cms: npm ci && npm test     <- guard, uploads, write path
        │
        └─ job: deploy (needs ci + cms) ─ self-hosted runner on alielitedesk
              download artifact           <- never rebuilds; installs what CI tested
              rsync -> caddy/releases/<sha>
              rsync --delete -> caddy/landing
              curl -H 'Host: aliharizanuari.org' 127.0.0.1
              rollback automatically if that fails
```

**The runner polls GitHub outbound.** Nothing is exposed, no router ports are
opened, no SSH key lives in GitHub secrets, and the Cloudflare Tunnel config is
untouched. This is the only shape that works given the box has no inbound path.

**`deploy` never runs for a pull request.** The `if:` guard on that job restricts
it to pushes on the default branch, which require write access. `ci` runs on
GitHub's hardware, so a fork PR never executes anything on the homelab. Do not
loosen that guard — a self-hosted runner on a public repo is otherwise a way for
a stranger to run code on your machine.

## What is *not* in this pipeline, on purpose

Content lives in `portfolio-content/` on the box and is edited through the CMS
on `alielitedesk:8095`. Caddy serves it at `/content/*` with `no-store`, and
`src/lib/site.ts` swaps it in over the bundled copy at runtime.

**So text and image changes need no deploy at all — save in the CMS and reload.**
Only code, styling and the bundled fallback copy of `site.json` go through here.

---

## One-time setup

### 1. Reconcile the repo with what is live

Do this before anything else. The last stretch of work moved as zip files, so
GitHub may be behind the deployed site. Wiring CI to a stale repo means the
first green build ships a regression.

```powershell
cd D:\dev
git clone https://github.com/alihariz/portfolio.git
cd portfolio
git log --oneline -5
```

Then compare the working tree against the last known-good handoff
(`portfolio-src.zip`, 2026-08-13) before committing anything.

### 2. Install the runner on alielitedesk

Get the exact commands — they include a current version number and a
single-use token — from:

**GitHub → the repo → Settings → Actions → Runners → New self-hosted runner → Linux**

Then follow them on the box with two changes:

```bash
sudo apt install -y rsync curl          # deploy-portfolio.sh needs both

mkdir -p ~/actions-runner && cd ~/actions-runner
# ... curl + tar lines copied from the GitHub page ...

# Add the `homelab` label - the workflow targets [self-hosted, homelab].
./config.sh --url https://github.com/alihariz/portfolio \
            --token <TOKEN-FROM-THAT-PAGE> \
            --name alielitedesk \
            --labels homelab \
            --work _work

# Run it as a service so it survives reboots, as your own user so it can
# write to caddy/landing without sudo.
sudo ./svc.sh install "$USER"
sudo ./svc.sh start
sudo ./svc.sh status
```

Confirm it shows **Idle** under Settings → Actions → Runners.

### 3. Create the releases directory

```bash
mkdir -p /home/ali/homelab/caddy/releases
```

Do **not** recreate `caddy/landing` — it is bind-mounted into the caddy
container, and replacing the directory leaves Caddy serving a deleted inode.

### 4. Harden the repo

- Settings → Actions → General → **Fork pull request workflows** → require
  approval for **all** external contributors.
- Settings → Branches → protect the default branch: require the `ci` check to
  pass before merging.
- Optional: Settings → Environments → `production` → add yourself as a required
  reviewer if you want deploys to pause for a click.

### 5. Add the pipeline and push

```
.github/workflows/deploy.yml
scripts/validate-site-json.mjs
scripts/deploy-portfolio.sh
scripts/rollback-portfolio.sh
docs/DEPLOY.md
```

Run the validator locally first — if `src/data/site.json` has drifted, better to
find out now than in CI:

```bash
node scripts/validate-site-json.mjs src/data/site.json
```

### 6. Optional: stop Cloudflare caching the version stamp

The smoke test hits Caddy directly so it is unaffected, but if you want
`/version.json` to be honest from the outside, add this inside the
`aliharizanuari.org` site block's `handle`:

```caddyfile
@version path /version.json
header @version Cache-Control "no-store"
```

---

## Day to day

```powershell
git switch -c tweak-hero
# edit
git commit -am "Hero: tighten the intro"
git push -u origin tweak-hero
```

Open a PR. `ci` runs — typecheck, lint, schema, build. Merge when green;
the deploy runs itself and the site is live in about a minute.

Small changes can go straight to the default branch. Same checks run, and
`deploy` is still gated on `ci` passing, so a broken build never reaches Caddy.

## When it breaks

**A deploy failed the smoke test.** It already rolled itself back — the site is
serving the previous release. Read the job log for the HTTP code.

**The site is bad but the deploy went green.** Roll back by hand on the box:

```bash
bash /path/to/repo/scripts/rollback-portfolio.sh            # list releases
bash /path/to/repo/scripts/rollback-portfolio.sh previous   # go back one
bash /path/to/repo/scripts/rollback-portfolio.sh <sha>      # go back further
```

`previous` means *the release that served traffic before the current one*, read
from `caddy/releases/history`. Running it twice in a row therefore flips between
the last two releases rather than walking backwards — to go further back, name a
sha from the listing.

Then push a revert commit, or the next deploy reinstates the bad build.

**What is actually live?**

```bash
curl -s -H 'Host: aliharizanuari.org' http://127.0.0.1/version.json
cat /home/ali/homelab/caddy/releases/current      # live release
tail -5 /home/ali/homelab/caddy/releases/history  # what has served, in order
ls -d /home/ali/homelab/caddy/releases/*.failed.* # builds that never verified
```

**The runner is offline.** `sudo ~/actions-runner/svc.sh status`, then
`journalctl -u actions.runner.* -n 50`. After a long power-off, check Tailscale
too — the node key expires and `tailscaled` sits in `NeedsLogin`.

**Deploy fails with "not writable".** The runner service must run as the user
that owns `caddy/landing`. Reinstall the service with `sudo ./svc.sh install ali`.

## Deliberate design choices

| Choice | Why |
|---|---|
| `rsync --delete`, never `rm -rf landing/*` | Preserves the bind-mounted inode and leaves no window where the site is empty or half-copied. |
| `rsync --checksum` into `landing` | rsync's default quick-check is size + mtime at one-second resolution. `index.html` and `version.json` keep the same size between builds, so two deploys in the same second are silently skipped — the release directory is right while the live site serves stale bytes. Found by testing this script, not hypothetical. |
| Deploy installs an artifact, never rebuilds | The bytes that were tested are the bytes that ship, and the EliteDesk does not spend CPU on a Vite build. |
| Every release kept under `caddy/releases/<sha>` | Rollback is a one-second rsync from disk, not a rebuild that needs the network. |
| Rollback targets come from `releases/history`, never directory mtime | A build is staged before it is verified, so a build that *failed* is the newest directory on disk. Picking a rollback target by timestamp deploys the exact build that just failed — caught in testing. `history` records only what actually served traffic, and failed builds are parked as `<sha>.failed.<ts>`, which the rollback script refuses. |
| Preflight refuses a dist without `index.html` | An empty artifact plus `--delete` would erase the live site. This is the guard that matters most. |
| Smoke test uses `Host:` against `127.0.0.1` | Bypasses Cloudflare, so a pass proves the box is serving the new build rather than an edge cache. |
| Section types read out of `App.tsx` | `renderSection()` returns `null` for an unknown type, so a typo drops a section with no error. The validator cannot drift from the switch. |
