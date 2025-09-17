import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const storeOtp = mutation({
  args: {
    phone: v.string(),
    codeHash: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    purpose: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const previous = await ctx.db
      .query('otps')
      .withIndex('by_phone', (q) => q.eq('phone', args.phone))
      .collect();
    await Promise.all(
      previous.map((o) => ctx.db.patch(o._id, { consumed: true })),
    );
    await ctx.db.insert('otps', { ...args, consumed: false, attempts: 0 });
  },
});

export const latestOtpByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const otps = await ctx.db
      .query('otps')
      .withIndex('by_phone', (q) => q.eq('phone', phone))
      .collect();
    return otps.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
  },
});

export const incrementOtpAttempts = mutation({
  args: { otpId: v.id('otps') },
  handler: async (ctx, { otpId }) => {
    const rec = await ctx.db.get(otpId);
    if (rec) await ctx.db.patch(otpId, { attempts: rec.attempts + 1 });
  },
});

export const consumeOtp = mutation({
  args: { otpId: v.id('otps') },
  handler: async (ctx, { otpId }) => {
    const rec = await ctx.db.get(otpId);
    if (rec && !rec.consumed) {
      await ctx.db.patch(otpId, { consumed: true });
    }
  },
});

export const consumeOtpAndUpsertUser = mutation({
  args: {
    otpId: v.id('otps'),
    phone: v.string(),
    role: v.optional(v.union(v.literal('job-seeker'), v.literal('company'))),
  },
  handler: async (ctx, { otpId, phone, role }) => {
    await ctx.db.patch(otpId, { consumed: true });
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_phone', (q) => q.eq('phone', phone))
      .unique();
    const now = Date.now();
    if (!existingUser) {
      const userId = await ctx.db.insert('users', {
        phone,
        email: undefined,
        role: role ?? 'job-seeker',
        phoneVerified: true,
        createdAt: now,
      });
      // Create a minimal profile so dashboards depending on profileId work immediately
      await ctx.db.insert('profiles', {
        userId,
        name: 'New User',
        contactNumber: phone,
        createdAt: now,
        // Populate companyData or jobSeekerData minimally based on role for role derivation
        ...(role === 'company'
          ? {
              companyData: {
                companyName: 'New Employeer',
                contactPerson: 'Owner',
                email: '',
                companyAddress: '',
                aboutCompany: '',
                companyPhotoUrl: '',
              },
            }
          : {
              jobSeekerData: {
                dateOfBirth: now,
                gender: 'Prefer not to say',
                education: '',
                jobRole: '',
                experience: '',
                location: '',
                skills: [],
              },
            }),
      });
      return { userId };
    }
    const patch: Record<string, any> = {};
    if (!existingUser.phoneVerified) patch.phoneVerified = true;
    if (role && existingUser.role !== role) patch.role = role;
    if (Object.keys(patch).length > 0)
      await ctx.db.patch(existingUser._id, patch);
    return { userId: existingUser._id };
  },
});
