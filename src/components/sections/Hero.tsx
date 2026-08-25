import { useState } from 'react'
import type { Profile } from '../../lib/site'
import { Button } from '../ui/primitives'

/**
 * Portrait, with a three-step source chain and a link out to LinkedIn.
 *
 * LinkedIn cannot be the image source: the profile picture only comes from the
 * OpenID Connect userinfo endpoint with a user access token, so there is no
 * anonymous URL, and the media.licdn.com URLs it returns are signed and
 * rotate. GitHub serves a permanent public avatar at github.com/<user>.png,
 * which makes a good fallback — change it there and this updates with no
 * deploy.
 */
function Portrait({ src, name, github, linkedin }: { src?: string; name: string; github?: string; linkedin?: string }) {
  const ghUser = github?.replace(/\/+$/, '').split('/').pop()
  const chain = [src, ghUser ? `https://github.com/${ghUser}.png?size=640` : undefined].filter(Boolean) as string[]

  const [step, setStep] = useState(0)
  const current = chain[step]

  const initials = name
    .split(/\s+/)
    .filter((w) => !/^bin$|^binti$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')

  const circle =
    'flex h-[132px] w-[132px] items-center justify-center overflow-hidden rounded-pill border border-divider bg-sage-200 transition-transform duration-200 hover:scale-[1.02] dark:bg-sage-800 lg:h-[300px] lg:w-[300px]'

  const inner = current ? (
    <img
      key={current}
      src={current}
      alt={`Portrait of ${name}`}
      width={300}
      height={300}
      loading="eager"
      decoding="async"
      referrerPolicy="no-referrer"
      className="washed h-full w-full object-cover"
      onError={() => setStep((s) => s + 1)}
    />
  ) : (
    <span className="font-heading text-display text-sage-800 dark:text-sage-100 lg:text-display-lg" aria-hidden="true">
      {initials}
    </span>
  )

  if (!linkedin) return <div className={circle}>{inner}</div>

  return (
    <a href={linkedin} target="_blank" rel="noreferrer noopener" aria-label={`${name} on LinkedIn`} className={`${circle} cursor-pointer`}>
      {inner}
    </a>
  )
}

export function Hero({ profile }: { profile: Profile }) {
  return (
    <section id="top" className="shell pb-8 pt-32">
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_auto] lg:gap-24">
        <div className="order-2 lg:order-1">
          {profile.availability && (
            <p className="flex items-start gap-2 text-small text-muted">
              <span className="mt-[7px] inline-block h-2 w-2 shrink-0 rounded-pill bg-sage" aria-hidden="true" />
              <span>{profile.availability}</span>
            </p>
          )}

          <h1 className="mt-4 text-display sm:text-display-lg">{profile.name}</h1>
          <p className="mt-3 text-lead text-accent-text sm:text-lead-lg">{profile.headline}</p>
          <p className="mt-6 max-w-prose text-body-lg">{profile.intro}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button as="a" href="#projects">
              See the work
            </Button>
            {profile.links.resume && (
              <Button as="a" href={profile.links.resume} download variant="secondary">
                Résumé (PDF)
              </Button>
            )}
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <Portrait
            src={profile.portrait}
            name={profile.name}
            github={profile.links.github}
            linkedin={profile.links.linkedin}
          />
        </div>
      </div>
    </section>
  )
}
