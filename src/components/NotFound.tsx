import type { Site } from '../lib/site'

/**
 * The 404 page. Prerendered to 404.html at build time and served by Caddy for
 * any path that does not exist, with no JavaScript: there is nothing on it to
 * make interactive, and the whole site is one page anyway.
 */
export function NotFound({ site }: { site: Site }) {
  return (
    <main className="shell flex min-h-screen flex-col justify-center py-16">
      <div className="text-kicker font-semibold uppercase text-accent-text">404 — Not found</div>
      <h1 className="mt-2 text-display sm:text-display-lg">Nothing lives here.</h1>
      <p className="mt-3 max-w-prose text-body-lg text-muted">
        This address doesn&rsquo;t exist. Everything on {site.meta.domain} is on one page.
      </p>
      <p className="mt-8">
        <a
          href="/"
          className="inline-flex min-h-[44px] items-center justify-center rounded-pill bg-accent-700 px-6 text-body font-semibold text-neutral-100 hover:bg-accent-800 dark:bg-accent-400 dark:text-neutral-900 dark:hover:bg-accent-300"
        >
          Go to {site.profile.shortName}&rsquo;s page
        </a>
      </p>
    </main>
  )
}
