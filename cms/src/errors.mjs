/** An error that is the client's to fix, carried through to a JSON response. */
export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

/** Wrap an async route so every failure becomes JSON, never an HTML error page. */
export const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next)

/**
 * The last middleware. 4xx errors say what to fix; anything else is logged in
 * full here and reported without detail, so container paths and stack traces
 * never reach the browser.
 */
export function errorHandler(err, req, res, _next) {
  if (res.headersSent) return res.end()
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...err.extra })
  }
  // express.json() failures
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'That document is too large (limit 1 MB).' })
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'The request body is not valid JSON.' })
  if (typeof err.status === 'number' && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: err.expose ? err.message : 'Bad request.' })
  }
  console.error(new Date().toISOString(), req.method, req.originalUrl, err)
  res.status(500).json({ error: 'Something went wrong on the server. `docker logs portfolio-cms` has the details.' })
}
