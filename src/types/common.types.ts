export interface DateRange {
  startDate: string;
  endDate: string | null;
  current: boolean;
}

export interface Link {
  url: string;
  label: string;
}

export interface SocialLinks {
  linkedin?: string;
  github?: string;
  twitter?: string;
  email?: string;
  resume?: string;
}

export type ThemeMode = 'light' | 'dark';

export type StatusType = 'Completed' | 'In Progress' | 'Planned';
