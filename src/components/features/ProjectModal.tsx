import React from 'react';
import { FiX, FiCalendar, FiExternalLink, FiGithub } from 'react-icons/fi';
import { Badge } from '../ui/Badge';
import type { Project } from '../../types/project.types';

interface ProjectModalProps {
  project: Project;
  onClose: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ project, onClose }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Handle escape key to close modal
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="bg-background-light dark:bg-background-dark rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark p-6 flex items-start justify-between">
          <div className="flex-1">
            {(project.links.demo || project.links.live) ? (
              <a
                href={project.links.demo || project.links.live}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mb-2 hover:text-primary-light dark:hover:text-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:ring-offset-2 rounded"
                aria-label={`Visit live demo of ${project.title}`}
              >
                <h2 id="modal-title">{project.title}</h2>
                <FiExternalLink className="h-5 w-5" />
              </a>
            ) : (
              <h2 id="modal-title" className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mb-2">
                {project.title}
              </h2>
            )}
            <p className="text-text-secondary-light dark:text-text-secondary-dark">{project.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:ring-offset-2"
            aria-label="Close project details modal"
          >
            <FiX className="h-6 w-6 text-text-primary-light dark:text-text-primary-dark" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Meta Info */}
          <div className="flex flex-wrap gap-4 text-sm text-text-secondary-light dark:text-text-secondary-dark">
            <div className="flex items-center gap-2">
              <FiCalendar className="h-4 w-4" />
              <span>{formatDate(project.startDate)} - {project.endDate ? formatDate(project.endDate) : 'Present'}</span>
            </div>
            <Badge variant={project.status === 'Completed' ? 'success' : 'warning'}>
              {project.status}
            </Badge>
            <Badge>{project.type}</Badge>
            <Badge>{project.category}</Badge>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-3">
              Description
            </h3>
            <p className="text-text-secondary-light dark:text-text-secondary-dark leading-relaxed">
              {project.description}
            </p>
          </div>

          {/* Achievements */}
          {project.achievements.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-3">
                Key Achievements
              </h3>
              <ul className="list-disc list-inside space-y-2 text-text-secondary-light dark:text-text-secondary-dark">
                {project.achievements.map((achievement, index) => (
                  <li key={index}>{achievement}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Responsibilities */}
          {project.responsibilities.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-3">
                Responsibilities
              </h3>
              <ul className="list-disc list-inside space-y-2 text-text-secondary-light dark:text-text-secondary-dark">
                {project.responsibilities.map((responsibility, index) => (
                  <li key={index}>{responsibility}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Technologies */}
          <div>
            <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-3">
              Technologies Used
            </h3>
            <div className="flex flex-wrap gap-2">
              {project.technologies.map((tech, index) => (
                <Badge key={index}>{tech}</Badge>
              ))}
            </div>
          </div>

          {/* Links */}
          {(project.links.demo || project.links.github || project.links.live) && (
            <div>
              <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-3">
                Links
              </h3>
              <div className="flex flex-wrap gap-3">
                {project.links.demo && (
                  <a
                    href={project.links.demo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-light dark:bg-primary-dark text-white hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:ring-offset-2"
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
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border-light dark:border-border-dark text-text-primary-light dark:text-text-primary-dark hover:bg-surface-light dark:hover:bg-surface-dark transition-colors focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:ring-offset-2"
                    aria-label={`View source code of ${project.title} on GitHub`}
                  >
                    <FiGithub className="h-4 w-4" />
                    View Source
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
