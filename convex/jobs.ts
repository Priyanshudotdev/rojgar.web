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
  },
  handler: async (ctx, { search, filter, profileId, city, locality }) => {
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
    return applicationId;
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
