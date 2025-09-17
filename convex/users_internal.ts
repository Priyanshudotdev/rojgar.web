import { mutation } from './_generated/server';
import { v } from 'convex/values';

export const savePasswordHash = mutation({
  args: { userId: v.id('users'), passwordHash: v.string() },
  handler: async (ctx, { userId, passwordHash }) => {
    await ctx.db.patch(userId, { passwordHash });
    return { ok: true };
  },
});
