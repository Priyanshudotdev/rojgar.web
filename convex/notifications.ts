import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NotificationType = v.string(); // validated in schema via enum
const RecipientType = v.union(v.literal('company'), v.literal('job-seeker'));

async function insertNotification(ctx: any, doc: any) {
  return await ctx.db.insert('notifications', {
    read: false,
    createdAt: Date.now(),
    ...doc,
  });
}

// Generic creation supporting either profile type
export const createNotification = mutation({
  args: {
    recipientProfileId: v.id('profiles'),
    recipientType: RecipientType,
    type: NotificationType,
    title: v.string(),
    body: v.string(),
    jobId: v.optional(v.id('jobs')),
    applicationId: v.optional(v.id('applications')),
    conversationId: v.optional(v.id('conversations')),
    senderId: v.optional(v.id('profiles')),
  },
  handler: async (ctx, args) => {
    return await insertNotification(ctx, {
      profileId: args.recipientProfileId,
      recipientType: args.recipientType,
      type: args.type,
      title: args.title,
      body: args.body,
      jobId: args.jobId,
      applicationId: args.applicationId,
      conversationId: args.conversationId,
      senderId: args.senderId,
    });
  },
});

// Backward compatible company creation
export const createForCompany = mutation({
  args: {
    companyId: v.id('profiles'),
    type: NotificationType,
    title: v.string(),
    body: v.string(),
    jobId: v.optional(v.id('jobs')),
    applicationId: v.optional(v.id('applications')),
    conversationId: v.optional(v.id('conversations')),
    senderId: v.optional(v.id('profiles')),
  },
  handler: async (ctx, args) => {
    return await insertNotification(ctx, {
      companyId: args.companyId,
      profileId: args.companyId,
      recipientType: 'company',
      type: args.type,
      title: args.title,
      body: args.body,
      jobId: args.jobId,
      applicationId: args.applicationId,
      conversationId: args.conversationId,
      senderId: args.senderId,
    });
  },
});

export const createForJobSeeker = mutation({
  args: {
    profileId: v.id('profiles'),
    type: NotificationType,
    title: v.string(),
    body: v.string(),
    jobId: v.optional(v.id('jobs')),
    applicationId: v.optional(v.id('applications')),
    conversationId: v.optional(v.id('conversations')),
    senderId: v.optional(v.id('profiles')),
  },
  handler: async (ctx, args) => {
    return await insertNotification(ctx, {
      profileId: args.profileId,
      recipientType: 'job-seeker',
      type: args.type,
      title: args.title,
      body: args.body,
      jobId: args.jobId,
      applicationId: args.applicationId,
      conversationId: args.conversationId,
      senderId: args.senderId,
    });
  },
});

// Batch creation helper
export const createMany = mutation({
  args: {
    notifications: v.array(
      v.object({
        recipientProfileId: v.id('profiles'),
        recipientType: RecipientType,
        type: NotificationType,
        title: v.string(),
        body: v.string(),
        jobId: v.optional(v.id('jobs')),
        applicationId: v.optional(v.id('applications')),
        conversationId: v.optional(v.id('conversations')),
        senderId: v.optional(v.id('profiles')),
      }),
    ),
  },
  handler: async (ctx, { notifications }) => {
    const ids: any[] = [];
    for (const n of notifications) {
      const id = await insertNotification(ctx, {
        profileId: n.recipientProfileId,
        recipientType: n.recipientType,
        type: n.type,
        title: n.title,
        body: n.body,
        jobId: n.jobId,
        applicationId: n.applicationId,
        conversationId: n.conversationId,
        senderId: n.senderId,
      });
      ids.push(id);
    }
    return ids;
  },
});

// Queries ------------------------------------------------------------------

export const getByProfile = query({
  args: { profileId: v.id('profiles'), limit: v.optional(v.number()) },
  handler: async (ctx, { profileId, limit }) => {
    const items = await ctx.db
      .query('notifications')
      .withIndex('by_profileId_createdAt', (q: any) =>
        q.eq('profileId', profileId),
      )
      .collect();
    const sorted = items.sort((a: any, b: any) => b.createdAt - a.createdAt);
    return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
  },
});

export const getByCompany = query({
  args: { companyId: v.id('profiles'), limit: v.optional(v.number()) },
  handler: async (ctx, { companyId, limit }) => {
    const items = await ctx.db
      .query('notifications')
      .withIndex('by_companyId_createdAt', (q: any) =>
        q.eq('companyId', companyId),
      )
      .collect();
    const sorted = items.sort((a: any, b: any) => b.createdAt - a.createdAt);
    return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
  },
});

export const countUnreadByProfile = query({
  args: { profileId: v.id('profiles') },
  handler: async (ctx, { profileId }) => {
    const items = await ctx.db
      .query('notifications')
      .withIndex('by_profileId_createdAt', (q: any) =>
        q.eq('profileId', profileId),
      )
      .collect();
    return items.filter((n: any) => !n.read).length;
  },
});

export const countUnreadByCompany = query({
  args: { companyId: v.id('profiles') },
  handler: async (ctx, { companyId }) => {
    const items = await ctx.db
      .query('notifications')
      .withIndex('by_companyId_createdAt', (q: any) =>
        q.eq('companyId', companyId),
      )
      .collect();
    return items.filter((n: any) => !n.read).length;
  },
});

export const markAsRead = mutation({
  args: { notificationId: v.id('notifications') },
  handler: async (ctx, { notificationId }) => {
    await ctx.db.patch(notificationId, { read: true });
    return true;
  },
});

export const markAllAsReadByProfile = mutation({
  args: { profileId: v.id('profiles') },
  handler: async (ctx, { profileId }) => {
    const items = await ctx.db
      .query('notifications')
      .withIndex('by_profileId_createdAt', (q: any) =>
        q.eq('profileId', profileId),
      )
      .collect();
    await Promise.all(
      items
        .filter((n: any) => !n.read)
        .map((n: any) => ctx.db.patch(n._id, { read: true })),
    );
    return true;
  },
});

export const markAllAsReadByCompany = mutation({
  args: { companyId: v.id('profiles') },
  handler: async (ctx, { companyId }) => {
    const items = await ctx.db
      .query('notifications')
      .withIndex('by_companyId_createdAt', (q: any) =>
        q.eq('companyId', companyId),
      )
      .collect();
    await Promise.all(
      items
        .filter((n: any) => !n.read)
        .map((n: any) => ctx.db.patch(n._id, { read: true })),
    );
    return true;
  },
});

// Retrieve notifications related to an application
export const getByApplication = query({
  args: { applicationId: v.id('applications') },
  handler: async (ctx, { applicationId }) => {
    const items = await ctx.db
      .query('notifications')
      .withIndex('by_applicationId', (q: any) =>
        q.eq('applicationId', applicationId),
      )
      .collect();
    return items.sort((a: any, b: any) => b.createdAt - a.createdAt);
  },
});

export const getByConversation = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, { conversationId }) => {
    const items = await ctx.db
      .query('notifications')
      .withIndex('by_conversationId', (q: any) =>
        q.eq('conversationId', conversationId),
      )
      .collect();
    return items.sort((a: any, b: any) => b.createdAt - a.createdAt);
  },
});
