/**
 * The Content-Security-Policy in deploy/Caddyfile.site allows exactly one
 * inline script, the theme script in index.html, by its SHA-256. Change a byte
 * of that script and browsers stop running it (once the policy is enforced),
 * so dark-mode visitors get a flash of the light theme. This fails first, and
 * prints the hash to put in the Caddyfile.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { inlineScriptHashes } from '../scripts/prerender.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const caddy = readFileSync(path.join(ROOT, 'deploy/Caddyfile.site'), 'utf8')
const csp = caddy.match(/Content-Security-Policy(?:-Report-Only)? "(default-src 'self';[^"]*)"/)?.[1]

test('the site CSP allows the inline theme script by hash, and nothing else inline', () => {
  assert.ok(csp, 'deploy/Caddyfile.site has a site-wide policy')
  const scriptSrc = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src '))
  const allowed = [...scriptSrc.matchAll(/'(sha256-[A-Za-z0-9+/=]+)'/g)].map((m) => m[1])
  const needed = inlineScriptHashes(readFileSync(path.join(ROOT, 'index.html'), 'utf8'))

  assert.ok(needed.length >= 1, 'index.html has its theme script')
  assert.deepEqual(allowed.sort(), needed.sort(), `script-src in deploy/Caddyfile.site should list exactly: ${needed.map((h) => `'${h}'`).join(' ')}`)
  assert.ok(!/unsafe-inline|unsafe-eval/.test(scriptSrc), 'no unsafe-inline or unsafe-eval')
})

test('every response gets the security headers, 404s included', () => {
  assert.match(caddy, /^\(portfolio_headers\) \{/m)
  const imports = caddy.match(/import portfolio_headers/g) ?? []
  assert.ok(imports.length >= 3, 'the site block and both handle_errors blocks import them')
  for (const h of ['Strict-Transport-Security', 'X-Content-Type-Options', 'Permissions-Policy', 'Cross-Origin-Opener-Policy', '-Server']) {
    assert.ok(caddy.includes(h), `${h} is set`)
  }
})
