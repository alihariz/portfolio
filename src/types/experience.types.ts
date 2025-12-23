export interface Accomplishment {
  title: string;
  description: string;
  impact: string;
  technologies: string[];
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  department: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  type: 'Full-time' | 'Part-time' | 'Internship' | 'Contract';
  logo?: string;
  accomplishments: Accomplishment[];
  skills: string[];
}

export interface ExperienceData {
  experience: Experience[];
}
