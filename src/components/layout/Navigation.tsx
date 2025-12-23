import React, { useState, useEffect } from 'react';
import { FiMenu, FiX } from 'react-icons/fi';

const navItems = [
  { label: 'About', href: '#about' },
  { label: 'Projects', href: '#projects' },
  { label: 'Skills', href: '#skills' },
  { label: 'Experience', href: '#experience' },
  { label: 'Education', href: '#education' },
  { label: 'Contact', href: '#contact' },
];

export const Navigation: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  const handleNavClick = (href: string) => {
    setIsOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Detect active section on scroll
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-50% 0px -50% 0px',
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(`#${entry.target.id}`);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all sections
    navItems.forEach((item) => {
      const element = document.querySelector(item.href);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center space-x-8">
        {navItems.map((item) => {
          const isActive = activeSection === item.href;
          return (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(item.href);
              }}
              className={`relative text-text-primary-light dark:text-text-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors duration-200 font-medium ${
                isActive ? 'text-primary-light dark:text-primary-dark' : ''
              }`}
            >
              {item.label}
              {isActive && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary-light dark:bg-primary-dark rounded-full" />
              )}
            </a>
          );
        })}
      </nav>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2 rounded-lg hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <FiX className="h-6 w-6 text-text-primary-light dark:text-text-primary-dark" />
        ) : (
          <FiMenu className="h-6 w-6 text-text-primary-light dark:text-text-primary-dark" />
        )}
      </button>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 md:hidden bg-background-light dark:bg-background-dark border-b border-border-light dark:border-border-dark shadow-lg">
          <nav className="flex flex-col p-4 space-y-4">
            {navItems.map((item) => {
              const isActive = activeSection === item.href;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(item.href);
                  }}
                  className={`text-text-primary-light dark:text-text-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors duration-200 font-medium py-2 ${
                    isActive ? 'text-primary-light dark:text-primary-dark border-l-4 border-primary-light dark:border-primary-dark pl-4' : ''
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
};
