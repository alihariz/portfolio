import React from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { SearchBar } from '../ui/SearchBar';
import { Button } from '../ui/Button';

interface ProjectFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  categories: string[];
  onCategoryChange: (category: string) => void;
  onReset: () => void;
  resultCount: number;
  totalCount: number;
}

export const ProjectFilter: React.FC<ProjectFilterProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  categories,
  onCategoryChange,
  onReset,
  resultCount,
  totalCount,
}) => {
  return (
    <div className="mb-8 space-y-6">
      {/* Search and Reset */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchBar
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="Search projects by name, description, or technology..."
          />
        </div>
        <Button onClick={onReset} variant="outline" className="sm:w-auto">
          <FiRefreshCw className="inline mr-2" />
          Reset
        </Button>
      </div>

      {/* Category Filters */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark mb-3">
          Category
        </h3>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => onCategoryChange(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  isSelected
                    ? 'bg-primary-light dark:bg-primary-dark text-white'
                    : 'bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark border border-border-light dark:border-border-dark hover:border-primary-light dark:hover:border-primary-dark'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
        Showing {resultCount} of {totalCount} projects
      </div>
    </div>
  );
};
