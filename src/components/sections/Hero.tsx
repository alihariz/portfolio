import React from 'react';
import { FiDownload, FiMail, FiGithub, FiLinkedin } from 'react-icons/fi';
import { Button } from '../ui/Button';
import profileData from '../../data/profile.json';

export const Hero: React.FC = () => {
  const { personal, social } = profileData;

  const handleContactClick = () => {
    const element = document.querySelector('#contact');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center pt-16 px-4 sm:px-6 lg:px-8 overflow-hidden" aria-labelledby="hero-title">
      {/* Decorative glows */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary-light/10 dark:bg-primary-dark/10 blur-3xl" />
        <div className="absolute top-16 -right-24 h-[28rem] w-[28rem] rounded-full bg-secondary-light/10 dark:bg-secondary-dark/10 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 h-[32rem] w-[32rem] rounded-full bg-primary-light/5 dark:bg-primary-dark/5 blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto w-full">
        <div className="text-center animate-fade-in">
          {/* Greeting */}
          <p className="text-primary-light dark:text-primary-dark text-lg md:text-xl font-medium mb-4">
            Hi, I'm
          </p>

          {/* Name */}
          <h1 id="hero-title" className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight bg-gradient-to-r from-primary-light to-secondary-light dark:from-primary-dark dark:to-secondary-dark bg-clip-text text-transparent">
            {personal.name}
          </h1>

          {/* Title & Subtitle */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-text-secondary-light dark:text-text-secondary-dark mb-2">
            {personal.title}
          </h2>
          <p className="text-xl sm:text-2xl text-text-secondary-light dark:text-text-secondary-dark mb-4">
            {personal.subtitle}
          </p>

          {/* Value Proposition */}
          <p className="max-w-3xl mx-auto text-lg text-text-secondary-light dark:text-text-secondary-dark mb-12 leading-relaxed">
            I build software that solves operational problems—from modernizing legacy systems to automating repetitive workflows with applied ML.
          </p>

          {/* Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {['Full‑stack delivery', 'Applied ML', 'System migrations', 'Technical documentation'].map((item) => (
              <span
                key={item}
                className="px-4 py-2 rounded-full text-sm font-medium bg-surface-light/70 dark:bg-surface-dark/60 border border-border-light/70 dark:border-border-dark/70 text-text-primary-light dark:text-text-primary-dark"
              >
                {item}
              </span>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button
              href={social.resume}
              download
              variant="primary"
              className="w-full sm:w-auto transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <FiDownload className="inline mr-2" />
              Download Resume
            </Button>
            <Button
              onClick={handleContactClick}
              variant="outline"
              className="w-full sm:w-auto transform hover:scale-105"
            >
              <FiMail className="inline mr-2" />
              Contact
            </Button>
          </div>

          {/* Social Links */}
          <div className="flex items-center justify-center gap-6">
            {social.github && (
              <a
                href={social.github}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-full bg-surface-light dark:bg-surface-dark hover:bg-primary-light/10 dark:hover:bg-primary-dark/10 text-text-primary-light dark:text-text-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-all transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:ring-offset-2"
                aria-label="Visit GitHub profile"
              >
                <FiGithub className="h-6 w-6" />
              </a>
            )}
            {social.linkedin && (
              <a
                href={social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-full bg-surface-light dark:bg-surface-dark hover:bg-primary-light/10 dark:hover:bg-primary-dark/10 text-text-primary-light dark:text-text-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-all transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:ring-offset-2"
                aria-label="Visit LinkedIn profile"
              >
                <FiLinkedin className="h-6 w-6" />
              </a>
            )}
            <a
              href={`mailto:${personal.email}`}
              className="p-3 rounded-full bg-surface-light dark:bg-surface-dark hover:bg-primary-light/10 dark:hover:bg-primary-dark/10 text-text-primary-light dark:text-text-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-all transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:ring-offset-2"
              aria-label="Send email"
            >
              <FiMail className="h-6 w-6" />
            </a>
          </div>

          {/* Scroll Indicator */}
          <div className="mt-16 animate-bounce" aria-hidden="true">
            <svg
              className="mx-auto h-6 w-6 text-text-secondary-light dark:text-text-secondary-dark"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};
