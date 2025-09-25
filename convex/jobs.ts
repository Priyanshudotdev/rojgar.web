import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import {
  calculateJobRelevanceScore,
  filterJobsBySearch,
  sortJobsByRelevance,
} from '../lib/shared/jobMatch';

// Local enums to mirror schema definitions
const GenderEnum = v.union(
  v.literal('Male'),
  v.literal('Female'),
  v.literal('Other'),
  v.literal('Prefer not to say'),
);
const JobTypeEnum = v.union(
  v.literal('Full-time'),
  v.literal('Part-time'),
  v.literal('Contract'),
  v.literal('Internship'),
  v.literal('Temporary'),
);
const JobStatusEnum = v.union(v.literal('Active'), v.literal('Closed'));

// Sorting options for listings
const SortEnum = v.union(
  v.literal('newest'),
  v.literal('oldest'),
  v.literal('salary_desc'),
  v.literal('salary_asc'),
  v.literal('title_asc'),
  v.literal('title_desc'),
  v.literal('relevance'),
);

function normalize(s: string | undefined | null) {
  return (s ?? '').toString().trim().toLowerCase();
}

function applySortGeneric(items: any[], sort: string | undefined) {
  switch (sort) {
    case 'oldest':
      return [...items].sort((a, b) => a.createdAt - b.createdAt);
    case 'salary_desc':
      return [...items].sort(
        (a, b) => (b.salary?.max ?? 0) - (a.salary?.max ?? 0),
      );
    case 'salary_asc':
      return [...items].sort(
        (a, b) => (a.salary?.max ?? 0) - (b.salary?.max ?? 0),
      );
    case 'title_asc':
      return [...items].sort((a, b) =>
        normalize(a.title).localeCompare(normalize(b.title)),
      );
    case 'title_desc':
      return [...items].sort((a, b) =>
        normalize(b.title).localeCompare(normalize(a.title)),
      );
    case 'newest':
    default:
      return [...items].sort((a, b) => b.createdAt - a.createdAt);
  }
}

export const createJob = mutation({
  args: {
    companyId: v.id('profiles'),
    title: v.string(),
    location: v.object({
      city: v.string(),
      locality: v.optional(v.string()),
    }),
    salary: v.object({
      min: v.number(),
      max: v.number(),
    }),
    jobType: JobTypeEnum,
    staffNeeded: v.number(),
    genderRequirement: GenderEnum,
    educationRequirements: v.array(v.string()),
    experienceRequired: v.string(),
    description: v.string(),
    status: v.optional(JobStatusEnum),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const jobId = await ctx.db.insert('jobs', {
      companyId: args.companyId,
      title: args.title,
      location: args.location,
      salary: args.salary,
      jobType: args.jobType,
      staffNeeded: args.staffNeeded,
      genderRequirement: args.genderRequirement,
      educationRequirements: args.educationRequirements,
      experienceRequired: args.experienceRequired,
      description: args.description,
      status: args.status ?? 'Active',
      createdAt: now,
    });
    return jobId;
  },
});
export const getJobsByCompany = query({
  args: { companyId: v.id('profiles') },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query('jobs')
      .withIndex('by_companyId', (q) => q.eq('companyId', args.companyId))
      .collect();
    return jobs;
  },
});

// Jobs with basic stats (e.g., applicant counts) for a given company
export const getJobsWithStatsByCompany = query({
  args: { companyId: v.id('profiles') },
  handler: async (ctx, { companyId }) => {
    const jobs = await ctx.db
      .query('jobs')
      .withIndex('by_companyId', (q) => q.eq('companyId', companyId))
      .collect();

    if (jobs.length === 0) return [] as Array<any>;

    const withStats = await Promise.all(
      jobs.map(async (job) => {
        const apps = await ctx.db
          .query('applications')
          .withIndex('by_jobId', (q) => q.eq('jobId', job._id))
          .collect();

        return {
          _id: job._id,
          title: job.title ?? 'Untitled Role',
          location: {
            city: job.location?.city ?? 'Unknown',
            locality: job.location?.locality ?? undefined,
          },
          status: (job.status as 'Active' | 'Closed') ?? 'Active',
          applicantCount: apps.length,
          createdAt: Number(job.createdAt ?? Date.now()),
        };
      }),
    );

    // Sort newest first for a stable, pleasant UI ordering
    return withStats.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getJobById = query({
  args: { jobId: v.id('jobs') },
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId);
    if (!job) return { job: null, applicants: [] as any[] };
    const applications = await ctx.db
      .query('applications')
      .withIndex('by_jobId', (q) => q.eq('jobId', jobId))
      .collect();
    const applicants = await Promise.all(
      applications.map(async (app) => {
        const profile = await ctx.db.get(app.jobSeekerId);
        return { ...app, profile };
      }),
    );
    return { job, applicants };
  },
});

export const getActiveJobs = query({
  args: {},
  handler: async (ctx) => {
    // Note: If a by_status index exists, use it. Otherwise, filter in memory.
    const all = await ctx.db.query('jobs').collect();
    const active = all.filter((j) => j.status === 'Active');
    const withCompany = await Promise.all(
      active.map(async (j) => {
        const company = await ctx.db.get(j.companyId);
        return {
          ...j,
          company: {
            name:
              company?.companyData?.companyName ?? company?.name ?? 'Employeer',
            photoUrl: company?.companyData?.companyPhotoUrl ?? '',
          },
        };
      }),
    );
    return withCompany;
  },
});

// Helper: enrich jobs with company info (memoized per request)
async function enrichWithCompany(ctx: any, jobs: any[]) {
  const cache = new Map<string, any>();
  const getCompany = async (id: string) => {
    if (cache.has(id)) return cache.get(id);
    const c = await ctx.db.get(id as unknown as Id<'profiles'>);
    cache.set(id, c);
    return c;
  };
  return Promise.all(
    jobs.map(async (j) => {
      // Guard against malformed job records and fill safe defaults
      const job = {
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
        educationRequirements: Array.isArray(j.educationRequirements)
          ? j.educationRequirements
          : [],
        experienceRequired: j.experienceRequired ?? '',
        status: j.status ?? 'Active',
        createdAt: Number(j.createdAt ?? Date.now()),
        companyId: j.companyId,
      };
      const company = await getCompany(j.companyId as unknown as string);
      return {
        ...job,
        company: {
          name:
            company?.companyData?.companyName ?? company?.name ?? 'Employeer',
          photoUrl: company?.companyData?.companyPhotoUrl ?? '',
        },
      };
    }),
  );
}

export const getNewJobs = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    const windowMs = (days ?? 7) * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - windowMs;
    const items = await ctx.db
      .query('jobs')
      .withIndex('by_status_createdAt', (q: any) => q.eq('status', 'Active'))
      .collect();
    const recent = items
      .filter((j: any) => j.createdAt >= cutoff)
      .sort((a: any, b: any) => b.createdAt - a.createdAt);
    return enrichWithCompany(ctx, recent);
  },
});

export const getHighSalaryJobs = query({
  args: { percentile: v.optional(v.number()) },
  handler: async (ctx, { percentile }) => {
    const items = await ctx.db
      .query('jobs')
      .withIndex('by_status_salary', (q: any) => q.eq('status', 'Active'))
      .collect();
    if (items.length === 0) return [] as any[];
    const sorted = [...items].sort((a, b) => a.salary.max - b.salary.max);
    const p = Math.min(Math.max(percentile ?? 0.75, 0), 0.99);
    const idx = Math.floor(sorted.length * p);
    const threshold = sorted[idx].salary.max;
    const filtered = items
      .filter((j) => j.salary.max >= threshold)
      .sort((a, b) => b.salary.max - a.salary.max);
    return enrichWithCompany(ctx, filtered);
  },
});

export const getNearbyJobs = query({
  args: { city: v.string(), locality: v.optional(v.string()) },
  handler: async (ctx, { city, locality }) => {
    const items = await ctx.db
      .query('jobs')
      .withIndex('by_status_createdAt', (q: any) => q.eq('status', 'Active'))
      .collect();
    const norm = (s: string) => (s || '').toLowerCase();
    const filtered = items
      .filter((j) => {
        const cityMatch = norm(j.location.city) === norm(city);
        const locMatch = locality
          ? norm(j.location.locality ?? '') === norm(locality)
          : true;
        return cityMatch && locMatch;
      })
      .sort((a: any, b: any) => b.createdAt - a.createdAt);
    return enrichWithCompany(ctx, filtered);
  },
});

export const getJobsForUser = query({
  args: { profileId: v.id('profiles'), limit: v.optional(v.number()) },
  handler: async (ctx, { profileId, limit }) => {
    const profile = await ctx.db.get(profileId);
    if (!profile) return [] as any[];
    const active = await ctx.db
      .query('jobs')
      .withIndex('by_status_createdAt', (q: any) => q.eq('status', 'Active'))
      .collect();
    const scored = sortJobsByRelevance(active, profile);
    const sliced = typeof limit === 'number' ? scored.slice(0, limit) : scored;
    return enrichWithCompany(ctx, sliced);
  },
});

export const getFilteredJobs = query({
  args: {
    search: v.optional(v.string()),
    filter: v.optional(v.string()), // 'for-you' | 'high-salary' | 'nearby' | 'new-jobs'
    profileId: v.optional(v.id('profiles')),
    city: v.optional(v.string()),
    locality: v.optional(v.string()),
    // optional pagination and sort
    offset: v.optional(v.number()),
    limit: v.optional(v.number()),
    sort: v.optional(SortEnum),
  },
  handler: async (
    ctx,
    { search, filter, profileId, city, locality, offset, limit, sort },
  ) => {
    let base: any[] = [];
    const norm = (s: string) => (s || '').toLowerCase();
    if (filter === 'new-jobs') {
      const windowMs = 7 * 24 * 60 * 60 * 1000;
      const cutoff = Date.now() - windowMs;
      const items = await ctx.db
        .query('jobs')
        .withIndex('by_status_createdAt', (q: any) => q.eq('status', 'Active'))
        .collect();
      const recent = items
        .filter((j: any) => j.createdAt >= cutoff)
        .sort((a: any, b: any) => b.createdAt - a.createdAt);
      base = await enrichWithCompany(ctx, recent);
    } else if (filter === 'high-salary') {
      const items = await ctx.db
        .query('jobs')
        .withIndex('by_status_salary', (q: any) => q.eq('status', 'Active'))
        .collect();
      if (items.length === 0) return [] as any[];
      const sorted = [...items].sort((a, b) => a.salary.max - b.salary.max);
      const idx = Math.floor(sorted.length * 0.75);
      const threshold =
        sorted[idx]?.salary.max ?? sorted[sorted.length - 1].salary.max;
      const filtered = items
        .filter((j: any) => j.salary.max >= threshold)
        .sort((a: any, b: any) => b.salary.max - a.salary.max);
      base = await enrichWithCompany(ctx, filtered);
    } else if (filter === 'nearby' && city) {
      const items = await ctx.db
        .query('jobs')
        .withIndex('by_status_createdAt', (q: any) => q.eq('status', 'Active'))
        .collect();
      const filtered = items
        .filter((j: any) => {
          const cityMatch = norm(j.location.city) === norm(city);
          const locMatch = locality
            ? norm(j.location.locality ?? '') === norm(locality)
            : true;
          return cityMatch && locMatch;
        })
        .sort((a: any, b: any) => b.createdAt - a.createdAt);
      base = await enrichWithCompany(ctx, filtered);
    } else if (filter === 'for-you' && profileId) {
      const profile = await ctx.db.get(profileId);
      const items = await ctx.db
        .query('jobs')
        .withIndex('by_status_createdAt', (q: any) => q.eq('status', 'Active'))
        .collect();
      const scored = sortJobsByRelevance(items, profile ?? {});
      base = await enrichWithCompany(ctx, scored);
    } else {
      const items = await ctx.db
        .query('jobs')
        .withIndex('by_status_createdAt', (q: any) => q.eq('status', 'Active'))
        .collect();
      const sorted = [...items].sort(
        (a: any, b: any) => b.createdAt - a.createdAt,
      );
      base = await enrichWithCompany(ctx, sorted);
    }
    if (search && search.trim()) {
      base = filterJobsBySearch(search, base as any);
    }
    // optional sort
    if (sort && sort !== 'relevance') {
      base = applySortGeneric(base, sort);
    } else if (sort === 'relevance' && profileId) {
      // If relevance requested, re-evaluate on raw docs for best scoring
      const raw = await ctx.db
        .query('jobs')
        .withIndex('by_status_createdAt', (q: any) => q.eq('status', 'Active'))
        .collect();
      let filtered = raw;
      if (city) {
        filtered = filtered.filter((j: any) => {
          const cityMatch = norm(j.location.city) === norm(city);
          const locMatch = locality
            ? norm(j.location.locality ?? '') === norm(locality)
            : true;
          return cityMatch && locMatch;
        });
      }
      if (search && search.trim()) {
        const s = normalize(search);
        filtered = filtered.filter(
          (j: any) =>
            normalize(j.title).includes(s) ||
            normalize(j.description).includes(s),
        );
      }
      const profile = await ctx.db.get(profileId);
      const scored = sortJobsByRelevance(filtered, profile ?? {});
      base = await enrichWithCompany(ctx, scored);
    }
    // optional pagination
    if (typeof offset === 'number' && typeof limit === 'number') {
      return base.slice(offset, offset + limit);
    }
    return base;
  },
});

export const getJobPublicById = query({
  args: { jobId: v.id('jobs') },
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId);
    if (!job) return null;
    const company = await ctx.db.get(job.companyId);
    return {
      job,
      company: company
        ? {
            name:
              company.companyData?.companyName ?? company.name ?? 'Employeer',
            photoUrl: company.companyData?.companyPhotoUrl ?? '',
          }
        : null,
    };
  },
});

// Check whether a given job seeker has already applied to a job
export const hasUserApplied = query({
  args: { jobId: v.id('jobs'), jobSeekerId: v.id('profiles') },
  handler: async (ctx, { jobId, jobSeekerId }) => {
    // Use by_jobId index, then check jobSeekerId in memory
    const apps = await ctx.db
      .query('applications')
      .withIndex('by_jobId', (q) => q.eq('jobId', jobId))
      .collect();
    return apps.some((a) => a.jobSeekerId === jobSeekerId);
  },
});

export const createApplication = mutation({
  args: {
    jobId: v.id('jobs'),
    jobSeekerId: v.id('profiles'),
  },
  handler: async (ctx, args) => {
    // Prevent applications to closed jobs
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error('Job not found');
    if (job.status === 'Closed') {
      throw new Error('Job is closed to applications');
    }
    const now = Date.now();
    // Prevent duplicate applications for same job & jobSeeker
    const existing = await ctx.db
      .query('applications')
      .withIndex('by_jobId', (q) => q.eq('jobId', args.jobId))
      .collect();
    const dup = existing.find((a) => a.jobSeekerId === args.jobSeekerId);
    if (dup) {
      return {
        ok: true,
        alreadyApplied: true,
        applicationId: dup._id,
      } as const;
    }

    const applicationId = await ctx.db.insert('applications', {
      jobId: args.jobId,
      jobSeekerId: args.jobSeekerId,
      status: 'New',
      appliedAt: now,
    });
    // Create a notification for the company that owns this job
    try {
      const seekerProfile = await ctx.db.get(args.jobSeekerId);
      await ctx.db.insert('notifications', {
        companyId: job.companyId,
        type: 'application:new',
        title: 'New application received',
        body: `${seekerProfile?.name ?? 'A candidate'} applied to ${job.title}`,
        jobId: args.jobId,
        read: false,
        createdAt: now,
      });
    } catch (e) {
      // Non-fatal: continue even if notification insert fails
      console.error('Failed to create notification', e);
    }
    // Attempt to auto-create (or fetch) a conversation between company & job seeker tied to this application
    try {
      const companyProfileId = job.companyId as Id<'profiles'>;
      const jobSeekerProfileId = args.jobSeekerId as Id<'profiles'>;
      // Participants stored sorted; replicate minimal logic here to avoid import cycle
      const a = String(companyProfileId) < String(jobSeekerProfileId) ? companyProfileId : jobSeekerProfileId;
      const b = a === companyProfileId ? jobSeekerProfileId : companyProfileId;
      // Check existing conversation by applicationId first
      const existingByApp = await ctx.db
        .query('conversations')
        .withIndex('by_applicationId', q => q.eq('applicationId', applicationId))
        .collect();
      let conversationId: Id<'conversations'> | undefined = existingByApp[0]?._id;
      if (!conversationId) {
        const existing = await ctx.db
          .query('conversations')
          .withIndex('by_participantA_lastMessageAt', q => q.eq('participantA', a))
          .collect();
        const match = existing.find(c => c.participantB === b);
        if (match) {
          conversationId = match._id as Id<'conversations'>;
          // Link applicationId if not already
          if (!match.applicationId) {
            await ctx.db.patch(match._id, { applicationId });
          }
        } else {
          const convoNow = Date.now();
          conversationId = await ctx.db.insert('conversations', {
            participantA: a,
            participantB: b,
            applicationId,
            lastMessageAt: convoNow,
            lastMessageId: undefined,
            unreadA: 0,
            unreadB: 0,
            createdAt: convoNow,
          });
          // Seed a system message welcoming both parties
          const systemBody = 'Conversation started for application.';
          const msgId = await ctx.db.insert('messages', {
            conversationId,
            senderId: a, // arbitrary participant for system messages
            body: systemBody,
            kind: 'system',
            createdAt: convoNow,
            deliveredAt: convoNow,
            readAt: convoNow,
          });
          await ctx.db.patch(conversationId, { lastMessageId: msgId });
        }
      }
    } catch (e) {
      console.error('Auto conversation creation failed', e);
    }
    return { ok: true, applicationId } as const;
  },
});

export const getApplicationsByJob = query({
  args: { jobId: v.id('jobs') },
  handler: async (ctx, args) => {
    const applications = await ctx.db
      .query('applications')
      .withIndex('by_jobId', (q) => q.eq('jobId', args.jobId))
      .collect();
    return applications;
  },
});

// Update an existing job (only by its owning company)
export const updateJob = mutation({
  args: {
    jobId: v.id('jobs'),
    companyId: v.id('profiles'),
    title: v.optional(v.string()),
    location: v.optional(
      v.object({
        city: v.string(),
        locality: v.optional(v.string()),
      }),
    ),
    salary: v.optional(
      v.object({
        min: v.number(),
        max: v.number(),
      }),
    ),
    jobType: v.optional(JobTypeEnum),
    staffNeeded: v.optional(v.number()),
    genderRequirement: v.optional(GenderEnum),
    educationRequirements: v.optional(v.array(v.string())),
    experienceRequired: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(JobStatusEnum),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error('Job not found');
    if (job.companyId !== args.companyId) throw new Error('Unauthorized');

    const updates: Record<string, any> = {};
    const fields = [
      'title',
      'location',
      'salary',
      'jobType',
      'staffNeeded',
      'genderRequirement',
      'educationRequirements',
      'experienceRequired',
      'description',
      'status',
    ] as const;
    for (const f of fields) {
      if (typeof (args as any)[f] !== 'undefined') {
        (updates as any)[f] = (args as any)[f];
      }
    }
    if (Object.keys(updates).length === 0) return args.jobId;
    await ctx.db.patch(args.jobId, updates);
    return args.jobId;
  },
});

// Delete a job (and its applications) only by owning company
export const deleteJob = mutation({
  args: { jobId: v.id('jobs'), companyId: v.id('profiles') },
  handler: async (ctx, { jobId, companyId }) => {
    const job = await ctx.db.get(jobId);
    if (!job) return { ok: false, reason: 'not_found' } as const;
    if (job.companyId !== companyId)
      return { ok: false, reason: 'unauthorized' } as const;

    // delete related applications to avoid orphans
    const apps = await ctx.db
      .query('applications')
      .withIndex('by_jobId', (q) => q.eq('jobId', jobId))
      .collect();
    await Promise.all(apps.map((a) => ctx.db.delete(a._id)));

    await ctx.db.delete(jobId);
    return { ok: true } as const;
  },
});

// Close a job (set status to 'Closed') and remove all applications
export const closeJob = mutation({
  args: { jobId: v.id('jobs'), companyId: v.id('profiles') },
  handler: async (ctx, { jobId, companyId }) => {
    const job = await ctx.db.get(jobId);
    if (!job) return { ok: false, reason: 'not_found' } as const;
    if (job.companyId !== companyId)
      return { ok: false, reason: 'unauthorized' } as const;

    // First mark as Closed to block new applications, then cleanup existing ones
    if (job.status !== 'Closed') {
      await ctx.db.patch(jobId, { status: 'Closed' });
    }
    const apps = await ctx.db
      .query('applications')
      .withIndex('by_jobId', (q) => q.eq('jobId', jobId))
      .collect();
    await Promise.all(apps.map((a) => ctx.db.delete(a._id)));

    return { ok: true } as const;
  },
});

// Get all applicants across all jobs posted by a company
export const getApplicantsByCompany = query({
  args: { companyId: v.id('profiles') },
  handler: async (ctx, { companyId }) => {
    const jobs = await ctx.db
      .query('jobs')
      .withIndex('by_companyId', (q) => q.eq('companyId', companyId))
      .collect();

    if (jobs.length === 0) return [] as Array<any>;

    const perJobApplicants = await Promise.all(
      jobs.map(async (job) => {
        const apps = await ctx.db
          .query('applications')
          .withIndex('by_jobId', (q) => q.eq('jobId', job._id))
          .collect();
        const enriched = await Promise.all(
          apps.map(async (app) => {
            const profile = await ctx.db.get(app.jobSeekerId);
            return {
              ...app,
              jobId: job._id,
              jobTitle: job.title,
              profile,
            };
          }),
        );
        return enriched;
      }),
    );

    return perJobApplicants.flat();
  },
});

// Popular search terms & categories for dynamic suggestions
export const getPopularSearchTerms = query({
  args: { profileId: v.optional(v.id('profiles')) },
  handler: async (ctx, { profileId }) => {
    // Basic in-memory cache per function instance to avoid recomputation
    // In a real app, consider a durable cache or periodic materialization
    const jobs = await ctx.db
      .query('jobs')
      .withIndex('by_status_createdAt', (q: any) => q.eq('status', 'Active'))
      .collect();
    if (jobs.length === 0)
      return { terms: [], categories: [], locations: [] } as const;

    const count = (map: Map<string, number>, key: string) => {
      const k = key.trim().toLowerCase();
      if (!k) return;
      map.set(k, (map.get(k) ?? 0) + 1);
    };

    const titleTerms = new Map<string, number>();
    const categories = new Map<string, number>();
    const locations = new Map<string, number>();

    for (const j of jobs) {
      // split title into words; filter very short tokens and numeric-only tokens
      (j.title || '')
        .split(/[^a-zA-Z0-9]+/)
        .filter((t: string) => t.length >= 3 && !/^\d+$/.test(t))
        .forEach((t: string) => count(titleTerms, t));
      // use jobType as a category
      if (j.jobType) count(categories, j.jobType);
      // use city as a location
      if (j.location?.city) count(locations, j.location.city);
    }

    const top = (m: Map<string, number>, limit = 10) =>
      Array.from(m.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([k]) => k)
        .filter((t) => !['and', 'for', 'the', 'with'].includes(t));

    return {
      terms: top(titleTerms, 12),
      categories: top(categories, 8),
      locations: top(locations, 8),
    } as const;
  },
});

// Applications by job seeker with job & company enrichment (paginated)
export const getApplicationsByJobSeeker = query({
  args: {
    jobSeekerId: v.id('profiles'),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { jobSeekerId, limit, cursor }) => {
    const pageSize = Math.max(1, Math.min(100, limit ?? 20));
    const q = ctx.db
      .query('applications')
      .withIndex('by_jobSeekerId', (q) => q.eq('jobSeekerId', jobSeekerId))
      .order('desc');
    const page = await q.paginate({
      cursor: cursor ? JSON.parse(cursor) : undefined,
      numItems: pageSize,
    });
    // Batch fetch jobs and companies to avoid N+1
    const jobIds = Array.from(new Set(page.page.map((a) => a.jobId)));
    const jobs = await Promise.all(jobIds.map((id) => ctx.db.get(id)));
    const jobMap = new Map(jobIds.map((id, i) => [id, jobs[i]]));
    const companyIds = Array.from(
      new Set(
        jobs.map((j) => j?.companyId).filter(Boolean) as Array<Id<'profiles'>>,
      ),
    );
    const companies = await Promise.all(companyIds.map((id) => ctx.db.get(id)));
    const companyMap = new Map(companyIds.map((id, i) => [id, companies[i]]));
    const enriched = page.page.map((app) => {
      const job = jobMap.get(app.jobId) as any;
      const company = job ? (companyMap.get(job.companyId) as any) : null;
      return {
        ...app,
        job: job
          ? {
              _id: job._id,
              title: job.title,
              location: job.location,
              salary: job.salary,
              jobType: job.jobType,
              company: company
                ? {
                    name:
                      company.companyData?.companyName ??
                      company.name ??
                      'Employeer',
                    photoUrl: company.companyData?.companyPhotoUrl ?? '',
                  }
                : null,
            }
          : null,
      } as const;
    });
    return {
      applications: enriched,
      nextCursor: page.continueCursor
        ? JSON.stringify(page.continueCursor)
        : undefined,
    } as const;
  },
});

// Job seeker application statistics
export const getJobSeekerStats = query({
  args: { jobSeekerId: v.id('profiles') },
  handler: async (ctx, { jobSeekerId }) => {
    const apps = await ctx.db
      .query('applications')
      .withIndex('by_jobSeekerId', (q) => q.eq('jobSeekerId', jobSeekerId))
      .collect();
    const total = apps.length;
    const byStatus = new Map<string, number>();
    for (const a of apps) {
      const k = String((a as any).status ?? 'New');
      byStatus.set(k, (byStatus.get(k) ?? 0) + 1);
    }
    const hired = byStatus.get('Hired') ?? 0;
    const rejected = byStatus.get('Rejected') ?? 0;
    const successRate = total > 0 ? Math.round((hired / total) * 100) : 0;
    // recent 10
    const recent = [...apps]
      .sort((a, b) => Number(b.appliedAt ?? 0) - Number(a.appliedAt ?? 0))
      .slice(0, 10);
    return {
      totalApplications: total,
      byStatus: Array.from(byStatus.entries()).map(([status, count]) => ({
        status,
        count,
      })),
      successRate,
      recent: recent.map((a) => ({
        _id: a._id,
        jobId: a.jobId,
        status: (a as any).status ?? 'New',
        appliedAt: a.appliedAt,
      })),
    } as const;
  },
});

// Recent activity timeline for job seeker
export const getJobSeekerRecentActivity = query({
  args: { jobSeekerId: v.id('profiles'), limit: v.optional(v.number()) },
  handler: async (ctx, { jobSeekerId, limit }) => {
    const pageSize = Math.max(1, Math.min(50, limit ?? 10));
    const apps = await ctx.db
      .query('applications')
      .withIndex('by_jobSeekerId', (q) => q.eq('jobSeekerId', jobSeekerId))
      .order('desc')
      .collect();
    const recent = apps
      .sort((a, b) => Number(b.appliedAt ?? 0) - Number(a.appliedAt ?? 0))
      .slice(0, pageSize);
    // Batch fetch jobs
    const jobIds = Array.from(new Set(recent.map((a) => a.jobId)));
    const jobs = await Promise.all(jobIds.map((id) => ctx.db.get(id)));
    const jobMap = new Map(jobIds.map((id, i) => [id, jobs[i]]));
    return recent.map((a) => {
      const job = jobMap.get(a.jobId) as any;
      return {
        _id: a._id,
        status: (a as any).status ?? 'New',
        appliedAt: a.appliedAt,
        job: job
          ? { _id: job._id, title: job.title, companyId: job.companyId }
          : null,
      } as const;
    });
  },
});

// Job recommendations based on profile data
export const getJobRecommendationsForProfile = query({
  args: { profileId: v.id('profiles'), limit: v.optional(v.number()) },
  handler: async (ctx, { profileId, limit }) => {
    const profile = await ctx.db.get(profileId);
    const items = await ctx.db
      .query('jobs')
      .withIndex('by_status_createdAt', (q: any) => q.eq('status', 'Active'))
      .collect();
    const scored = sortJobsByRelevance(items, profile ?? {});
    const sliced =
      typeof limit === 'number' ? scored.slice(0, limit) : scored.slice(0, 10);
    return enrichWithCompany(ctx, sliced);
  },
});

// Paginated jobs with advanced filtering & sorting
export const getPaginatedJobs = query({
  args: {
    page: v.optional(v.number()),
    limit: v.number(),
    cursor: v.optional(v.string()),
    search: v.optional(v.string()),
    jobTypes: v.optional(v.array(v.string())),
    salaryMin: v.optional(v.number()),
    salaryMax: v.optional(v.number()),
    experienceLevels: v.optional(v.array(v.string())),
    city: v.optional(v.string()),
    locality: v.optional(v.string()),
    sort: v.optional(SortEnum),
    profileId: v.optional(v.id('profiles')),
  },
  handler: async (
    ctx,
    {
      page,
      limit,
      cursor,
      search,
      jobTypes,
      salaryMin,
      salaryMax,
      experienceLevels,
      city,
      locality,
      sort,
      profileId,
    },
  ) => {
    const norm = (s: string) => (s || '').toLowerCase();

    // Coarse filter set-up
    const jobTypeSet =
      jobTypes && jobTypes.length > 0
        ? new Set(jobTypes.map((t) => t.toLowerCase()))
        : undefined;
    const expSet =
      experienceLevels && experienceLevels.length > 0
        ? new Set(experienceLevels.map((e) => e.toLowerCase()))
        : undefined;
    const sterm = search && search.trim() ? normalize(search) : undefined;

    // Map experience requirement to canonical levels for better matching
    const toExpLevel = (
      exp: string,
    ): 'fresher' | 'junior' | 'mid' | 'senior' | 'other' => {
      const e = norm(exp);
      if (/(^|\b)(0|0-1|0 to 1|< ?1|less than 1|fresher)(\b|$)/.test(e))
        return 'fresher';
      if (/(^|\b)(1|1-2|1-3|1 to 3|2|2-3|junior)(\b|$)/.test(e))
        return 'junior';
      if (/(^|\b)(3|3-5|3 to 5|4|5|mid)(\b|$)/.test(e)) return 'mid';
      if (/(^|\b)(6\+|6\+ years|6|7|8|9|10|senior)(\b|$)/.test(e))
        return 'senior';
      return 'other';
    };

    // Iterate over index by_status_createdAt with pagination windowing
    const pageSize = Math.max(1, Math.min(100, limit));
    const usePage = typeof page === 'number' && !cursor; // backward compat
    let start = 0;
    if (usePage) start = Math.max(0, (Math.max(1, page!) - 1) * pageSize);

    // Basic streaming with bounded window: we'll read in chunks until we fill pageSize or exhaust
    let results: any[] = [];
    let read = 0;
    let nextCursor: string | undefined = undefined;

    const q = ctx.db
      .query('jobs')
      .withIndex('by_status_createdAt', (q: any) => q.eq('status', 'Active'))
      .order('desc');

    // iteration cursor (stringified createdAt+id)
    let iter: any | undefined = cursor ? JSON.parse(cursor) : undefined;

    while (results.length < pageSize) {
      const batch = await q.paginate({
        cursor: iter,
        numItems: Math.min(100, pageSize * 2),
      });
      const items = batch.page;
      if (items.length === 0) {
        iter = batch.continueCursor;
      }

      // Apply coarse filters as we stream
      for (const j of items) {
        // job type early filter
        if (jobTypeSet && !jobTypeSet.has(norm(j.jobType))) continue;
        // city/locality early filter
        if (city && norm(j.location?.city) !== norm(city)) continue;
        if (locality && norm(j.location?.locality ?? '') !== norm(locality))
          continue;
        // salary coarse filters
        if (
          typeof salaryMin === 'number' &&
          Number(j.salary?.max ?? 0) < salaryMin
        )
          continue;
        if (
          typeof salaryMax === 'number' &&
          Number(j.salary?.min ?? 0) > salaryMax
        )
          continue;
        // experience mapping
        if (expSet) {
          const mapped = toExpLevel(j.experienceRequired || '');
          const ok = Array.from(expSet).some((lvl) => {
            const l = norm(lvl);
            return l === mapped;
          });
          if (!ok) continue;
        }
        // search filter (title/description)
        if (sterm) {
          const t = normalize(j.title);
          const d = normalize(j.description);
          if (!t.includes(sterm) && !d.includes(sterm)) continue;
        }

        // If using page (numeric), skip until start offset
        if (usePage && read++ < start) continue;
        results.push(j);
        if (results.length >= pageSize) break;
      }

      if (!batch.continueCursor) {
        iter = undefined;
        break;
      }
      iter = batch.continueCursor;
      if (results.length >= pageSize) break;
    }

    // Sorting: relevance or generic
    if (sort === 'relevance' && profileId) {
      const profile = await ctx.db.get(profileId);
      results = sortJobsByRelevance(results, profile ?? {});
    } else {
      results = applySortGeneric(
        results.map((j) => ({
          ...j,
          createdAt: Number(j.createdAt ?? 0),
          salary: {
            min: Number(j.salary?.min ?? 0),
            max: Number(j.salary?.max ?? 0),
          },
        })),
        sort ?? 'newest',
      );
    }

    const enriched = await enrichWithCompany(ctx, results);
    // For cursor pagination, supply next cursor; for page/limit, infer hasMore from iter
    if (!usePage) {
      nextCursor = iter ? JSON.stringify(iter) : undefined;
    }

    return {
      jobs: enriched,
      totalCount: undefined,
      hasMore: usePage ? Boolean(iter) : Boolean(nextCursor),
      page: usePage ? Math.max(1, page!) : undefined,
      pageSize,
      nextCursor,
    } as const;
  },
});

// Job statistics for insights and counters
export const getJobStats = query({
  args: {},
  handler: async (ctx) => {
    const allActive = await ctx.db
      .query('jobs')
      .withIndex('by_status_createdAt', (q: any) => q.eq('status', 'Active'))
      .collect();
    const totalActive = allActive.length;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const dayMs = startOfDay.getTime();
    const weekCut = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let newToday = 0;
    let newThisWeek = 0;
    const byCategory = new Map<string, number>();
    for (const j of allActive) {
      const created = Number(j.createdAt ?? 0);
      if (created >= dayMs) newToday++;
      if (created >= weekCut) newThisWeek++;
      const k = j.jobType ?? 'Other';
      byCategory.set(k, (byCategory.get(k) ?? 0) + 1);
    }
    return {
      totalActive,
      newToday,
      newThisWeek,
      byCategory: Array.from(byCategory.entries()).map(([category, count]) => ({
        category,
        count,
      })),
    } as const;
  },
});

// Job categories with counts for categorization UI
export const getJobCategories = query({
  args: {},
  handler: async (ctx) => {
    const allActive = await ctx.db
      .query('jobs')
      .withIndex('by_status_createdAt', (q: any) => q.eq('status', 'Active'))
      .collect();
    const map = new Map<string, number>();
    for (const j of allActive) {
      const k = j.jobType ?? 'Other';
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([category, count]) => ({
      category,
      count,
    })) as Array<{
      category: string;
      count: number;
    }>;
  },
});

function setHasAny(set: Set<string>, hay: string) {
  const parts = hay
    .split(/\s|,|\//g)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  return parts.some((p) => set.has(p));
}
