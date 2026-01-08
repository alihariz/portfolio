import React, { useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import type { SkillCategory as SkillCategoryType } from '../../types/skill.types';

interface SkillCategoryProps {
  category: SkillCategoryType;
}

export const SkillCategory: React.FC<SkillCategoryProps> = ({ category }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const getBadgeStyle = (level: string) => {
    switch (level) {
      case 'Expert':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'Advanced':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Intermediate':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'Beginner':
        return 'bg-gray-100 dark:bg-gray-800/30 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700';
      default:
        return 'bg-primary-light/10 dark:bg-primary-dark/10 text-primary-light dark:text-primary-dark border-primary-light/20 dark:border-primary-dark/20';
    }
  };

  // Group skills by level
  const groupedSkills = category.skills.reduce((acc, skill) => {
    const level = skill.level;
    if (!acc[level]) {
      acc[level] = [];
    }
    acc[level].push(skill);
    return acc;
  }, {} as Record<string, typeof category.skills>);

  // Define level order
  const levelOrder = ['Expert', 'Advanced', 'Intermediate', 'Beginner'];
  const orderedLevels = levelOrder.filter(level => groupedSkills[level]);

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

      {/* Skills - Grouped by Level */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-4">
          {orderedLevels.map((level) => (
            <div key={level}>
              <h4 className="text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider mb-2">
                {level}
              </h4>
              <div className="flex flex-wrap gap-2">
                {groupedSkills[level].map((skill, index) => (
                  <span
                    key={index}
                    className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium border ${getBadgeStyle(skill.level)}`}
                  >
                    {skill.name}
                    {skill.yearsOfExperience !== undefined && (
                      <span className="ml-1.5 opacity-70 text-xs">
                        {skill.yearsOfExperience}y
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
