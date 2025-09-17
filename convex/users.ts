import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

const RoleEnum = v.union(v.literal('job-seeker'), v.literal('company'));
const GenderEnum = v.union(
  v.literal('Male'),
  v.literal('Female'),
  v.literal('Other'),
  v.literal('Prefer not to say'),
);

export const createUser = mutation({
  args: { phone: v.string(), role: RoleEnum, email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_phone', (q) => q.eq('phone', args.phone))
      .unique();

    if (existingUser) {
      return existingUser._id;
    }

    const now = Date.now();
    const userId = await ctx.db.insert('users', {
      phone: args.phone,
      email: args.email,
      role: args.role,
      createdAt: now,
    });
    return userId;
  },
});

export const upsertJobSeekerProfile = mutation({
  args: {
    userId: v.id('users'),
    name: v.string(),
    contactNumber: v.string(),
    jobSeekerData: v.object({
      dateOfBirth: v.number(),
      gender: GenderEnum,
      education: v.string(),
      jobRole: v.string(),
      experience: v.string(),
      location: v.string(),
      skills: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        contactNumber: args.contactNumber,
        jobSeekerData: args.jobSeekerData,
      });
      return existing._id;
    }

    const id = await ctx.db.insert('profiles', {
      userId: args.userId,
      name: args.name,
      contactNumber: args.contactNumber,
      createdAt: now,
      jobSeekerData: args.jobSeekerData,
    });
    return id;
  },
});

export const upsertCompanyProfile = mutation({
  args: {
    userId: v.id('users'),
    name: v.string(),
    contactNumber: v.string(),
    companyData: v.object({
      companyName: v.string(),
      contactPerson: v.string(),
      email: v.string(),
      companyAddress: v.string(),
      aboutCompany: v.string(),
      companyPhotoUrl: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        contactNumber: args.contactNumber,
        companyData: args.companyData,
      });
      return existing._id;
    }

    const id = await ctx.db.insert('profiles', {
      userId: args.userId,
      name: args.name,
      contactNumber: args.contactNumber,
      createdAt: now,
      companyData: args.companyData,
    });
    return id;
  },
});

export const getUserByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    // Support both normalized (+91XXXXXXXXXX) and raw (XXXXXXXXXX) formats
    const normalized = phone.startsWith('+') ? phone : `+91${phone}`;
    let user = await ctx.db
      .query('users')
      .withIndex('by_phone', (q) => q.eq('phone', normalized))
      .unique();
    if (!user && phone !== normalized) {
      user = await ctx.db
        .query('users')
        .withIndex('by_phone', (q) => q.eq('phone', phone))
        .unique();
    }
    return user ?? null;
  },
});
