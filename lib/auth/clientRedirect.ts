'use client';

export type DashboardRole = 'company' | 'job-seeker';

export function getDashboardPathByRole(role: DashboardRole): string {
  return role === 'company' ? '/dashboard/company' : '/dashboard/job-seeker';
}
