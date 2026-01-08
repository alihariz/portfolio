import React from 'react';
import { FiGithub, FiLinkedin, FiMail } from 'react-icons/fi';
import profileData from '../../data/profile.json';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-surface-light dark:bg-surface-dark border-t border-border-light dark:border-border-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-4">
              Ali Hariz Bin Anuari , CTFL
            </h3>
            <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm">
              Software Engineering Student at Universiti Teknologi Malaysia.
              Passionate about full-stack development and machine learning.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2">
              {['About', 'Projects', 'Skills', 'Contact'].map((item) => (
                <li key={item}>
                  <a
                    href={`#${item.toLowerCase()}`}
                    className="text-text-secondary-light dark:text-text-secondary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors text-sm"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-4">
              Connect
            </h3>
            <div className="flex space-x-4">
              {profileData.social.github && (
                <a
                  href={profileData.social.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-background-light dark:bg-background-dark hover:bg-primary-light/10 dark:hover:bg-primary-dark/10 text-text-primary-light dark:text-text-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-all focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:ring-offset-2"
                  aria-label="Visit GitHub profile"
                >
                  <FiGithub className="h-5 w-5" />
                </a>
              )}
              {profileData.social.linkedin && (
                <a
                  href={profileData.social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-background-light dark:bg-background-dark hover:bg-primary-light/10 dark:hover:bg-primary-dark/10 text-text-primary-light dark:text-text-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-all focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:ring-offset-2"
                  aria-label="Visit LinkedIn profile"
                >
                  <FiLinkedin className="h-5 w-5" />
                </a>
              )}
              <a
                href={`mailto:${profileData.personal.email}`}
                className="p-2 rounded-lg bg-background-light dark:bg-background-dark hover:bg-primary-light/10 dark:hover:bg-primary-dark/10 text-text-primary-light dark:text-text-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-all focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:ring-offset-2"
                aria-label="Send email"
              >
                <FiMail className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-8 border-t border-border-light dark:border-border-dark text-center">
          <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm">
            © {currentYear} Ali Hariz Bin Anuari. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
