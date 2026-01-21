import React, { useState } from 'react';
import { ProjectCard } from '../features/ProjectCard';
import { ProjectFilter } from '../features/ProjectFilter';
import { ProjectModal } from '../features/ProjectModal';
import { useFilter } from '../../hooks/useFilter';
import projectsDataRaw from '../../data/projects.json';
import type { Project, ProjectsData } from '../../types/project.types';

const projectsData = projectsDataRaw as ProjectsData;

export const Projects: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const { filters, filteredProjects, updateFilter, resetFilters } = useFilter(projectsData.projects);

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
  };

  const handleCloseModal = () => {
    setSelectedProject(null);
  };

  return (
    <section id="projects" className="py-20 px-4 sm:px-6 lg:px-8" aria-labelledby="projects-heading">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 id="projects-heading" className="text-3xl md:text-4xl font-bold text-text-primary-light dark:text-text-primary-dark mb-4">
            Projects
          </h2>
          <div className="w-20 h-1 bg-primary-light dark:bg-primary-dark mx-auto rounded-full mb-4" />
          <p className="text-text-secondary-light dark:text-text-secondary-dark max-w-2xl mx-auto">
            Selected work across full‑stack development, applied ML, data work, and system migrations.
          </p>
        </div>

        {/* Filters */}
        <ProjectFilter
          searchQuery={filters.searchQuery}
          onSearchChange={(query) => updateFilter('searchQuery', query)}
          selectedCategory={filters.category}
          categories={projectsData.categories}
          onCategoryChange={(category) => updateFilter('category', category)}
          onReset={resetFilters}
          resultCount={filteredProjects.length}
          totalCount={projectsData.projects.length}
        />

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => handleProjectClick(project)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-text-secondary-light dark:text-text-secondary-dark text-lg">
              No projects found matching your filters. Try adjusting your search or resetting filters.
            </p>
          </div>
        )}

        {/* Project Modal */}
        {selectedProject && (
          <ProjectModal project={selectedProject} onClose={handleCloseModal} />
        )}
      </div>
    </section>
  );
};
