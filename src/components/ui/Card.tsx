import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
}) => {
  const baseStyles = 'bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-6 transition-all duration-300';
  const hoverStyles = hover ? 'hover:shadow-lg hover:-translate-y-1 hover:border-primary-light dark:hover:border-primary-dark cursor-pointer' : '';

  return (
    <div className={`${baseStyles} ${hoverStyles} ${className}`}>
      {children}
    </div>
  );
};
