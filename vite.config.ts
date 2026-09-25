import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * What scripts/build-images.mjs generated, for src/lib/images.ts. Empty when
 * the images have not been built, and the site then uses the originals.
 */
function imageManifest(): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync('public/assets/img/manifest.json', 'utf8'))
  } catch {
    return {}
  }
}

/**
 * <link rel="preload"> for the two faces used above the fold, so the browser
 * asks for them with the HTML instead of after it has parsed the CSS. Vite
 * gives the files hashed names, so this finds them in the finished bundle.
 */
function preloadFonts(prefixes: string[]): Plugin {
  return {
    name: 'preload-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return []
        return Object.values(ctx.bundle)
          .filter((f) => f.type === 'asset' && f.fileName.endsWith('.woff2'))
          .filter((f) => prefixes.some((p) => f.fileName.startsWith(`assets/${p}-`)))
          .map((f) => ({
            tag: 'link',
            attrs: { rel: 'preload', href: `/${f.fileName}`, as: 'font', type: 'font/woff2', crossorigin: '' },
            injectTo: 'head' as const,
          }))
      },
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), preloadFonts(['caprasimo-latin-400-normal', 'figtree-latin-400-normal'])],
  define: {
    __IMAGES__: JSON.stringify(imageManifest()),
  },
  build: {
    // Keep fonts as files. Inlined as data: URIs they would bloat the CSS and
    // need `font-src data:` in the Content-Security-Policy.
    assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined),
  },
  server: {
    port: 3000,
  },
})
