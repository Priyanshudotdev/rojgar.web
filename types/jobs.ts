/**
 * Enriched shape for a Job used across the app UI.
 * Matches data returned by Convex queries like `getFilteredJobs` and `getJobPublicById`.
 */
export type EnrichedJob = {
  /** Document id */
  _id: string;
  /** Job title */
  title: string;
  /** Full job description (required on details page) */
  description: string;
  /** Location info */
  location: { city: string; locality?: string };
  /** Salary range */
  salary: { min: number; max: number };
  /** Employment type */
  jobType:
    | 'Full-time'
    | 'Part-time'
    | 'Contract'
    | 'Internship'
    | 'Temporary'
    | string;
  /** Number of positions */
  staffNeeded: number;
  /** Gender requirement (if any) */
  genderRequirement: 'Male' | 'Female' | 'Other' | 'Prefer not to say' | string;
  /** Education/skills requirements */
  educationRequirements: string[];
  /** Experience requirement */
  experienceRequired: string;
  /** Status */
  status: 'Active' | 'Closed' | string;
  /** Created timestamp (ms) */
  createdAt: number;
  /**
   * Minimal company info needed for UI.
   * Currently Convex returns `{ name, photoUrl }` for public job details.
   */
  company?: { name?: string | null; photoUrl?: string | null } | null;
};
