import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

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

export const getJobsWithStatsByCompany = query({
  args: { companyId: v.id('profiles') },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query('jobs')
      .withIndex('by_companyId', (q) => q.eq('companyId', args.companyId))
      .collect();
    const jobIds = jobs.map((j) => j._id);
    const applications = await Promise.all(
      jobIds.map((jobId) =>
        ctx.db
          .query('applications')
          .withIndex('by_jobId', (q) => q.eq('jobId', jobId))
          .collect(),
      ),
    );
    const counts = new Map<string, number>();
    applications.forEach((apps, idx) =>
      counts.set(jobIds[idx] as unknown as string, apps.length),
    );
    return jobs.map((job) => ({
      ...job,
      applicantCount: counts.get(job._id as unknown as string) ?? 0,
    }));
  },
});

export const getJobById = query({
  args: { jobId: v.id('jobs') },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    return job;
  },
});

export const getJobWithApplicants = query({
  args: { jobId: v.id('jobs') },
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId);
    if (!job) return null;

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
