import { useState, useCallback } from 'react';

const debounce = <T extends (...args: unknown[]) => void>(func: T, delay: number) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

export const useSearch = (onSearchChange: (query: string) => void) => {
  const [searchQuery, setSearchQuery] = useState('');

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      onSearchChange(query);
    }, 300),
    [onSearchChange]
  );

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const clearSearch = () => {
    setSearchQuery('');
    onSearchChange('');
  };

  return {
    searchQuery,
    handleSearchChange,
    clearSearch,
  };
};
