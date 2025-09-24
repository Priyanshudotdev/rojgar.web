import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getProfileByUserId = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .unique();
    return { user, profile };
  },
});

export const updateProfile = mutation({
  args: {
    profileId: v.id('profiles'),
    token: v.optional(v.string()),
    name: v.optional(v.string()),
    jobSeekerData: v.optional(
      v.object({
        dateOfBirth: v.optional(v.number()),
        gender: v.optional(
          v.union(
            v.literal('Male'),
            v.literal('Female'),
            v.literal('Other'),
            v.literal('Prefer not to say'),
          ),
        ),
        education: v.optional(v.string()),
        jobRole: v.optional(v.string()),
        experience: v.optional(v.string()),
        location: v.optional(v.string()),
        skills: v.optional(v.array(v.string())),
        profilePhotoUrl: v.optional(v.string()),
      }),
    ),
    // companyData updates could be added similarly if needed
  },
  handler: async (ctx, args) => {
    const { profileId, name, jobSeekerData, token } = args;
    const profile = await ctx.db.get(profileId);
    if (!profile) throw new Error('Profile not found');
    // Authorization: validate provided session token against profile ownership
    if (!token || !/^[0-9a-f]{64}$/i.test(token))
      throw new Error('Unauthorized');
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', token))
      .unique();
    if (!session || session.userId !== (profile as any).userId) {
      throw new Error('Unauthorized');
    }

    const patch: Record<string, unknown> = {};
    if (typeof name !== 'undefined') patch.name = name;

    if (jobSeekerData) {
      // Avoid seeding defaults; only merge provided keys over existing values
      const prev = (profile as any).jobSeekerData ?? {};
      patch.jobSeekerData = {
        ...prev,
        ...Object.fromEntries(
          Object.entries(jobSeekerData).filter(
            ([, v]) => typeof v !== 'undefined',
          ),
        ),
      };
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(profileId, patch);
    }
    return await ctx.db.get(profileId);
  },
});

// Set or update the company's profile picture; stores Convex storageId in companyData.companyPhotoUrl
export const setCompanyPhoto = mutation({
  args: {
    profileId: v.id('profiles'),
    token: v.optional(v.string()),
    url: v.string(),
  },
  handler: async (ctx, { profileId, url, token }) => {
    const profile = await ctx.db.get(profileId);
    if (!profile) throw new Error('Profile not found');
    // Authorization: validate provided session token against profile ownership
    if (!token || !/^[0-9a-f]{64}$/i.test(token))
      throw new Error('Unauthorized');
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', token))
      .unique();
    if (!session || session.userId !== (profile as any).userId) {
      throw new Error('Unauthorized');
    }

    const companyData = profile.companyData ?? {
      companyName: profile.name,
      contactPerson: profile.name,
      email: '',
      companyAddress: '',
      aboutCompany: '',
      companyPhotoUrl: '',
    };

    await ctx.db.patch(profileId, {
      companyData: {
        ...companyData,
        companyPhotoUrl: url,
      },
    });

    return { ok: true as const };
  },
});
