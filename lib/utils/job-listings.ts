import type { EnrichedJob } from '@/types/jobs';

export type SortKey =
  | 'newest'
  | 'oldest'
  | 'salary_desc'
  | 'salary_asc'
  | 'title_asc'
  | 'title_desc'
  | 'relevance';

export function createAdvancedFilters(jobs: EnrichedJob[]) {
  const salaryValues = jobs.flatMap((j) => [j.salary.min, j.salary.max]);
  const salaryMin = Math.min(...salaryValues, 0);
  const salaryMax = Math.max(...salaryValues, 0);
  const types = Array.from(new Set(jobs.map((j) => j.jobType))).sort();
  return { salaryMin, salaryMax, types };
}

export function applyAdvancedFilters(
  jobs: EnrichedJob[],
  filters: {
    jobTypes?: string[];
    salaryMin?: number;
    salaryMax?: number;
    experienceLevels?: string[];
    city?: string;
    locality?: string;
  },
) {
  const norm = (s?: string) => (s ?? '').toLowerCase();
  return jobs.filter((j) => {
    if (
      filters.jobTypes &&
      filters.jobTypes.length > 0 &&
      !filters.jobTypes.includes(j.jobType)
    )
      return false;
    if (
      typeof filters.salaryMin === 'number' &&
      j.salary.max < filters.salaryMin
    )
      return false;
    if (
      typeof filters.salaryMax === 'number' &&
      j.salary.min > filters.salaryMax
    )
      return false;
    if (filters.city && norm(j.location.city) !== norm(filters.city))
      return false;
    if (
      filters.locality &&
      norm(j.location.locality) !== norm(filters.locality)
    )
      return false;
    // experience heuristic
    if (filters.experienceLevels && filters.experienceLevels.length > 0) {
      const exp = norm(j.experienceRequired);
      const any = filters.experienceLevels.some((lvl) =>
        exp.includes(norm(lvl)),
      );
      if (!any) return false;
    }
    return true;
  });
}

export function sortJobs(jobs: EnrichedJob[], sort: SortKey) {
  const normalize = (s?: string) => (s ?? '').toLowerCase();
  switch (sort) {
    case 'oldest':
      return [...jobs].sort((a, b) => a.createdAt - b.createdAt);
    case 'salary_desc':
      return [...jobs].sort((a, b) => b.salary.max - a.salary.max);
    case 'salary_asc':
      return [...jobs].sort((a, b) => a.salary.max - b.salary.max);
    case 'title_asc':
      return [...jobs].sort((a, b) =>
        normalize(a.title).localeCompare(normalize(b.title)),
      );
    case 'title_desc':
      return [...jobs].sort((a, b) =>
        normalize(b.title).localeCompare(normalize(a.title)),
      );
    case 'newest':
    default:
      return [...jobs].sort((a, b) => b.createdAt - a.createdAt);
  }
}

export function categorizeJobs(jobs: EnrichedJob[]) {
  const map = new Map<string, EnrichedJob[]>();
  for (const j of jobs) {
    const key = j.jobType || 'Other';
    map.set(key, [...(map.get(key) ?? []), j]);
  }
  return Array.from(map.entries()).map(([category, items]) => ({
    category,
    items,
  }));
}

export function calculateJobStats(jobs: EnrichedJob[]) {
  const total = jobs.length;
  const today = Date.now() - 24 * 60 * 60 * 1000;
  const newToday = jobs.filter((j) => j.createdAt >= today).length;
  const week = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newThisWeek = jobs.filter((j) => j.createdAt >= week).length;
  const byCategory = categorizeJobs(jobs).map(({ category, items }) => ({
    category,
    count: items.length,
  }));
  return { total, newToday, newThisWeek, byCategory };
}

export function generateFilterChips() {
  return ['Delivery', 'Driver', 'Receptionist', 'Carpenter', 'Security'];
}

export function validateFilterCriteria(v: any) {
  const out = { ...v };
  if (typeof out.salaryMin === 'number' && out.salaryMin < 0) out.salaryMin = 0;
  if (typeof out.salaryMax === 'number' && out.salaryMax < 0) out.salaryMax = 0;
  if (
    typeof out.salaryMin === 'number' &&
    typeof out.salaryMax === 'number' &&
    out.salaryMin > out.salaryMax
  ) {
    const t = out.salaryMin;
    out.salaryMin = out.salaryMax;
    out.salaryMax = t;
  }
  return out;
}

export function optimizeJobQueries(params: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

export function formatJobListings(jobs: any[]): EnrichedJob[] {
  return (jobs ?? []).map((j: any) => ({
    _id: j._id,
    title: j.title ?? 'Untitled Role',
    description: j.description ?? '',
    location: {
      city: j.location?.city ?? 'Unknown',
      locality: j.location?.locality ?? undefined,
    },
    salary: {
      min: Number(j.salary?.min ?? 0),
      max: Number(j.salary?.max ?? 0),
    },
    jobType: j.jobType ?? 'Full-time',
    staffNeeded: Number(j.staffNeeded ?? 1),
    genderRequirement: j.genderRequirement ?? 'Prefer not to say',
    educationRequirements: Array.isArray(j.educationRequirements)
      ? j.educationRequirements
      : [],
    experienceRequired: j.experienceRequired ?? '',
    status: j.status ?? 'Active',
    createdAt: Number(j.createdAt ?? Date.now()),
    company: j.company ?? undefined,
  }));
}

export function createPaginationInfo(
  totalCount: number,
  page: number,
  pageSize: number,
) {
  const totalPages = Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize)));
  const hasMore = page < totalPages;
  return { totalPages, hasMore };
}
