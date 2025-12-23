export interface Education {
  id: string;
  institution: string;
  degree: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  gpa?: string;
  maxGpa?: string;
  achievements?: string;
  highlights?: string[];
  relevantCourses?: string[];
  certifications?: string[];
}

export interface EducationData {
  education: Education[];
}
