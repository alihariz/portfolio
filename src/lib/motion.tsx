import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Motion, kept deliberately small.
 *
 * Two effects only: sections fade up as they enter the viewport, and the proof
 * numbers count to their value once. Both are decoration — the page is fully
 * readable and complete without either, which matters because they are also
 * both switched off entirely under prefers-reduced-motion, and because a
 * visitor who scrolls fast should never be waiting on an animation to read
 * something.
 */

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

/** Fires once, when the element first comes near the viewport. */
function useInView<T extends HTMLElement>(rootMargin = '0px 0px -12% 0px') {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || seen) return

    // No IntersectionObserver (or a very old browser): show everything rather
    // than leaving the page permanently blank.
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true)
          io.disconnect()
        }
      },
      { rootMargin, threshold: 0.05 },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [seen, rootMargin])

  return { ref, seen }
}

export function Reveal({
  children,
  delay = 0,
  as: Tag = 'div',
  className = '',
}: {
  children: ReactNode
  delay?: number
  as?: 'div' | 'section' | 'li' | 'article'
  className?: string
}) {
  const reduced = useReducedMotion()
  const { ref, seen } = useInView<HTMLDivElement>()

  if (reduced) return <Tag className={className}>{children}</Tag>

  return (
    <Tag
      ref={ref as never}
      className={`${className} transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ${
        seen ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
      style={{ transitionDelay: seen ? `${delay}ms` : '0ms' }}
    >
      {children}
    </Tag>
  )
}

/**
 * Counts to a number that may be wrapped in other characters — "20,923",
 * "95%+", "67×", "6 months". The non-numeric parts are preserved exactly, so
 * the label reads the same at rest as it did before the animation existed.
 */
export function CountUp({ value, duration = 900 }: { value: string; duration?: number }) {
  const reduced = useReducedMotion()
  const { ref, seen } = useInView<HTMLSpanElement>()
  const [shown, setShown] = useState<string>(value)

  useEffect(() => {
    // Parsed inside the effect, not outside it. A regex match is a fresh array
    // on every render, so having it in the dependency list re-ran this effect
    // after each setShown — cancelling the frame loop and restarting from zero,
    // which left the number stuck a few percent in and never settling.
    const match = value.match(/^(\D*)([\d,]+(?:\.\d+)?)(.*)$/s)
    const target = match ? Number(match[2].replace(/,/g, '')) : NaN
    const animatable = !!match && Number.isFinite(target) && target > 0

    // Not a number, or motion is unwelcome: show the value and stop.
    if (reduced || !animatable || !seen) {
      setShown(value)
      return
    }

    const [, prefix = '', numStr = '', suffix = ''] = match as RegExpMatchArray
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
      setShown(`${prefix}${text}${suffix}`)
      if (t < 1) raf = requestAnimationFrame(tick)
      // Land on the authored string exactly, rather than on whatever the
      // formatter produced for t=1.
      else setShown(value)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seen, reduced, value, duration])

  // aria-label carries the settled value so assistive tech never reads a
  // half-counted number.
  return (
    <span ref={ref} aria-label={value}>
      <span aria-hidden="true">{shown}</span>
    </span>
  )
}
