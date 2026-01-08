import React from 'react';
import { FiCalendar, FiTag, FiExternalLink, FiGithub } from 'react-icons/fi';
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
    <Card
      hover
      className={project.featured
        ? 'border-2 border-primary-light dark:border-primary-dark shadow-lg shadow-primary-light/20 dark:shadow-primary-dark/20'
        : 'border border-border-light dark:border-border-dark'
      }
    >
      <article
        onClick={onClick}
        className="cursor-pointer focus-within:ring-2 focus-within:ring-primary-light dark:focus-within:ring-primary-dark rounded-lg outline-none group"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
        aria-label={`View details for ${project.title}`}
      >
        {/* Project Image */}
        {project.images && project.images.length > 0 ? (
          <div className="mb-4 -mx-6 -mt-6 overflow-hidden rounded-t-lg">
            <img
              src={project.images[0]}
              alt={project.title}
              className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="mb-4 -mx-6 -mt-6 h-48 bg-gradient-to-br from-primary-light/20 to-secondary-light/20 dark:from-primary-dark/20 dark:to-secondary-dark/20 flex items-center justify-center rounded-t-lg">
            <div className="text-center px-6">
              <div className="text-4xl mb-2">
                {project.category === 'Machine Learning' ? '🤖' :
                 project.category === 'Full-Stack Development' ? '💻' :
                 project.category === 'Data Engineering' ? '📊' :
                 project.category === 'Software Design' ? '🎨' : '📁'}
              </div>
              <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark font-medium">
                {project.category}
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            {project.featured && (
              <Badge variant="primary">
                ⭐ Featured
              </Badge>
            )}
            <Badge className="text-xs">{project.type}</Badge>
          </div>
          <h3 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-2 group-hover:text-primary-light dark:group-hover:text-primary-dark transition-colors">
            {project.title}
          </h3>
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-2">
            {project.subtitle}
          </p>
        </div>

        {/* Description */}
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-3 leading-relaxed line-clamp-2">
          {project.shortDescription}
        </p>

        {/* Quick Preview - Show one key achievement */}
        {project.achievements && project.achievements.length > 0 && (
          <div className="mb-4 p-3 bg-primary-light/5 dark:bg-primary-dark/5 rounded-md border-l-2 border-primary-light dark:border-primary-dark">
            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark leading-relaxed">
              <span className="font-semibold text-primary-light dark:text-primary-dark">Key highlight:</span> {project.achievements[0]}
            </p>
          </div>
        )}

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
          <div className="flex flex-wrap gap-2 min-h-[2rem]">
            {project.technologies.slice(0, 4).map((tech, index) => (
              <Badge key={index} className="text-xs">{tech}</Badge>
            ))}
            {project.technologies.length > 4 && (
              <Badge className="text-xs bg-text-secondary-light/10 dark:bg-text-secondary-dark/10">
                +{project.technologies.length - 4}
              </Badge>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          {(project.links.demo || project.links.live) && (
            <a
              href={project.links.demo || project.links.live}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 py-3 px-4 rounded-lg bg-primary-light dark:bg-primary-dark text-white font-semibold hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:ring-offset-2 shadow-md hover:shadow-lg"
              aria-label={`View live demo of ${project.title}`}
            >
              <FiExternalLink className="h-4 w-4" />
              Live Demo
            </a>
          )}
          {project.links.github && (
            <a
              href={project.links.github}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`${(project.links.demo || project.links.live) ? 'flex-1' : 'w-full'} py-3 px-4 rounded-lg bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-primary-light dark:text-text-primary-dark font-medium hover:border-primary-light dark:hover:border-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:ring-offset-2`}
              aria-label={`View source code of ${project.title} on GitHub`}
            >
              <FiGithub className="h-4 w-4" />
              Source
            </a>
          )}
        </div>
        <button
          className="w-full mt-3 py-2.5 px-4 rounded-lg text-primary-light dark:text-primary-dark font-semibold hover:bg-primary-light/10 dark:hover:bg-primary-dark/10 transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:ring-offset-2 border border-primary-light/20 dark:border-primary-dark/20 hover:border-primary-light/50 dark:hover:border-primary-dark/50"
          aria-label={`View full details for ${project.title}`}
        >
          <span>View Case Study</span>
          <span className="text-lg transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
        </button>
      </article>
    </Card>
  );
};
