import { useState, useMemo } from 'react';
import { Project, ProjectFilters } from '../types/project.types';

export const useFilter = (projects: Project[]) => {
  const [filters, setFilters] = useState<ProjectFilters>({
    category: 'All',
    technologies: [],
    status: [],
    searchQuery: '',
  });

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Category filter
      if (filters.category !== 'All' && project.category !== filters.category) {
        return false;
      }

      // Technology filter
      if (filters.technologies.length > 0) {
        const hasMatchingTech = filters.technologies.some((tech) =>
          project.technologies.some((projectTech) =>
            projectTech.toLowerCase().includes(tech.toLowerCase())
          )
        );
        if (!hasMatchingTech) return false;
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(project.status)) {
        return false;
      }

      // Search query filter
      if (filters.searchQuery.trim() !== '') {
        const query = filters.searchQuery.toLowerCase();
        const searchableText = [
          project.title,
          project.description,
          project.shortDescription,
          ...project.technologies,
          ...project.tags,
        ].join(' ').toLowerCase();

        if (!searchableText.includes(query)) return false;
      }

      return true;
    });
  }, [projects, filters]);

  const updateFilter = (key: keyof ProjectFilters, value: unknown) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      category: 'All',
      technologies: [],
      status: [],
      searchQuery: '',
    });
  };

  const allTechnologies = useMemo(() => {
    const techSet = new Set<string>();
    projects.forEach((project) => {
      project.technologies.forEach((tech) => techSet.add(tech));
    });
    return Array.from(techSet).sort();
  }, [projects]);

  return {
    filters,
    filteredProjects,
    updateFilter,
    resetFilters,
    allTechnologies,
  };
};
