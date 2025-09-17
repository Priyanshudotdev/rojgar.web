import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const createForCompany = mutation({
  args: {
    companyId: v.id('profiles'),
    type: v.string(),
    title: v.string(),
    body: v.string(),
    jobId: v.optional(v.id('jobs')),
  },
  handler: async (ctx, { companyId, type, title, body, jobId }) => {
    const id = await ctx.db.insert('notifications', {
      companyId,
      type,
      title,
      body,
      jobId,
      read: false,
      createdAt: Date.now(),
    });
    return id;
  },
});

export const getByCompany = query({
  args: { companyId: v.id('profiles'), limit: v.optional(v.number()) },
  handler: async (ctx, { companyId, limit }) => {
    // There is no sort by index in Convex yet; fetch and sort in memory
    const items = await ctx.db
      .query('notifications')
      .withIndex('by_companyId', (q) => q.eq('companyId', companyId))
      .collect();
    const sorted = items.sort((a, b) => b.createdAt - a.createdAt);
    return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
  },
});

export const countUnreadByCompany = query({
  args: { companyId: v.id('profiles') },
  handler: async (ctx, { companyId }) => {
    const items = await ctx.db
      .query('notifications')
      .withIndex('by_companyId', (q) => q.eq('companyId', companyId))
      .collect();
    const unread = items.filter((n) => !n.read).length;
    return unread;
  },
});

export const markAsRead = mutation({
  args: { notificationId: v.id('notifications') },
  handler: async (ctx, { notificationId }) => {
    await ctx.db.patch(notificationId, { read: true });
    return true;
  },
});

export const markAllAsRead = mutation({
  args: { companyId: v.id('profiles') },
  handler: async (ctx, { companyId }) => {
    const items = await ctx.db
      .query('notifications')
      .withIndex('by_companyId', (q) => q.eq('companyId', companyId))
      .collect();
    await Promise.all(
      items
        .filter((n) => !n.read)
        .map((n) => ctx.db.patch(n._id, { read: true })),
    );
    return true;
  },
});
