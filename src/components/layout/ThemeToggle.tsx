import React from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';
import { useTheme } from '../../hooks/useTheme';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark hover:bg-primary-light/10 dark:hover:bg-primary-dark/10 transition-all duration-200"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <FiSun className="h-5 w-5 text-primary-light dark:text-primary-dark" />
      ) : (
        <FiMoon className="h-5 w-5 text-primary-light dark:text-primary-dark" />
      )}
    </button>
  );
};
