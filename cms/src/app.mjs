/**
 * The editor's HTTP surface. Order matters:
 *   1. security headers and the request log, on everything;
 *   2. /api/health, before the guard, for the Docker healthcheck;
 *   3. the guard — Host, owner, and same-origin proof for any change;
 *   4. JSON routes, media, the editor page and the shared validator module.
 *
 * Every route that changes something takes a JSON body or a DELETE, so a
 * cross-site page cannot send it without a preflight this server never
 * approves — on top of the guard's own checks.
 */
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SCHEMA_VERSION } from '../lib/validate-site.mjs'
import { HttpError, wrap, errorHandler } from './errors.mjs'
import { requestGuard, requestLog, securityHeaders } from './guard.mjs'
import { createStore } from './store.mjs'
import { mediaRoutes } from './media.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')

export function createApp(config) {
  const store = createStore(config)
  const app = express()
  app.disable('x-powered-by')
  app.set('query parser', 'simple')
  app.set('etag', false) // ETags here mean "document version" and are set by hand

  app.use(securityHeaders())
  app.use(requestLog())

  app.get('/api/health', (_req, res) => res.json({ ok: true, schemaVersion: SCHEMA_VERSION }))

  app.use(requestGuard(config))

  const json = express.json({ limit: '1mb', type: 'application/json' })
  const needsJson = (req, _res, next) =>
    req.is('application/json') ? next() : next(new HttpError(415, 'Send changes as application/json.'))

  /* ── documents ──────────────────────────────────────────────────────── */

  app.get('/api/variants', wrap(async (_req, res) => {
    res.json({ variants: await store.listVariants() })
  }))

  app.get('/api/content', wrap(async (req, res) => {
    const { doc, etag } = await store.read(req.query.variant)
    res.set('ETag', etag).json(doc)
  }))

  app.put('/api/content', needsJson, json, wrap(async (req, res) => {
    const r = await store.write(req.query.variant, req.body, { ifMatch: req.get('if-match') })
    res.set('ETag', r.etag).json({ ok: true, etag: r.etag, savedAt: new Date().toISOString(), warnings: r.warnings })
  }))

  /** New variant, copied from an existing one. Never overwrites. */
  app.post('/api/variants', needsJson, json, wrap(async (req, res) => {
    const { name, source = 'default' } = req.body || {}
    if (typeof name !== 'string' || !name) throw new HttpError(400, 'Give the new variant a name.')
    if (store.keyOf(name) === 'default') throw new HttpError(400, '"default" is the live document; pick another name.')
    const { doc } = await store.read(source)
    const r = await store.write(name, doc, { create: true })
    res.status(201).set('ETag', r.etag).json({ ok: true, variant: r.key, etag: r.etag })
  }))

  app.delete('/api/variants/:name', wrap(async (req, res) => {
    const r = await store.remove(req.params.name)
    res.json({ ok: true, backup: r.backup })
  }))

  /** Copy a variant over the live document. If-Match: the variant's ETag. */
  app.post('/api/publish', needsJson, json, wrap(async (req, res) => {
    const { variant } = req.body || {}
    if (typeof variant !== 'string' || !variant) throw new HttpError(400, 'Say which variant to publish.')
    const r = await store.publish(variant, req.get('if-match'))
    res.json({ ok: true, etag: r.etag, backup: r.backup, warnings: r.warnings })
  }))

  /* ── history ────────────────────────────────────────────────────────── */

  app.get('/api/backups', wrap(async (req, res) => {
    res.json({ backups: await store.listBackups(req.query.variant) })
  }))

  app.post('/api/restore', needsJson, json, wrap(async (req, res) => {
    const r = await store.restore(req.body?.file)
    res.json({ ok: true, variant: r.key, etag: r.etag, backup: r.backup })
  }))

  /* ── media, editor, shared validator ────────────────────────────────── */

  app.use(mediaRoutes({ store, quotaBytes: config.mediaQuotaBytes }))

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'No such API route.')))

  app.use('/lib', express.static(path.join(ROOT, 'lib'), { index: false }))
  app.use('/', express.static(path.join(ROOT, 'public')))

  app.use(errorHandler)
  app.locals.store = store
  return app
}
