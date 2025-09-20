import { fetchQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';

export type DashboardRole = 'company' | 'job-seeker';
// Simpler and robust against Convex type changes
export type GetProfileRes = { user: any; profile: any } | null;

// Determine if onboarding is complete for the derived role
export function hasCompletedOnboarding(
  profileResult: GetProfileRes | null | undefined,
  role: DashboardRole | null,
): boolean {
  const profile = profileResult?.profile as any;
  if (!profile || !role) return false;
  if (role === 'job-seeker') {
    const js = profile.jobSeekerData;
    // Required fields from schema/flow: jobRole, location, education, experience (string)
    return !!(
      js &&
      js.jobRole &&
      typeof js.jobRole === 'string' &&
      js.jobRole.trim() &&
      js.location &&
      typeof js.location === 'string' &&
      js.location.trim() &&
      js.education &&
      typeof js.education === 'string' &&
      typeof js.experience === 'string' &&
      js.experience.trim()
    );
  }
  if (role === 'company') {
    const co = profile.companyData;
    // Required fields: companyName, companyAddress, contactPerson (names from plan)
    return !!(
      co &&
      co.companyName &&
      typeof co.companyName === 'string' &&
      co.companyName.trim() &&
      co.companyAddress &&
      typeof co.companyAddress === 'string' &&
      co.companyAddress.trim() &&
      co.contactPerson &&
      typeof co.contactPerson === 'string' &&
      co.contactPerson.trim()
    );
  }
  return false;
}

// Derive role from user and profile data using server-side Convex queries
export async function getDerivedRole(
  token: string | undefined | null,
): Promise<DashboardRole | null> {
  if (!token) return null;
  try {
    const user = await fetchQuery(api.auth.getUserBySession, { token });
    if (!user) return null;
    const profRes = await fetchQuery(api.profiles.getProfileByUserId, {
      userId: user._id,
    });
    const role: DashboardRole | null = profRes?.profile?.companyData
      ? 'company'
      : profRes?.profile?.jobSeekerData
        ? 'job-seeker'
        : ((user as any)?.role ?? null);
    return role;
  } catch {
    return null;
  }
}

// Return an onboarding-aware redirect based on role and completion state
export async function getOnboardingAwareRedirect(
  token: string | undefined | null,
): Promise<string | null> {
  if (!token) return null;
  try {
    const user = await fetchQuery(api.auth.getUserBySession, { token });
    if (!user) return null;
    const profRes = await fetchQuery(api.profiles.getProfileByUserId, {
      userId: user._id,
    });
    const role: DashboardRole | null = profRes?.profile?.companyData
      ? 'company'
      : profRes?.profile?.jobSeekerData
        ? 'job-seeker'
        : ((user as any)?.role ?? null);
    if (!role) return null;
    const complete = hasCompletedOnboarding(profRes, role);
    if (!complete)
      return role === 'company'
        ? '/onboarding/company'
        : '/onboarding/job-seeker';
    return role === 'company' ? '/dashboard/company' : '/dashboard/job-seeker';
  } catch {
    return null;
  }
}

export async function getRoleBasedDashboardRedirect(
  token: string | undefined | null,
): Promise<string | null> {
  // Backwards-compatible: now onboarding-aware
  return getOnboardingAwareRedirect(token);
}
