// Centralized role derivation and redirect helpers for authenticated users
// Role preference order: profile.companyData -> profile.jobSeekerData -> user.role
// No fallback route on unknown role; caller should handle null

export type Role = 'company' | 'job-seeker';
export interface MinimalProfile {
  companyData?: unknown;
  jobSeekerData?: unknown;
}
export interface MinimalUser {
  role?: Role | null;
}
export type DerivedRole = Role | null;

export function deriveUserRole(
  profile: MinimalProfile | null | undefined,
  user?: MinimalUser | null,
): DerivedRole {
  if (profile?.companyData) return 'company';
  if (profile?.jobSeekerData) return 'job-seeker';
  const role = user?.role ?? null;
  if (role === 'company' || role === 'job-seeker') return role;
  return null;
}

export function redirectToDashboard(
  profile: MinimalProfile | null | undefined,
  userRole?: string,
): string | null {
  const roleInput =
    userRole === 'company' || userRole === 'job-seeker'
      ? (userRole as Role)
      : null;
  const role = deriveUserRole(profile, { role: roleInput });
  if (role === 'company') return '/dashboard/company';
  if (role === 'job-seeker') return '/dashboard/job-seeker';
  return null;
}
