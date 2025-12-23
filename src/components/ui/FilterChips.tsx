import React from 'react';

interface FilterChipsProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  options,
  selected,
  onChange,
  className = '',
}) => {
  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            onClick={() => toggleOption(option)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              isSelected
                ? 'bg-primary-light dark:bg-primary-dark text-white'
                : 'bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark border border-border-light dark:border-border-dark hover:border-primary-light dark:hover:border-primary-dark'
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
};
