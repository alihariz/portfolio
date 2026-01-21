import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  className?: string;
  href?: string;
  download?: boolean | string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled = false,
  className = '',
  href,
  download,
}) => {
  const baseStyles = 'px-6 py-3 rounded-lg font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

  const variantStyles = {
    primary: 'bg-primary-light dark:bg-primary-dark text-white hover:opacity-95 hover:shadow-lg focus:ring-primary-light dark:focus:ring-primary-dark',
    secondary: 'bg-secondary-light dark:bg-secondary-dark text-white hover:opacity-95 hover:shadow-lg focus:ring-secondary-light dark:focus:ring-secondary-dark',
    outline: 'border-2 border-primary-light/70 dark:border-primary-dark/70 text-primary-light dark:text-primary-dark hover:bg-primary-light hover:text-white dark:hover:bg-primary-dark dark:hover:text-background-dark focus:ring-primary-light dark:focus:ring-primary-dark',
  };

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${className}`;

  if (href) {
    return (
      <a
        href={href}
        download={download}
        className={combinedClassName}
        target={download ? undefined : '_blank'}
        rel={download ? undefined : 'noopener noreferrer'}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={combinedClassName}
    >
      {children}
    </button>
  );
};
