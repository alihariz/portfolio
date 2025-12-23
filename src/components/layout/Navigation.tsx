import React, { useState } from 'react';
import { FiMenu, FiX } from 'react-icons/fi';

const navItems = [
  { label: 'About', href: '#about' },
  { label: 'Education', href: '#education' },
  { label: 'Experience', href: '#experience' },
  { label: 'Projects', href: '#projects' },
  { label: 'Skills', href: '#skills' },
  { label: 'Contact', href: '#contact' },
];

export const Navigation: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleNavClick = (href: string) => {
    setIsOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center space-x-8">
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            onClick={(e) => {
              e.preventDefault();
              handleNavClick(item.href);
            }}
            className="text-text-primary-light dark:text-text-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors duration-200 font-medium"
          >
            {item.label}
          </a>
        ))}
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
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.href);
                }}
                className="text-text-primary-light dark:text-text-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors duration-200 font-medium py-2"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </>
  );
};
