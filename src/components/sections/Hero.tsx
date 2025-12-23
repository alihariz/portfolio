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
    <section id="hero" className="min-h-screen flex items-center justify-center pt-16 px-4 sm:px-6 lg:px-8" aria-labelledby="hero-title">
      <div className="max-w-7xl mx-auto w-full">
        <div className="text-center animate-fade-in">
          {/* Greeting */}
          <p className="text-primary-light dark:text-primary-dark text-lg md:text-xl font-medium mb-4">
            Hi, I'm
          </p>

          {/* Name */}
          <h1 id="hero-title" className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-text-primary-light dark:text-text-primary-dark mb-4">
            {personal.name}
          </h1>

          {/* Title & Subtitle */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-text-secondary-light dark:text-text-secondary-dark mb-2">
            {personal.title}
          </h2>
          <p className="text-xl sm:text-2xl text-text-secondary-light dark:text-text-secondary-dark mb-8">
            {personal.subtitle}
          </p>

          {/* Short Summary */}
          <p className="max-w-3xl mx-auto text-lg text-text-secondary-light dark:text-text-secondary-dark mb-12 leading-relaxed">
            Final-year Computer Science student at UTM with industrial experience at MAHB.
            Specialized in full-stack development, machine learning, and system migration.
          </p>

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
              Get In Touch
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
