#!/usr/bin/env bash
#
# Roll aliharizanuari.org back to a release that is already on disk.
#
#     bash scripts/rollback-portfolio.sh            # list what is available
#     bash scripts/rollback-portfolio.sh previous   # the one before current
#     bash scripts/rollback-portfolio.sh <sha>      # a specific release
#
# Rolling back does not rebuild anything and does not need the network. It is
# an rsync from caddy/releases/<sha> into caddy/landing, which takes about a
# second. Push a revert commit afterwards so git and the box agree again -
# otherwise the next deploy quietly reinstates the bad build.

set -euo pipefail

HOMELAB_DIR="${HOMELAB_DIR:-/home/ali/homelab}"
LANDING_DIR="${LANDING_DIR:-$HOMELAB_DIR/caddy/landing}"
RELEASES_DIR="${RELEASES_DIR:-$HOMELAB_DIR/caddy/releases}"
SITE_HOST="${SITE_HOST:-aliharizanuari.org}"
CADDY_ORIGIN="${CADDY_ORIGIN:-http://127.0.0.1}"

log()  { printf '\033[36m==>\033[0m %s\n' "$*"; }
fail() { printf '\033[31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

[ -d "$RELEASES_DIR" ] || fail "$RELEASES_DIR does not exist - nothing has been deployed by the pipeline yet"

current=""
[ -f "$RELEASES_DIR/current" ] && current="$(cat "$RELEASES_DIR/current")"

# Directories on disk, newest first. `.failed.*` are builds that were staged
# but never passed verification - never offer them as a rollback target.
mapfile -t releases < <(
  find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -not -name '*.failed.*' -printf '%T@ %f\n' \
    | sort -rn | cut -d' ' -f2-
)
[ "${#releases[@]}" -gt 0 ] || fail "no releases found in $RELEASES_DIR"

# What has ACTUALLY served traffic, oldest first. Directory mtime cannot answer
# this: a build that failed its smoke test is staged, so it is the newest
# directory on disk despite never having been live. Rolling "back" to it would
# deploy the exact build that just failed.
served=()
if [ -f "$RELEASES_DIR/history" ]; then
  mapfile -t served < <(grep -v '^[[:space:]]*$' "$RELEASES_DIR/history" || true)
fi
was_live() { local s; for s in "${served[@]:-}"; do [ "$s" = "$1" ] && return 0; done; return 1; }

if [ $# -eq 0 ]; then
  echo "Releases in $RELEASES_DIR (newest on disk first):"
  for r in "${releases[@]}"; do
    when=$(date -r "$RELEASES_DIR/$r" '+%Y-%m-%d %H:%M' 2>/dev/null || echo '?')
    mark=" "; note=""
    [ "$r" = "$current" ] && mark="*"
    if [ "${#served[@]}" -gt 0 ] && ! was_live "$r"; then note="  (never served)"; fi
    printf '  %s %-42s %s%s\n' "$mark" "$r" "$when" "$note"
  done
  failed=$(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -name '*.failed.*' | wc -l)
  echo
  echo "  * = currently live"
  [ "$failed" -gt 0 ] && echo "  $failed failed build(s) kept for inspection, not listed - not rollback targets"
  echo "Roll back with: bash $0 previous   (or a sha from the list)"
  exit 0
fi

target="$1"
if [ "$target" = "previous" ]; then
  target=""
  if [ "${#served[@]}" -gt 0 ]; then
    # Walk the served history backwards to the last release that is not the
    # current one and is still on disk.
    for (( i=${#served[@]}-1; i>=0; i-- )); do
      cand="${served[$i]}"
      [ "$cand" = "$current" ] && continue
      [ -d "$RELEASES_DIR/$cand" ] || continue
      target="$cand"
      break
    done
    [ -n "$target" ] || fail "no previously-served release is still on disk - pick one explicitly from the list"
  else
    # No history file (installed before histories were kept). Fall back to
    # mtime order and say so, because it can be wrong.
    printf '\033[33mwarning:\033[0m no history file - falling back to directory timestamps, which cannot tell a\n' >&2
    printf '         served release from one that failed verification. Check the target below.\n' >&2
    for r in "${releases[@]}"; do
      [ "$r" = "$current" ] && continue
      target="$r"; break
    done
    [ -n "$target" ] || fail "no release older than the current one"
  fi
fi

case "$target" in
  *.failed.*) fail "'$target' is a build that failed verification - refusing to deploy it" ;;
esac

[ -d "$RELEASES_DIR/$target" ]            || fail "release '$target' not found - run with no arguments to list"
[ -f "$RELEASES_DIR/$target/index.html" ] || fail "release '$target' has no index.html - refusing"
[ -d "$LANDING_DIR" ]                     || fail "$LANDING_DIR does not exist"

log "rolling back: ${current:-unknown} -> $target"
# --checksum for the same reason as in deploy-portfolio.sh: same-size,
# same-second files are skipped by rsync's default quick-check, which would
# leave the rollback reporting success while the bad build stays live.
rsync -a --delete --checksum "$RELEASES_DIR/$target/" "$LANDING_DIR/"
echo "$target" > "$RELEASES_DIR/current"
echo "$target" >> "$RELEASES_DIR/history"

code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
         -H "Host: $SITE_HOST" "$CADDY_ORIGIN/" 2>/dev/null) || code=000
[ -n "$code" ] || code=000
[ "$code" = "200" ] || fail "site returned HTTP $code after rollback - check the caddy container"

log "live on $target (HTTP 200)"
log "now push a revert commit so the next deploy does not reinstate the bad build"
