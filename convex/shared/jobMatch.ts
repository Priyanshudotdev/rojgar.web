export type Job = {
  _id: string;
  title: string;
  description: string;
  location: { city: string; locality?: string };
  salary: { min: number; max: number };
  jobType: string;
  createdAt: number;
  company?: { name?: string | null; photoUrl?: string | null } | null;
  tags?: string[];
};

export type UserProfile = {
  name?: string | null;
  jobSeekerData?: {
    jobRole?: string | null;
    skills?: string[];
    location?: string | null;
  } | null;
};

export function normalize(str: string) {
  return (str || '').toLowerCase().trim();
}

export function filterJobsBySearch(query: string, jobs: Job[]): Job[] {
  const q = normalize(query);
  if (!q) return jobs;
  return jobs.filter((j) => {
    const hay = [
      j.title,
      j.description,
      j.location?.city,
      j.location?.locality ?? '',
      j.company?.name ?? '',
      ...(j.tags ?? []),
    ]
      .map((s) => normalize(String(s ?? '')))
      .join(' ');
    return hay.includes(q);
  });
}

export function isNewJob(job: Job, days = 7): boolean {
  const ms = days * 24 * 60 * 60 * 1000;
  return Date.now() - job.createdAt <= ms;
}

export function isNearbyJob(job: Job, user: UserProfile): boolean {
  const userLoc = normalize(user.jobSeekerData?.location ?? '');
  if (!userLoc) return false;
  const city = normalize(job.location?.city ?? '');
  const locality = normalize(job.location?.locality ?? '');
  return userLoc.includes(city) || (!!locality && userLoc.includes(locality));
}

export function isHighSalaryJob(
  job: Job,
  marketTopPercentile = 0.75,
  allJobs?: Job[],
): boolean {
  if (!allJobs || allJobs.length === 0)
    return job.salary.max >= job.salary.min * 1.5;
  const sorted = [...allJobs].sort((a, b) => a.salary.max - b.salary.max);
  const idx = Math.floor(sorted.length * marketTopPercentile);
  const threshold = sorted[idx]?.salary.max ?? job.salary.max;
  return job.salary.max >= threshold;
}

export function textSimilarity(a: string, b: string): number {
  const A = normalize(a).split(/\s+/);
  const B = normalize(b).split(/\s+/);
  if (A.length === 0 || B.length === 0) return 0;
  const setB = new Set(B);
  const overlap = A.filter((t) => setB.has(t)).length;
  return overlap / Math.max(A.length, B.length);
}

export function calculateJobRelevanceScore(
  job: Job,
  user: UserProfile,
): number {
  let score = 0;
  const role = user.jobSeekerData?.jobRole ?? '';
  const skills = user.jobSeekerData?.skills ?? [];
  if (role) score += textSimilarity(job.title, role) * 3;
  if (skills.length) {
    const jobText = normalize(
      [job.title, job.description, ...(job.tags ?? [])].join(' '),
    );
    const hits = skills
      .map((s) => (jobText.includes(normalize(s)) ? 1 : 0))
      .reduce<number>((a, b) => a + b, 0);
    score += Math.min(hits, 5) * 0.6;
  }
  if (isNearbyJob(job, user)) score += 1.5;
  if (isNewJob(job)) score += 0.5;
  return score;
}

export function sortJobsByRelevance(jobs: Job[], user: UserProfile): Job[] {
  return [...jobs]
    .map((j) => ({ j, s: calculateJobRelevanceScore(j, user) }))
    .sort((a, b) => b.s - a.s)
    .map(({ j }) => j);
}
