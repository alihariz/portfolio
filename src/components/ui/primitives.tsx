import React from 'react'
import { CountUp } from '../../lib/motion'

/* ── Tags ─────────────────────────────────────────────────────────────────
   Sage marks provenance (Enterprise vs Academic), terracotta marks weight
   (Flagship). A project never wears both colours for the same fact.        */

type TagTone = 'accent' | 'sage' | 'neutral' | 'outline'

const TAG_TONE: Record<TagTone, string> = {
  accent: 'bg-accent-200 text-accent-800 dark:bg-accent-800 dark:text-accent-100',
  sage: 'bg-sage-200 text-sage-800 dark:bg-sage-800 dark:text-sage-100',
  neutral: 'bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100',
  outline: 'border border-accent text-accent-text bg-transparent',
}

export function Tag({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: React.ReactNode
  tone?: TagTone
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-3 py-1 text-small font-semibold leading-none ${TAG_TONE[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

/** Provenance tag: Enterprise / Academic / Personal, plus in-progress status. */
export function TypeTag({ type }: { type: string }) {
  return <Tag tone={type === 'Enterprise' ? 'sage' : 'neutral'}>{type}</Tag>
}

export function StatusTag({ status }: { status: string }) {
  if (status !== 'In Progress') return null
  return <Tag tone="outline">In progress</Tag>
}

/* ── Buttons — pills, 44px effective target ───────────────────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  // Deviation from the design board, on purpose. Cream text on the base accent
  // (#c67139) measures 3.30:1 — the system's own readme notes the accent pair
  // is tuned to 3:1, which covers chrome and large type but not a 15px button
  // label. Step 700 keeps the same terracotta family at 6.22:1. Dark mode uses
  // the light accent with dark ink, which already measures 6.83:1.
  primary:
    'bg-accent-700 text-neutral-100 hover:bg-accent-800 active:bg-accent-900 dark:bg-accent-400 dark:text-neutral-900 dark:hover:bg-accent-300',
  secondary:
    'border border-divider text-ink hover:bg-accent-100 active:bg-accent-200 dark:hover:bg-neutral-800',
  ghost: 'text-accent-text hover:bg-accent-100 dark:hover:bg-neutral-800',
}

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-pill px-6 min-h-[44px] text-body font-semibold transition-colors duration-150 disabled:opacity-45 disabled:pointer-events-none'

export function Button({
  variant = 'primary',
  className = '',
  as = 'button',
  ...props
}: {
  variant?: ButtonVariant
  className?: string
  as?: 'button' | 'a'
} & React.ButtonHTMLAttributes<HTMLButtonElement> &
  React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const cls = `${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${className}`
  if (as === 'a') return <a className={cls} {...props} />
  return <button className={cls} {...props} />
}

export function IconButton({
  label,
  children,
  className = '',
  ...props
}: { label: string; children: React.ReactNode; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-pill text-ink transition-colors duration-150 hover:bg-accent-100 active:bg-accent-200 dark:hover:bg-neutral-800 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

/* ── Section furniture ────────────────────────────────────────────────── */

export function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-kicker font-semibold uppercase text-accent-text">{children}</div>
  )
}

/** Flush left, no rule — the system prefers whitespace to dividers. */
export function SectionHeader({
  index,
  label,
  title,
  lead,
  id,
}: {
  index: string
  label: string
  title: string
  lead?: string
  id?: string
}) {
  return (
    <header id={id} className="mb-8 max-w-prose scroll-mt-24">
      <Kicker>
        {index} — {label}
      </Kicker>
      <h2 className="mt-2 text-h2 sm:text-h2-lg">{title}</h2>
      {lead && <p className="mt-3 text-body-lg text-muted">{lead}</p>}
    </header>
  )
}

/* ── Metric — the one place numbers are allowed to go large ───────────── */

export function MetricBlock({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-heading text-metric leading-none sm:text-metric-lg">
        <CountUp value={value} />
      </div>
      <div className="mt-1 text-small text-muted">{label}</div>
    </div>
  )
}

/* ── Photographs sit back into the ground ─────────────────────────────── */

export function Washed({
  src,
  alt,
  className = '',
  loading = 'lazy',
  fit = 'contain',
}: {
  src: string
  alt: string
  className?: string
  loading?: 'lazy' | 'eager'
  /** Screenshots need `contain` — cropping a UI to fill a box usually lands
      on an empty region and reads as a blank card. Photos can `cover`. */
  fit?: 'cover' | 'contain'
}) {
  return (
    <div className={`overflow-hidden rounded-md bg-neutral-200 p-2 dark:bg-neutral-800 ${className}`}>
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        className={`washed h-full w-full rounded-sm ${fit === 'cover' ? 'object-cover' : 'object-contain'}`}
      />
    </div>
  )
}
