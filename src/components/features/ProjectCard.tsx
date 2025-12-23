import React from 'react';
import { FiCalendar, FiTag } from 'react-icons/fi';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { Project } from '../../types/project.types';

interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'In Progress':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Card hover className={project.featured ? 'border-primary-light dark:border-primary-dark' : ''}>
      <div onClick={onClick} className="cursor-pointer">
        {/* Header */}
        <div className="mb-4">
          {project.featured && (
            <Badge variant="primary" className="mb-2">
              Featured
            </Badge>
          )}
          <h3 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-2 hover:text-primary-light dark:hover:text-primary-dark transition-colors">
            {project.title}
          </h3>
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-2">
            {project.subtitle}
          </p>
        </div>

        {/* Description */}
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4 leading-relaxed line-clamp-3">
          {project.shortDescription}
        </p>

        {/* Meta Info */}
        <div className="flex items-center justify-between mb-4 text-sm">
          <div className="flex items-center gap-2 text-text-secondary-light dark:text-text-secondary-dark">
            <FiCalendar className="h-4 w-4" />
            <span>{formatDate(project.startDate)}</span>
          </div>
          <Badge variant={getStatusVariant(project.status)}>
            {project.status}
          </Badge>
        </div>

        {/* Technologies */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <FiTag className="h-4 w-4 text-text-secondary-light dark:text-text-secondary-dark" />
            <span className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
              Technologies:
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {project.technologies.slice(0, 5).map((tech, index) => (
              <Badge key={index}>{tech}</Badge>
            ))}
            {project.technologies.length > 5 && (
              <Badge>+{project.technologies.length - 5} more</Badge>
            )}
          </div>
        </div>

        {/* View Details */}
        <button className="w-full mt-4 py-2 text-sm font-medium text-primary-light dark:text-primary-dark hover:underline">
          View Details →
        </button>
      </div>
    </Card>
  );
};
