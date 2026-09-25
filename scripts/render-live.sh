#!/usr/bin/env bash
#
# Re-render aliharizanuari.org's index.html from the content the editor saved.
#
# CI prerenders the page from the bundled src/data/site.json. The live content
# is whatever the editor last wrote to portfolio-content/site.json, which is
# usually different, so the box renders the page again:
#
#   - after every deploy and rollback (deploy-portfolio.sh, rollback-portfolio.sh);
#   - whenever site.json changes (systemd: portfolio-render.path);
#   - every 10 minutes as a safety net (portfolio-render.timer), which costs
#     one sha256sum when nothing changed.
#
# It uses the renderer that shipped with the release that is live
# (portfolio-render/<sha>/), so the HTML always names that release's assets.
# A release built before prerendering existed has no renderer; then there is
# nothing to do. The render runs in a throwaway, read-only, network-less
# container on the same Node image the editor is built from, so the box needs
# no Node of its own and the renderer can write nothing but one output file.
#
# If anything fails, index.html is left as it was: the page CI rendered, which
# still loads the live content in the browser. Nothing here can take the site
# down.
#
#     bash render-live.sh           # render if site.json changed since the last render
#     FORCE=1 bash render-live.sh   # render regardless

set -euo pipefail

HOMELAB_DIR="${HOMELAB_DIR:-/home/ali/homelab}"
LANDING_DIR="${LANDING_DIR:-$HOMELAB_DIR/caddy/landing}"
RELEASES_DIR="${RELEASES_DIR:-$HOMELAB_DIR/caddy/releases}"
RENDER_DIR="${RENDER_DIR:-$HOMELAB_DIR/portfolio-render}"
CONTENT_DIR="${CONTENT_DIR:-$HOMELAB_DIR/portfolio-content}"
# The editor's base image (docker-compose.yml, portfolio-cms build args).
NODE_IMAGE="${NODE_IMAGE:-node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1}"
FORCE="${FORCE:-0}"

log()  { printf '\033[36m==>\033[0m render: %s\n' "$*"; }
fail() { printf '\033[31mERROR:\033[0m render: %s\n' "$*" >&2; exit 1; }

mkdir -p "$RENDER_DIR"

# One render at a time, and never in the middle of a deploy swapping files in:
# deploy-portfolio.sh holds this lock around its rsync and calls us with
# RENDER_LOCK_HELD=1.
if [ "${RENDER_LOCK_HELD:-0}" != 1 ]; then
  exec 9>"$RENDER_DIR/.lock"
  flock -w 300 9 || fail "another render or deploy has held the lock for 5 minutes"
fi

sha="$(cat "$RELEASES_DIR/current" 2>/dev/null || true)"
renderer="$RENDER_DIR/$sha"
if [ -z "$sha" ] || [ ! -f "$renderer/entry-server.js" ]; then
  log "live release ${sha:-(none)} has no renderer; leaving index.html as built"
  exit 0
fi
[ -f "$CONTENT_DIR/site.json" ] || { log "no $CONTENT_DIR/site.json; leaving index.html as built"; exit 0; }
[ -f "$LANDING_DIR/index.html" ] || fail "$LANDING_DIR/index.html is missing"

rendered_hash() { sed -n 's/.*data-content-hash="\([0-9a-f]\{64\}\)".*/\1/p' "$LANDING_DIR/index.html" | head -1; }

# A document the renderer refused is not retried every ten minutes; only a new
# save (a different hash) or FORCE=1 tries again.
FAILED="$RENDER_DIR/.failed-content"

# The editor can save again while a render runs; go round until the page
# matches the file (three times at most).
for attempt in 1 2 3; do
  want="$(sha256sum "$CONTENT_DIR/site.json" | cut -c1-64)"
  if [ "$FORCE" != 1 ] && [ "$(rendered_hash)" = "$want" ]; then
    [ "$attempt" = 1 ] && log "index.html already shows content ${want:0:12}"
    exit 0
  fi
  if [ "$FORCE" != 1 ] && [ "$(cat "$FAILED" 2>/dev/null)" = "$want" ]; then
    log "content ${want:0:12} was refused before; waiting for the next save (FORCE=1 to retry)"
    exit 0
  fi
  FORCE=0

  out="$(mktemp -d "$RENDER_DIR/.out.XXXXXX")"
  trap 'rm -rf "$out"' EXIT
  rc=0
  docker run --rm --network none --read-only \
         --cap-drop ALL --security-opt no-new-privileges \
         --memory 256m --pids-limit 64 --user "$(id -u):$(id -g)" -e NODE_ENV=production \
         -v "$renderer:/render:ro" -v "$CONTENT_DIR:/content:ro" -v "$out:/out" \
         "$NODE_IMAGE" \
         node /render/prerender.mjs --renderer /render/entry-server.js \
           --template /render/template.html --site /content/site.json --out /out/index.html \
    || rc=$?
  if [ "$rc" = 3 ]; then
    # The document was refused (invalid): remember it, so the timer does not
    # start a container for it every ten minutes. A new save tries again.
    echo "$want" > "$FAILED"
    fail "site.json was refused (above); index.html unchanged until the next save"
  elif [ "$rc" != 0 ]; then
    # Docker, the image, the disk: not the content. The timer will retry.
    fail "the render failed (exit $rc, above); index.html unchanged, will retry"
  fi
  rm -f "$FAILED"

  # Same filesystem, so this is a rename: Caddy serves the old page or the new
  # one, never half of either.
  chmod 0644 "$out/index.html"
  mv -f "$out/index.html" "$LANDING_DIR/index.html"
  rm -rf "$out"
  trap - EXIT

  got="$(rendered_hash)"
  log "index.html now shows content ${got:0:12} (release ${sha:0:12})"
  [ "$got" = "$(sha256sum "$CONTENT_DIR/site.json" | cut -c1-64)" ] && exit 0
  log "site.json changed while rendering; again"
done
fail "site.json kept changing; gave up after three renders (the timer will try again)"
