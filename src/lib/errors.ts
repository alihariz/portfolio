/**
 * Every render failure the page survives is reported here: to the console,
 * so it can be seen in DevTools, and as a `site:render-error` event on window,
 * so the render test can count failures the error boundaries have hidden.
 * Without the event, a boundary would make a crashing document look fine to
 * the test that exists to catch it.
 */
export function reportRenderError(error: unknown, where: string): void {
  console.error(`[site] ${where} failed to render and was left out:`, error)
  if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
    window.dispatchEvent(new CustomEvent('site:render-error', { detail: { error, where } }))
  }
}
