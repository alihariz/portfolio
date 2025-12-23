import React from 'react';
import { Badge } from '../ui/Badge';

interface TimelineItemProps {
  title: string;
  subtitle?: string;
  organization: string;
  location: string;
  date: string;
  current?: boolean;
  description?: string;
  highlights?: string[];
  achievements?: string[];
  technologies?: string[];
  gpa?: string;
  maxGpa?: string;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({
  title,
  subtitle,
  organization,
  location,
  date,
  current = false,
  description,
  highlights,
  achievements,
  technologies,
  gpa,
  maxGpa,
}) => {
  return (
    <div className="relative pl-8 pb-12 last:pb-0">
      {/* Timeline Line */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-border-light dark:bg-border-dark" />

      {/* Timeline Dot */}
      <div className="absolute left-0 top-1 -translate-x-1/2 w-4 h-4 rounded-full bg-primary-light dark:bg-primary-dark border-4 border-background-light dark:border-background-dark" />

      {/* Content */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-6 hover:shadow-lg transition-shadow">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-1">
              {title}
            </h3>
            {subtitle && (
              <p className="text-md text-text-secondary-light dark:text-text-secondary-dark mb-2">
                {subtitle}
              </p>
            )}
            <p className="text-md font-medium text-text-primary-light dark:text-text-primary-dark">
              {organization}
            </p>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              {location}
            </p>
          </div>
          <div className="mt-2 sm:mt-0 sm:text-right">
            <p className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark whitespace-nowrap">
              {date}
            </p>
            {current && (
              <Badge variant="primary" className="mt-2">
                Current
              </Badge>
            )}
            {gpa && (
              <p className="text-lg font-semibold text-primary-light dark:text-primary-dark mt-2">
                GPA: {gpa}/{maxGpa}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="text-text-secondary-light dark:text-text-secondary-dark mb-4 leading-relaxed">
            {description}
          </p>
        )}

        {/* Highlights */}
        {highlights && highlights.length > 0 && (
          <ul className="list-disc list-inside space-y-2 mb-4 text-text-secondary-light dark:text-text-secondary-dark">
            {highlights.map((highlight, index) => (
              <li key={index}>{highlight}</li>
            ))}
          </ul>
        )}

        {/* Achievements */}
        {achievements && achievements.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">
              Achievements:
            </h4>
            <ul className="list-disc list-inside space-y-1 text-text-secondary-light dark:text-text-secondary-dark text-sm">
              {achievements.map((achievement, index) => (
                <li key={index}>{achievement}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Technologies */}
        {technologies && technologies.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {technologies.map((tech, index) => (
              <Badge key={index}>{tech}</Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
