export const ROLE_LABELS: Record<string, string> = {
  'job-seeker': 'Job Seeker',
  'company': 'Employeer', // UI branding label while keeping backend key
};

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}
