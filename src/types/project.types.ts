export interface ProjectLinks {
  demo?: string;
  github?: string;
  documentation?: string;
  live?: string;
}

export interface Project {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  type: 'Enterprise' | 'Academic' | 'Personal' | 'Open Source';
  status: 'Completed' | 'In Progress' | 'Planned';
  featured: boolean;
  startDate: string;
  endDate: string;
  shortDescription: string;
  description: string;
  technologies: string[];
  achievements: string[];
  responsibilities: string[];
  links: ProjectLinks;
  images: string[];
  tags: string[];
}

export interface ProjectsData {
  projects: Project[];
  categories: string[];
}

export interface ProjectFilters {
  category: string;
  technologies: string[];
  status: string[];
  searchQuery: string;
}
