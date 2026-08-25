import { useState } from 'react'
import type { Profile, Section } from '../../lib/site'
import { Button, SectionHeader } from '../ui/primitives'

const FIELD =
  'min-h-[44px] w-full rounded-pill border border-divider bg-bg px-5 text-body placeholder:text-muted focus:border-accent'

export function Contact({ profile, section, index }: { profile: Profile; section: Section; index: string }) {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)

    // Honeypot — bots fill hidden fields, people don't.
    if (data.get('company_url')) {
      setSent(true)
      return
    }

    if (!data.get('email') || !data.get('message')) {
      setError('An email address and a message, and I can reply properly.')
      return
    }

    // No backend on this host, so hand off to the visitor's mail client rather
    // than pretending to send and silently dropping the message.
    const subject = encodeURIComponent(`Hello from ${data.get('name') || 'your site'}`)
    const body = encodeURIComponent(`${data.get('message')}\n\n— ${data.get('name')}\n${data.get('email')}`)
    window.location.href = `mailto:${profile.email}?subject=${subject}&body=${body}`
    setSent(true)
  }

  const linkedin = profile.links.linkedin?.replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '')
  const github = profile.links.github?.replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '')

  return (
    <section className="shell py-16">
      <SectionHeader id={section.id} index={index} label="Contact" title={section.title} lead={section.lead} />

      <div className="rounded-lg bg-surface p-6 sm:p-12">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <ul className="space-y-2">
              <li>
                <a className="text-body font-semibold text-accent-text underline" href={`mailto:${profile.email}`}>
                  {profile.email}
                </a>
              </li>
              {linkedin && (
                <li>
                  <a className="text-body font-semibold text-accent-text underline" href={profile.links.linkedin} target="_blank" rel="noreferrer noopener">
                    {linkedin}
                  </a>
                </li>
              )}
              {github && (
                <li>
                  <a className="text-body font-semibold text-accent-text underline" href={profile.links.github} target="_blank" rel="noreferrer noopener">
                    {github}
                  </a>
                </li>
              )}
            </ul>

            <p className="mt-4 text-small text-muted">{profile.location}</p>

            {profile.links.resume && (
              <Button as="a" href={profile.links.resume} download variant="secondary" className="mt-8">
                Download résumé (PDF)
              </Button>
            )}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-small font-semibold" htmlFor="name">
                Name
              </label>
              <input id="name" name="name" className={FIELD} placeholder="Your name" autoComplete="name" />
            </div>

            <div>
              <label className="mb-2 block text-small font-semibold" htmlFor="email">
                Email
              </label>
              <input id="email" name="email" type="email" className={FIELD} placeholder="you@example.com" autoComplete="email" />
            </div>

            <div>
              <label className="mb-2 block text-small font-semibold" htmlFor="message">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                className="w-full rounded-lg border border-divider bg-bg px-5 py-3 text-body placeholder:text-muted focus:border-accent"
                placeholder="Whatever's on your mind."
              />
            </div>

            <input
              type="text"
              name="company_url"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute h-0 w-0 overflow-hidden opacity-0"
            />

            {error && <p className="text-small text-accent-text">{error}</p>}
            {sent && <p className="text-small text-sage-text">Thanks — your mail client should have opened.</p>}

            <Button type="submit">Send message</Button>
          </form>
        </div>
      </div>
    </section>
  )
}
