#!/usr/bin/env bash
#
# Install a built dist/ into the Caddy landing directory on alielitedesk.
#
# Run by the `deploy` job of .github/workflows/deploy.yml on the self-hosted
# runner, and safe to run by hand:
#
#     bash scripts/deploy-portfolio.sh ./dist
#
# Three things this handles that copying a tarball by hand does not:
#
#   1. It never runs `rm -rf landing/*`. caddy/landing is a bind mount; if the
#      directory itself is ever removed, Caddy holds the deleted inode and
#      serves nothing until the container restarts. rsync --delete updates the
#      contents in place, writing each file to a temp name and renaming it, so
#      there is no window where the site is half-copied or empty.
#   2. Every build is kept under caddy/releases/<sha>, so a rollback is a copy
#      from a directory that is already on disk, not a rebuild.
#   3. The deploy is verified through Caddy before it is called done, and rolls
#      itself back if the site does not answer.

set -euo pipefail

SRC="${1:-dist}"

HOMELAB_DIR="${HOMELAB_DIR:-/home/ali/homelab}"
LANDING_DIR="${LANDING_DIR:-$HOMELAB_DIR/caddy/landing}"
RELEASES_DIR="${RELEASES_DIR:-$HOMELAB_DIR/caddy/releases}"
KEEP="${KEEP:-10}"
SITE_HOST="${SITE_HOST:-aliharizanuari.org}"
CADDY_ORIGIN="${CADDY_ORIGIN:-http://127.0.0.1}"
SHA="${GITHUB_SHA:-manual-$(date -u +%Y%m%dT%H%M%SZ)}"

log()  { printf '\033[36m==>\033[0m %s\n' "$*"; }
fail() { printf '\033[31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

# -- Preflight ---------------------------------------------------------------
# Refuse to deploy something that is not a built site. Without this check an
# empty or partial artifact would rsync --delete the live site into nothing.
[ -d "$SRC" ]             || fail "source directory '$SRC' does not exist"
[ -f "$SRC/index.html" ]  || fail "'$SRC/index.html' is missing - this is not a Vite build"
[ -d "$SRC/assets" ]      || fail "'$SRC/assets' is missing - this is not a Vite build"

file_count=$(find "$SRC" -type f | wc -l)
[ "$file_count" -ge 5 ] || fail "'$SRC' has only $file_count files - refusing to deploy"

# The landing directory must already exist and stay the same inode: it is
# bind-mounted into the caddy container.
[ -d "$LANDING_DIR" ] || fail "$LANDING_DIR does not exist. Create it and restart caddy - do not let this script create it."
[ -w "$LANDING_DIR" ] || fail "$LANDING_DIR is not writable by $(id -un)"

command -v rsync >/dev/null || fail "rsync is not installed (sudo apt install rsync)"
command -v curl  >/dev/null || fail "curl is not installed"

mkdir -p "$RELEASES_DIR"

# `current` is what is live right now; `history` is the append-only list of
# releases that have actually served traffic. A release directory exists as
# soon as it is staged, so directory mtime does NOT tell you what was ever
# live - a build that failed verification is the newest directory on disk.
# Only ever pick a rollback target out of `history`.
previous=""
if [ -f "$RELEASES_DIR/current" ]; then
  previous="$(cat "$RELEASES_DIR/current")"
fi

# -- Stage the release -------------------------------------------------------
release="$RELEASES_DIR/$SHA"
log "staging release $SHA ($file_count files)"
rm -rf "$release"
mkdir -p "$release"
rsync -a --delete "$SRC/" "$release/"

# -- Swap it in --------------------------------------------------------------
# --delete is safe here: Caddy serves /content/* and /media/* from a different
# root (/srv/site-content), so caddy/landing holds nothing but build output.
#
# --checksum is not optional. rsync's default quick-check compares size and
# mtime at one-second granularity, and the stable-named files here (index.html,
# version.json) keep the same size between builds. Two deploys landing in the
# same second are silently skipped: the release directory is correct while the
# live site keeps serving the old bytes. Confirmed by testing, not theoretical.
# The tree is ~1.5 MB, so hashing it costs nothing worth measuring.
log "installing into $LANDING_DIR"
rsync -a --delete --checksum "$release/" "$LANDING_DIR/"
echo "$SHA" > "$RELEASES_DIR/current"

# -- Verify through Caddy ----------------------------------------------------
# Hits the container directly on the host, bypassing Cloudflare, so a pass
# means the box is genuinely serving the new build and not a cached copy.
smoke() {
  local want="$1" attempt code live
  for attempt in 1 2 3 4 5; do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
             -H "Host: $SITE_HOST" "$CADDY_ORIGIN/" 2>/dev/null) || code=000
    [ -n "$code" ] || code=000
    if [ "$code" = "200" ]; then
      live=$(curl -s --max-time 10 -H "Host: $SITE_HOST" "$CADDY_ORIGIN/version.json" 2>/dev/null \
               | sed -n 's/.*"sha"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
      if [ -z "$want" ] || [ "$live" = "$want" ]; then
        log "smoke test ok - HTTP 200, serving ${live:-<no version.json>}"
        return 0
      fi
      printf '    attempt %s: serving "%s", expected "%s"\n' "$attempt" "${live:-none}" "$want"
    else
      printf '    attempt %s: HTTP %s\n' "$attempt" "$code"
    fi
    sleep 2
  done
  return 1
}

log "verifying $SITE_HOST via $CADDY_ORIGIN"
if ! smoke "$SHA"; then
  # Park the bad build under a name the rollback script will not offer. It
  # stays on disk for inspection but can never be picked as a target.
  mv "$release" "$release.failed.$(date -u +%Y%m%dT%H%M%SZ)" 2>/dev/null || true

  if [ -n "$previous" ] && [ -d "$RELEASES_DIR/$previous" ]; then
    printf '\033[31m==> smoke test failed - rolling back to %s\033[0m\n' "$previous" >&2
    rsync -a --delete --checksum "$RELEASES_DIR/$previous/" "$LANDING_DIR/"
    echo "$previous" > "$RELEASES_DIR/current"
    echo "$previous" >> "$RELEASES_DIR/history"
    smoke "" || printf '\033[31m==> rollback did not verify either - check the caddy container\033[0m\n' >&2
    fail "deploy of $SHA failed verification; rolled back to $previous"
  fi
  fail "deploy of $SHA failed verification and there is no previous release to roll back to"
fi

echo "$SHA" >> "$RELEASES_DIR/history"

# -- Prune -------------------------------------------------------------------
# Keep the newest $KEEP release directories; anything older is a rebuild away.
stale=()
mapfile -t stale < <(
  find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
    | sort -rn | tail -n "+$((KEEP + 1))" | cut -d' ' -f2-
)
pruned=0
for dir in "${stale[@]}"; do
  # Belt and braces. By this point `current` is the release just installed, so
  # this guard is normally redundant - it is here so that lowering KEEP can
  # never delete whatever is live, whichever order things run in.
  if [ -n "$dir" ] && [ "$dir" != "$release" ] && [ "$(basename "$dir")" != "$(cat "$RELEASES_DIR/current")" ]; then
    rm -rf "$dir"
    pruned=$((pruned + 1))
  fi
done
if [ "$pruned" -gt 0 ]; then
  log "pruned $pruned old release(s), keeping $KEEP"
fi

log "deployed $SHA -> https://$SITE_HOST"
