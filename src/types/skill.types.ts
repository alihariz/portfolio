export interface Skill {
  name: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  percentage: number;
  yearsOfExperience?: number;
}

export interface SkillCategory {
  id: string;
  category: string;
  icon: string;
  skills: Skill[];
}

export interface SkillsData {
  skillCategories: SkillCategory[];
}

export interface Certificate {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate: string | null;
  credentialId: string;
  credentialUrl: string;
  score?: string;
  description: string;
  skills: string[];
  badge?: string;
  certificateFile?: string;
  featured: boolean;
}

export interface CertificatesData {
  certificates: Certificate[];
}

export interface Leadership {
  id: string;
  title: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  responsibilities: string[];
  achievements: string[];
  skills: string[];
}

export interface LeadershipData {
  leadership: Leadership[];
}
