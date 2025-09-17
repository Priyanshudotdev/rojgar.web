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

// Set or update the company's profile picture; stores Convex storageId in companyData.companyPhotoUrl
export const setCompanyPhoto = mutation({
  args: {
    profileId: v.id('profiles'),
    url: v.string(),
  },
  handler: async (ctx, { profileId, url }) => {
    const profile = await ctx.db.get(profileId);
    if (!profile) throw new Error('Profile not found');

    // Optionally verify that the current session user matches profile.userId
    // If you have auth context, add checks here.

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
