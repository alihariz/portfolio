import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Motion, kept deliberately small.
 *
 * Two effects only: sections fade up as they scroll into view, and the proof
 * numbers count to their value once. Both are decoration, and the page is
 * built so it never depends on them:
 *
 *   - The HTML is prerendered with everything visible and every number final.
 *     A visitor without JavaScript, a crawler, or anyone who reads before the
 *     script arrives gets the complete page.
 *   - After hydration, only what is still off screen is hidden, ready to fade
 *     in. What the visitor can already see is left exactly as it is, so the
 *     page never blinks or re-counts under someone who is reading it.
 *   - Under prefers-reduced-motion, or without IntersectionObserver, nothing is
 *     hidden and nothing moves.
 */

/**
 * Set once the first render has committed. Anything mounted after that (the
 * project drawer) was never in the prerendered HTML, so it may animate even
 * when it appears on screen.
 */
let pageSettled = false
export function markPageSettled() {
  pageSettled = true
}

type Phase = 'static' | 'waiting' | 'shown'

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function onScreen(node: Element): boolean {
  const r = node.getBoundingClientRect()
  return r.bottom > 0 && r.top < window.innerHeight
}

/**
 * 'static' on the server and for the first client render, so hydration
 * matches. Afterwards: 'waiting' while off screen, 'shown' once it scrolls in.
 */
function useScrollPhase<T extends HTMLElement>(rootMargin = '0px 0px -12% 0px') {
  const ref = useRef<T>(null)
  const [phase, setPhase] = useState<Phase>('static')

  useEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) return
    if (!pageSettled && onScreen(node)) return // already being read: leave it

    setPhase('waiting')
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPhase('shown')
          io.disconnect()
        }
      },
      { rootMargin, threshold: 0.05 },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [rootMargin])

  return { ref, phase }
}

export function Reveal({
  children,
  as: Tag = 'div',
  className = '',
}: {
  children: ReactNode
  as?: 'div' | 'section' | 'li' | 'article'
  className?: string
}) {
  const { ref, phase } = useScrollPhase<HTMLDivElement>()
  const motion =
    phase === 'static'
      ? ''
      : `transition-[opacity,transform] duration-700 ease-out ${phase === 'shown' ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`
  const cls = `${className} ${motion}`.trim()

  return (
    <Tag ref={ref as never} className={cls || undefined}>
      {children}
    </Tag>
  )
}

/**
 * Counts to a number that may be wrapped in other characters — "20,923",
 * "95%+", "67×", "6 months". The non-numeric parts are preserved exactly, so
 * the label reads the same at rest as it did before the animation existed.
 *
 * At rest it is plain text. While counting, the final value sits in a
 * visually hidden span for screen readers and the moving number is hidden from
 * them, so assistive tech never reads a half-counted number. (It used to put
 * aria-label on a bare <span>, which screen readers are not required to read:
 * axe flags it under WCAG 4.1.2.)
 */
export function CountUp({ value, duration = 900 }: { value: string; duration?: number }) {
  const { ref, phase } = useScrollPhase<HTMLSpanElement>()
  const [shown, setShown] = useState<string | null>(null)

  useEffect(() => {
    // Parsed inside the effect, not outside it. A regex match is a fresh array
    // on every render, so having it in the dependency list re-ran this effect
    // after each setShown — cancelling the frame loop and restarting from zero,
    // which left the number stuck a few percent in and never settling.
    const match = value.match(/^(\D*)([\d,]+(?:\.\d+)?)(.*)$/s)
    const target = match ? Number(match[2].replace(/,/g, '')) : NaN
    if (phase !== 'shown' || !match || !Number.isFinite(target) || target <= 0) {
      setShown(null)
      return
    }

    const [, prefix = '', numStr = '', suffix = ''] = match
    const decimals = (numStr.split('.')[1] || '').length
    const grouped = numStr.includes(',')
    const start = performance.now()
    let raf = 0

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // Ease out cubic: quick off the mark, settles rather than stopping dead.
      const eased = 1 - Math.pow(1 - t, 3)
      const current = target * eased
      const text = grouped ? Math.round(current).toLocaleString('en-US') : current.toFixed(decimals)
      if (t < 1) {
        setShown(`${prefix}${text}${suffix}`)
        raf = requestAnimationFrame(tick)
      } else {
        // Land on the authored string exactly, as plain text again.
        setShown(null)
      }
    }

    setShown(`${prefix}${grouped ? '0' : (0).toFixed(decimals)}${suffix}`)
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, value, duration])

  if (shown === null) return <span ref={ref}>{value}</span>

  return (
    <span ref={ref}>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true">{shown}</span>
    </span>
  )
}
