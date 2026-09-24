/**
 * portfolio-cms — the editor behind aliharizanuari.org.
 *
 * SECURITY MODEL (see README.md for the full picture):
 *   - The container port is published on 127.0.0.1 only. The one way in from
 *     another device is Tailscale Serve, which terminates HTTPS and tells this
 *     server who is asking (Tailscale-User-Login).
 *   - Every request must come from CMS_OWNER_LOGIN, at CMS_ORIGIN's host.
 *   - Every change must also come from the editor's own page (Origin,
 *     Sec-Fetch-Site, X-CMS), so a website the owner visits cannot use his
 *     browser to make one.
 *   - Every document written is validated with the same rules as CI, so the
 *     editor cannot publish something the site cannot draw.
 *
 * It refuses to start without CMS_ORIGIN and CMS_OWNER_LOGIN rather than fall
 * back to letting anyone in.
 */
import { loadConfig } from './src/config.mjs'
import { createApp } from './src/app.mjs'

const config = loadConfig()
if (config.problems.length) {
  for (const p of config.problems) console.error(`portfolio-cms: ${p}`)
  console.error('portfolio-cms: refusing to start. See cms/README.md, "Deploying".')
  process.exit(78) // EX_CONFIG
}

const app = createApp(config)
// 0.0.0.0 inside the container is what Docker's port publishing needs. The
// host side is bound to 127.0.0.1 in docker-compose.yml.
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`portfolio-cms on :${config.port} for ${config.owner} at ${config.origin}`)
  console.log(`content ${config.contentDir}, backups ${config.backupDir} (last ${config.maxBackups} of each document)`)
})

// Finish in-flight requests on `docker stop` instead of being killed mid-write.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 8000).unref()
  })
}
