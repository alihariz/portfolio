#!/usr/bin/env python3
"""
Put deploy/Caddyfile.site into the box's Caddyfile, safely.

    python3 ~/src/portfolio/deploy/apply-caddy-site.py            # apply
    python3 ~/src/portfolio/deploy/apply-caddy-site.py --check    # only run the checks

Replaces the aliharizanuari.org section of /home/ali/homelab/caddy/Caddyfile
(from its "# ── aliharizanuari.org" comment down to the "# ── HARDA" comment)
with the file from the repo. Nothing else in the Caddyfile changes.

Order of work, so the live file never holds a config Caddy would refuse:
  1. build the new Caddyfile and validate it inside the caddy container
     (piped to a temp file there, so nothing on the host changes yet);
  2. back up the current one (Caddyfile.bak-<date>-<time>-site);
  3. write the new one IN PLACE (the Caddyfile is bind-mounted as a single
     file, so replacing it by rename would leave the container on the old one);
  4. reload Caddy (putting the old file back if the reload fails), then check
     the headers, the 404 page and /content caching.
"""
import datetime
import os
import re
import shutil
import subprocess
import sys
import tempfile

HOMELAB = os.environ.get("HOMELAB_DIR", "/home/ali/homelab")
CADDYFILE = os.path.join(HOMELAB, "caddy", "Caddyfile")
SNIPPET = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Caddyfile.site")
START = re.compile(r"^# ── aliharizanuari\.org", re.M)
END = re.compile(r"^# ── HARDA", re.M)
HOST = "aliharizanuari.org"


def run(*cmd, check=True, stdin=None):
    r = subprocess.run(cmd, capture_output=True, text=True, input=stdin)
    if check and r.returncode != 0:
        sys.exit(f"FAILED: {' '.join(cmd)}\n{r.stdout}{r.stderr}")
    return r


def curl(path, *extra):
    with tempfile.NamedTemporaryFile(prefix="caddy-check-") as f:
        r = run("curl", "-s", "-D", "-", "-o", f.name, "-H", f"Host: {HOST}", *extra,
                f"http://127.0.0.1{path}", check=False)
        body = open(f.name, encoding="utf-8", errors="replace").read()
    head = r.stdout
    status = head.split(" ", 2)[1] if head.startswith("HTTP/") else "000"
    headers = {k.strip().lower(): v.strip() for k, _, v in (l.partition(":") for l in head.splitlines()[1:]) if k}
    return status, headers, body


def checks():
    ok = True

    def expect(label, cond, detail=""):
        nonlocal ok
        ok &= bool(cond)
        print(f"  {'ok  ' if cond else 'FAIL'} {label}{'' if cond else '  ' + detail}")

    print("checks:")
    s, h, body = curl("/")
    expect("/ is 200", s == "200", s)
    expect("HSTS on /", "strict-transport-security" in h)
    csp = h.get("content-security-policy") or h.get("content-security-policy-report-only") or ""
    mode = "enforced" if "content-security-policy" in h else "report-only"
    expect(f"CSP on / ({mode})", "script-src 'self' 'sha256-" in csp)
    expect("Permissions-Policy on /", "permissions-policy" in h)
    expect("no Server header", "server" not in h, h.get("server", ""))
    expect("page is prerendered", 'id="site-data"' in body, "deploy this build first")

    s, h, body = curl("/no-such-page")
    expect("/no-such-page is 404", s == "404", s)
    expect("404 keeps the headers", "x-content-type-options" in h and "strict-transport-security" in h)
    expect("404 is the site's page", "Not found" in body, "404.html arrives with the deploy of this build")
    s, h, body = curl("/media/0000000000000000.webp")
    media_csp = h.get("content-security-policy", "")
    expect("a missing /media image gets the site's 404, not the image sandbox", s == "404" and "sandbox" not in media_csp, f"{s} {media_csp}")

    s, h, _ = curl("/content/site.json")
    expect("/content/site.json is 200, no-cache", s == "200" and h.get("cache-control") == "no-cache", f"{s} {h.get('cache-control')}")
    etag = h.get("etag", "")
    s2, _, _ = curl("/content/site.json", "-H", f"If-None-Match: {etag}")
    expect("revalidation gives 304", s2 == "304", s2)
    s, _, _ = curl("/content/.staging/x")
    expect("/content/.staging is still hidden", s == "404", s)
    s, h, _ = curl("/og.png")
    expect("/og.png is served", s == "200" and h.get("content-type") == "image/png", f"{s} {h.get('content-type')}")
    return ok


def main():
    if "--check" in sys.argv:
        sys.exit(0 if checks() else 1)

    live = open(CADDYFILE, encoding="utf-8").read()
    new_site = open(SNIPPET, encoding="utf-8").read().rstrip("\n") + "\n\n"
    a, b = START.search(live), END.search(live)
    if not a or not b or b.start() < a.start():
        sys.exit(f"Could not find the aliharizanuari.org section in {CADDYFILE} (between '# ── aliharizanuari.org' and '# ── HARDA'). Nothing changed.")
    old_site = live[a.start():b.start()]
    if "http://aliharizanuari.org, http://www.aliharizanuari.org {" not in old_site:
        sys.exit("The section found does not look like the portfolio site block. Nothing changed.")
    if old_site == new_site:
        print("Caddyfile already has this version of the site block.")
        sys.exit(0 if checks() else 1)
    candidate = live[:a.start()] + new_site + live[b.start():]

    # 1. Validate inside the container, before touching the live file.
    r = run("docker", "exec", "-i", "caddy", "sh", "-c",
            "cat > /tmp/Caddyfile.candidate && caddy validate --adapter caddyfile --config /tmp/Caddyfile.candidate; "
            "s=$?; rm -f /tmp/Caddyfile.candidate; exit $s",
            check=False, stdin=candidate)
    if r.returncode != 0:
        sys.exit(f"Caddy rejected the new config; the live Caddyfile is untouched.\n{r.stdout}{r.stderr}")
    print("validated the new Caddyfile")

    # 2. Back up.
    backup = f"{CADDYFILE}.bak-{datetime.datetime.now().strftime('%Y-%m-%d-%H%M%S')}-site"
    shutil.copy2(CADDYFILE, backup)
    print(f"backup: {backup}")

    # 3. Write in place (same inode), 4. reload.
    def write(text):
        with open(CADDYFILE, "r+", encoding="utf-8") as f:
            f.seek(0)
            f.write(text)
            f.truncate()

    write(candidate)
    r = run("docker", "exec", "caddy", "caddy", "reload", "--config", "/etc/caddy/Caddyfile", check=False)
    if r.returncode != 0:
        write(live)
        run("docker", "exec", "caddy", "caddy", "reload", "--config", "/etc/caddy/Caddyfile", check=False)
        sys.exit(f"Reload failed; the previous Caddyfile is back in place.\n{r.stdout}{r.stderr}")
    print("reloaded caddy")

    if not checks():
        print(f"\nSome checks failed (above). To undo: cp {backup} {CADDYFILE} && docker exec caddy caddy reload --config /etc/caddy/Caddyfile")
        sys.exit(1)
    print("\nall good")


if __name__ == "__main__":
    main()
