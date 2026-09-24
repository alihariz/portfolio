/**
 * Everything the editor needs from its environment, checked once at startup.
 *
 * CMS_ORIGIN and CMS_OWNER_LOGIN have no defaults on purpose. Without them the
 * request guard cannot tell the owner's browser from anything else, and an
 * editor that silently falls back to "allow" is how this service ended up
 * open to the whole LAN before. It refuses to start instead, and says why.
 */
import path from 'node:path'

export function loadConfig(env = process.env) {
  const problems = []
  const port = Number(env.PORT || 8095)

  const origin = (env.CMS_ORIGIN || '').replace(/\/+$/, '')
  if (!origin) {
    problems.push('CMS_ORIGIN is not set. Use the address Tailscale Serve gives the editor, e.g. https://alielitedesk.<tailnet>.ts.net:8443')
  } else {
    try {
      const u = new URL(origin)
      if (u.origin !== origin) problems.push(`CMS_ORIGIN should be just scheme, host and port (got "${origin}", expected "${u.origin}")`)
      else if (u.protocol !== 'https:') problems.push(`CMS_ORIGIN should be https:// — Tailscale Serve provides the certificate (got "${origin}")`)
    } catch {
      problems.push(`CMS_ORIGIN "${origin}" is not a URL`)
    }
  }

  const owner = (env.CMS_OWNER_LOGIN || '').trim().toLowerCase()
  if (!owner) problems.push('CMS_OWNER_LOGIN is not set. Use the LoginName from `tailscale whois --json <your laptop tailnet IP>`, e.g. alihariz@github')

  const contentDir = path.resolve(env.CONTENT_DIR || '/content')
  const backupDir = path.resolve(env.BACKUP_DIR || '/backups')
  if (backupDir === contentDir || backupDir.startsWith(contentDir + path.sep)) {
    problems.push(`BACKUP_DIR (${backupDir}) must be outside CONTENT_DIR (${contentDir}) — everything in CONTENT_DIR is published at /content`)
  }

  return {
    port,
    origin,
    owner,
    // Hosts the editor answers to besides CMS_ORIGIN's, for the case where
    // Tailscale Serve rewrites Host. Comma-separated, e.g. "127.0.0.1:8095".
    extraHosts: (env.CMS_EXTRA_HOSTS || '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean),
    contentDir,
    backupDir,
    maxBackups: Number(env.MAX_BACKUPS || 30),
    mediaQuotaBytes: Number(env.MEDIA_QUOTA_MB || 500) * 1024 * 1024,
    problems,
  }
}
