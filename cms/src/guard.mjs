/**
 * Who may talk to the editor, checked before any route runs.
 *
 * The editor has no login page. Tailscale Serve is the login: it only forwards
 * requests from the tailnet, and it stamps each one with the sender's
 * Tailscale identity in `Tailscale-User-Login`. That header is trustworthy only
 * because the container port is published on 127.0.0.1, so nothing but Serve
 * (and processes on the box itself) can reach it to forge one.
 *
 * Identity alone is not enough, because the owner's own browser carries it:
 * a page he happens to open could submit a form to the editor and ride on it.
 * So every request that changes something must also prove it came from the
 * editor's own page — same-origin per Sec-Fetch-Site, an Origin equal to the
 * editor's, and an X-CMS header, which a cross-site page cannot add without a
 * CORS preflight this server never approves. The Host allowlist closes DNS
 * rebinding, where an attacker's domain is made to resolve to this box.
 */

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS'])

export function requestGuard({ origin, owner, port, extraHosts = [] }) {
  const hosts = new Set([new URL(origin).host.toLowerCase(), `127.0.0.1:${port}`, `localhost:${port}`, ...extraHosts])

  return (req, res, next) => {
    const deny = (status, reason, message) => {
      res.locals.denied = reason
      res.status(status).json({ error: message })
    }

    const host = (req.headers.host || '').toLowerCase()
    if (!hosts.has(host)) {
      return deny(421, `host ${host || '(none)'}`, `This editor only answers at ${origin}. If that is the address you used, add "${host}" to CMS_EXTRA_HOSTS.`)
    }

    const login = (req.get('tailscale-user-login') || '').toLowerCase()
    if (login !== owner) {
      return deny(403, `login ${login || '(none)'}`, `Only the site owner can use this editor. Open it through Tailscale at ${origin}.`)
    }
    res.locals.user = login

    if (SAFE.has(req.method)) return next()

    const fetchSite = req.get('sec-fetch-site')
    if (fetchSite && fetchSite !== 'same-origin') {
      return deny(403, `sec-fetch-site ${fetchSite}`, 'Refused: this change was requested by another website.')
    }
    if (req.get('origin') !== origin) {
      return deny(403, `origin ${req.get('origin') || '(none)'}`, `Refused: changes must come from the editor at ${origin}.`)
    }
    if (req.get('x-cms') !== '1') {
      return deny(403, 'no x-cms header', 'Refused: missing the X-CMS header the editor sends with every change.')
    }
    next()
  }
}

/** One line per change and per refusal — the audit trail the box never had. */
export function requestLog() {
  return (req, res, next) => {
    const started = Date.now()
    res.on('finish', () => {
      const denied = res.locals.denied
      if (SAFE.has(req.method) && !denied) return
      const who = res.locals.user || '-'
      const why = denied ? ` refused (${denied})` : ''
      console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms ${who}${why}`)
    })
    next()
  }
}

/**
 * Headers for every response. The editor page is same-origin only: no inline
 * script, no framing by other sites, nothing loaded from elsewhere.
 */
export function securityHeaders() {
  return (req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'same-origin',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
        "connect-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'; object-src 'none'",
    })
    if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store')
    next()
  }
}
