// Pure, shared helpers usable by both Convex and Next.js environments

export function normalize(s: string): string {
  return (s ?? '').toString().toLowerCase().trim();
}

export function filterJobsBySearch(query: string, jobs: any[]): any[] {
  const q = normalize(query);
  if (!q) return jobs;
  return (jobs ?? []).filter((j: any) => {
    const hay = [
      j?.title,
      j?.description,
      j?.company?.name,
      j?.location?.city,
      j?.location?.locality,
    ]
      .map((s: any) => normalize(String(s ?? '')))
      .join(' ');
    return hay.includes(q);
  });
}

function textSimilarity(a: string, b: string): number {
  const A = normalize(a).split(/\s+/).filter(Boolean);
  const B = normalize(b).split(/\s+/).filter(Boolean);
  if (A.length === 0 || B.length === 0) return 0;
  const setB = new Set(B);
  const overlap = A.filter((t) => setB.has(t)).length;
  return overlap / Math.max(A.length, B.length);
}

export function isNewJob(job: any, days = 7): boolean {
  const ms = days * 24 * 60 * 60 * 1000;
  return Date.now() - Number(job?.createdAt ?? 0) <= ms;
}

export function isNearbyJob(
  job: any,
  city: string,
  locality?: string,
): boolean {
  const jc = normalize(job?.location?.city ?? '');
  const jl = normalize(job?.location?.locality ?? '');
  const uc = normalize(city ?? '');
  const ul = normalize(locality ?? '');
  if (!uc && !ul) return false;
  const cityMatch = !!uc && !!jc && uc.includes(jc);
  const locMatch = !!ul && !!jl && ul.includes(jl);
  return cityMatch || locMatch;
}

export function isHighSalaryJob(job: any, threshold: number): boolean {
  const max = Number(job?.salary?.max ?? 0);
  return max >= threshold;
}

export function calculateJobRelevanceScore(job: any, profile: any): number {
  let score = 0;
  const role = profile?.jobSeekerData?.jobRole ?? '';
  const skills: string[] = profile?.jobSeekerData?.skills ?? [];
  if (role) score += textSimilarity(job?.title ?? '', role) * 3;
  if (skills.length) {
    const jobText = normalize(
      [job?.title ?? '', job?.description ?? ''].join(' '),
    );
    const hits = (skills as string[])
      .map((s: string) => (jobText.includes(normalize(s)) ? 1 : 0))
      .reduce<number>((a, b) => a + b, 0);
    score += Math.min(hits, 5) * 0.6;
  }
  const userLoc = profile?.jobSeekerData?.location ?? '';
  if (isNearbyJob(job, userLoc, undefined)) score += 1.5;
  if (isNewJob(job)) score += 0.5;
  return score;
}

export function sortJobsByRelevance(jobs: any[], profile: any): any[] {
  return [...(jobs ?? [])]
    .map((j) => ({ j, s: calculateJobRelevanceScore(j, profile) }))
    .sort((a, b) => b.s - a.s)
    .map(({ j }) => j);
}
