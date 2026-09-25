import type { Profile } from './site'

/**
 * Bundled images and their generated sizes.
 *
 * scripts/build-images.mjs turns every picture under public/assets/images into
 * AVIF and WebP at a few widths, under /assets/img/, and writes a manifest of
 * what it made. vite.config.ts injects that manifest here as __IMAGES__, so the
 * components can offer those sizes without importing a generated file. When
 * the images were not built (a bare `vite` or the render test), the manifest is
 * empty and every image renders as the plain <img> it always was.
 */
export interface ImageInfo {
  /** Intrinsic size of the original. */
  w: number
  h: number
  /** Widths generated under /assets/img/, smallest first. Empty if none. */
  widths: number[]
}

declare const __IMAGES__: Record<string, ImageInfo> | undefined

const MANIFEST: Record<string, ImageInfo> = typeof __IMAGES__ === 'object' && __IMAGES__ ? __IMAGES__ : {}
const KNOWN = Object.keys(MANIFEST).length > 0

export function imageInfo(src: string): ImageInfo | undefined {
  return Object.prototype.hasOwnProperty.call(MANIFEST, src) ? MANIFEST[src] : undefined
}

/**
 * A path under /assets/images that the build knows does not exist. Only
 * answerable when the manifest was built; otherwise nothing is "known missing".
 */
export function isMissingBundledImage(src: string): boolean {
  return KNOWN && src.startsWith('/assets/images/') && !imageInfo(src)
}

const GITHUB_AVATAR = /^(https:\/\/github\.com\/[A-Za-z0-9-]+\.png)\?size=\d+$/

/**
 * GitHub resizes avatars on request, so the fallback portrait gets a srcset
 * too: a phone showing it at 132 px downloads ~10 KB instead of the 640 px
 * original (~100 KB), which on mobile competed with the page's own files.
 */
export function avatarSrcSet(src: string): string {
  const m = src.match(GITHUB_AVATAR)
  return m ? [160, 320, 640].map((w) => `${m[1]}?size=${w} ${w}w`).join(', ') : ''
}

/** `/assets/img/<path>.<width>.<format> <width>w, …`, or '' when there are none. */
export function srcSetFor(src: string, format: 'avif' | 'webp'): string {
  const info = imageInfo(src)
  if (!info?.widths.length) return ''
  const base = '/assets/img/' + src.slice('/assets/images/'.length).replace(/\.[a-z0-9]+$/i, '')
  return info.widths.map((w) => `${base}.${w}.${format} ${w}w`).join(', ')
}

/**
 * Where the portrait comes from, best first: the one set in the editor, then
 * the GitHub avatar (a permanent public URL — change it on GitHub and this
 * follows with no deploy). A bundled path the build knows is missing is
 * skipped, so the page does not start with a request that can only 404.
 */
export function portraitChain(profile: Pick<Profile, 'portrait' | 'links'>): string[] {
  const gh = profile.links?.github?.replace(/\/+$/, '').split('/').pop()
  const chain = [
    profile.portrait && !isMissingBundledImage(profile.portrait) ? profile.portrait : undefined,
    gh ? `https://github.com/${gh}.png?size=640` : undefined,
  ]
  return chain.filter((s): s is string => !!s)
}
