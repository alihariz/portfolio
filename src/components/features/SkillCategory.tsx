import React, { useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import type { SkillCategory as SkillCategoryType } from '../../types/skill.types';

interface SkillCategoryProps {
  category: SkillCategoryType;
}

export const SkillCategory: React.FC<SkillCategoryProps> = ({ category }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Expert':
        return 'bg-green-500 dark:bg-green-400';
      case 'Advanced':
        return 'bg-blue-500 dark:bg-blue-400';
      case 'Intermediate':
        return 'bg-yellow-500 dark:bg-yellow-400';
      case 'Beginner':
        return 'bg-gray-500 dark:bg-gray-400';
      default:
        return 'bg-primary-light dark:bg-primary-dark';
    }
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-background-light dark:hover:bg-background-dark transition-colors"
      >
        <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
          {category.category}
        </h3>
        {isExpanded ? (
          <FiChevronUp className="h-5 w-5 text-text-secondary-light dark:text-text-secondary-dark" />
        ) : (
          <FiChevronDown className="h-5 w-5 text-text-secondary-light dark:text-text-secondary-dark" />
        )}
      </button>

      {/* Skills */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-4">
          {category.skills.map((skill, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
                  {skill.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                    {skill.level}
                  </span>
                  {skill.yearsOfExperience !== undefined && (
                    <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                      ({skill.yearsOfExperience}y)
                    </span>
                  )}
                </div>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-background-light dark:bg-background-dark rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full ${getLevelColor(skill.level)} transition-all duration-500 rounded-full`}
                  style={{ width: `${skill.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
