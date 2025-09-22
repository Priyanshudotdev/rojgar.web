export type EnrichedJob = {
  _id: string;
  title: string;
  description?: string;
  location: { city: string; locality?: string };
  salary: { min: number; max: number };
  jobType: string;
  staffNeeded: number;
  educationRequirements?: string[];
  experienceRequired?: string;
  createdAt?: number;
  company?: { name?: string | null; photoUrl?: string | null } | null;
};
