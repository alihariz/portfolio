import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  onClick,
}) => {
  const baseStyles = 'bg-surface-light/90 dark:bg-surface-dark/90 border border-border-light/80 dark:border-border-dark/80 rounded-xl p-6 shadow-sm shadow-black/5 dark:shadow-black/30 transition-all duration-300';
  const hoverStyles = hover
    ? 'hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-black/40 hover:-translate-y-1 cursor-pointer hover:border-primary-light/30 dark:hover:border-primary-dark/30'
    : '';

  return (
    <div className={`${baseStyles} ${hoverStyles} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
};
