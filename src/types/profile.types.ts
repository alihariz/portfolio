import { SocialLinks } from './common.types';

export interface PersonalInfo {
  name: string;
  title: string;
  subtitle: string;
  email: string;
  alternateEmail?: string;
  phone: string;
  location: string;
  profileImage: string;
  summary: string;
  availableForWork: boolean;
  graduationDate: string;
}

export interface Reference {
  name: string;
  title: string;
  phone: string;
  email: string;
}

export interface Profile {
  personal: PersonalInfo;
  social: SocialLinks;
  reference: Reference;
}
