import type { SessionFormat } from "@/lib/status";

export type MentorProfile = {
  headline?: string;
  bio?: string;
  topics: string[];
  yearsExperience?: number;
  hourlyRate?: number;
  sessionFormats: SessionFormat[];
  isActive: boolean;
};

export type LearnerProfile = {
  goals?: string;
  bio?: string;
};
