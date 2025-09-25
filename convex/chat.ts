import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';

// ---------------------------------------------------------------------------
// Helpers & Authorization
// ---------------------------------------------------------------------------

async function getCallerUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity?.();
  if (!identity) throw new Error('UNAUTHENTICATED');
  // identity.tokenIdentifier often includes provider prefix; we stored phone-based users
  // We search sessions by token not available here; assume identity.subject is user id string when using custom auth.
  const userId = (identity as any).subject || (identity as any).userId;
  if (!userId) throw new Error('UNAUTHENTICATED');
  return await ctx.db.get(userId as Id<'users'>);
}

async function getCallerProfile(ctx: any) {
  const identity = await ctx.auth.getUserIdentity?.();
  if (!identity) throw new Error('UNAUTHENTICATED');
  const userId = (identity as any).subject || (identity as any).userId;
  if (!userId) throw new Error('UNAUTHENTICATED');
  const prof = await ctx.db
    .query('profiles')
    .withIndex('by_userId', (q: any) => q.eq('userId', userId as Id<'users'>))
    .unique();
  if (!prof) throw new Error('PROFILE_NOT_FOUND');
  return prof;
}

function sanitizeProfileForViewer(
  profile: any,
  viewerRole: 'company' | 'job-seeker',
) {
  if (!profile) return null;
  const base = {
    _id: profile._id,
    name: profile.name,
    role: profile.companyData ? 'company' : 'job-seeker',
    company: profile.companyData
      ? {
          companyName: profile.companyData.companyName,
          companyPhotoUrl: profile.companyData.companyPhotoUrl,
        }
      : undefined,
    jobSeeker: profile.jobSeekerData
      ? {
          jobRole: profile.jobSeekerData.jobRole,
          profilePhotoUrl: profile.jobSeekerData.profilePhotoUrl,
        }
      : undefined,
  } as any;
  // Privacy: hide raw contact number from job seekers viewing company? or vice versa
  if (viewerRole === 'job-seeker' && base.role === 'company') {
    // omit contactNumber, email, contactPerson
  }
  if (viewerRole === 'company' && base.role === 'job-seeker') {
    // omit contactNumber (keep minimal)
  }
  return base;
}

/**
 * Chat / Messaging backend utilities.
 * A conversation exists between exactly two profile participants (company & job-seeker)
 * and is optionally linked to a specific application. Participants are stored in
 * sorted order (lexicographically by string id) to ensure uniqueness of (A,B) pair.
 */

function sortParticipants(a: Id<'profiles'>, b: Id<'profiles'>) {
  return String(a) < String(b) ? [a, b] : [b, a];
}

const ConversationIdentifier = {
  for(a: Id<'profiles'>, b: Id<'profiles'>) {
    return sortParticipants(a, b) as [Id<'profiles'>, Id<'profiles'>];
  },
  pairKey(a: Id<'profiles'>, b: Id<'profiles'>) {
    const [A, B] = sortParticipants(a, b);
    return `${A}:${B}`;
  },
};

// Shared validators
const ProfileId = v.id('profiles');

async function notifyNewMessage(ctx: any, convo: any, message: any) {
  try {
    // Send notification only to company when job seeker sends a user message (not system)
    if (message.kind !== 'user') return;
    const recipientProfileId =
      message.senderId === convo.participantA
        ? convo.participantB
        : convo.participantA;
    const recipientProfile = await ctx.db.get(recipientProfileId);
    const senderProfile = await ctx.db.get(message.senderId);
    if (!recipientProfile || !senderProfile) return;
    const companyId = recipientProfile.companyData
      ? recipientProfile._id
      : undefined;
    if (!companyId) return; // notify only companies for now
    await ctx.db.insert('notifications', {
      companyId,
      type: 'chat:new_message',
      title: 'New chat message',
      body: `${senderProfile.name || 'User'} sent a message`,
      jobId: convo.jobId,
      read: false,
      createdAt: Date.now(),
    });
  } catch (e) {
    console.error('notifyNewMessage failed', e);
  }
}

export const ensureConversation = mutation({
  args: {
    participantA: ProfileId,
    participantB: ProfileId,
    applicationId: v.optional(v.id('applications')),
    jobId: v.optional(v.id('jobs')),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerProfile(ctx);
    if (caller._id !== args.participantA && caller._id !== args.participantB)
      throw new Error('FORBIDDEN: not a participant');
    const [A, B] = ConversationIdentifier.for(
      args.participantA,
      args.participantB,
    );
    const pairKey = ConversationIdentifier.pairKey(A, B);
    // Fast path: by applicationId
    if (args.applicationId) {
      const byApp = await ctx.db
        .query('conversations')
        .withIndex('by_applicationId', (q: any) =>
          q.eq('applicationId', args.applicationId),
        )
        .collect();
      if (byApp[0]) return byApp[0]._id;
    }
    // Scan by pairKey
    const existingPair = await ctx.db
      .query('conversations')
      .withIndex('by_pairKey', (q: any) => q.eq('pairKey', pairKey))
      .unique();
    if (existingPair) return existingPair._id;
    // Double-check (race) before insert
    const recheck = await ctx.db
      .query('conversations')
      .withIndex('by_pairKey', (q: any) => q.eq('pairKey', pairKey))
      .unique();
    if (recheck) return recheck._id;
    const now = Date.now();
    const id = await ctx.db.insert('conversations', {
      participantA: A,
      participantB: B,
      applicationId: args.applicationId,
      jobId: args.jobId,
      status: 'active',
      pairKey,
      lastMessageAt: now,
      lastMessageId: undefined,
      unreadA: 0,
      unreadB: 0,
      createdAt: now,
    });
    return id;
  },
});

export const sendMessage = mutation({
  args: { conversationId: v.id('conversations'), body: v.string() },
  handler: async (ctx, { conversationId, body }) => {
    const senderProfile = await getCallerProfile(ctx);
    const convo: any = await ctx.db.get(conversationId);
    if (!convo) throw new Error('NOT_FOUND');
    if (convo.status === 'blocked') throw new Error('FORBIDDEN: blocked');
    if (
      convo.participantA !== senderProfile._id &&
      convo.participantB !== senderProfile._id
    ) {
      throw new Error('FORBIDDEN: not participant');
    }
    const trimmed = body.trim();
    if (!trimmed) throw new Error('EMPTY_BODY');
    const now = Date.now();
    const messageId = await ctx.db.insert('messages', {
      conversationId,
      senderId: senderProfile._id,
      body: trimmed,
      kind: 'user',
      createdAt: now,
      deliveredAt: now,
      readAt: undefined,
    });
    const unreadA =
      convo.participantA === senderProfile._id
        ? convo.unreadA
        : convo.unreadA + 1;
    const unreadB =
      convo.participantB === senderProfile._id
        ? convo.unreadB
        : convo.unreadB + 1;
    await ctx.db.patch(conversationId, {
      lastMessageAt: now,
      lastMessageId: messageId,
      unreadA,
      unreadB,
    });
    const updatedConvo = {
      ...convo,
      unreadA,
      unreadB,
      lastMessageAt: now,
      lastMessageId: messageId,
    };
    // Notification
    await notifyNewMessage(ctx, updatedConvo, {
      _id: messageId,
      kind: 'user',
      senderId: senderProfile._id,
      body: trimmed,
    });
    return { ok: true, messageId } as const;
  },
});

export const sendSystemMessage = mutation({
  args: { conversationId: v.id('conversations'), body: v.string() },
  handler: async (ctx, { conversationId, body }) => {
    // System messages can be emitted by backend events; still ensure conversation exists
    const convo: any = await ctx.db.get(conversationId);
    if (!convo) throw new Error('NOT_FOUND');
    const now = Date.now();
    const trimmed = body.trim();
    if (!trimmed) throw new Error('EMPTY_BODY');
    const messageId = await ctx.db.insert('messages', {
      conversationId,
      senderId: convo.participantA,
      body: trimmed,
      kind: 'system',
      createdAt: now,
      deliveredAt: now,
      readAt: now,
    });
    await ctx.db.patch(conversationId, {
      lastMessageAt: now,
      lastMessageId: messageId,
    });
    return { ok: true, messageId } as const;
  },
});

export const getConversation = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, { conversationId }) => {
    const caller = await getCallerProfile(ctx);
    const convo = await ctx.db.get(conversationId);
    if (!convo) return null;
    if (convo.participantA !== caller._id && convo.participantB !== caller._id)
      return null;
    return convo;
  },
});

export const getOrCreateConversationForApplication = mutation({
  args: { applicationId: v.id('applications') },
  handler: async (ctx, { applicationId }) => {
    const caller = await getCallerProfile(ctx);
    const application = await ctx.db.get(applicationId);
    if (!application) throw new Error('NOT_FOUND');
    // Fetch job to derive company profile
    const job = await ctx.db.get(application.jobId);
    if (!job) throw new Error('JOB_NOT_FOUND');
    const companyProfileId = job.companyId as Id<'profiles'>;
    const jobSeekerProfileId = application.jobSeekerId as Id<'profiles'>;
    if (caller._id !== companyProfileId && caller._id !== jobSeekerProfileId) {
      throw new Error('FORBIDDEN');
    }
    const [A, B] = ConversationIdentifier.for(
      companyProfileId,
      jobSeekerProfileId,
    );
    const pairKey = ConversationIdentifier.pairKey(A, B);
    const byApp = await ctx.db
      .query('conversations')
      .withIndex('by_applicationId', (q: any) =>
        q.eq('applicationId', applicationId),
      )
      .collect();
    if (byApp[0]) return byApp[0]._id;
    const existingPair = await ctx.db
      .query('conversations')
      .withIndex('by_pairKey', (q: any) => q.eq('pairKey', pairKey))
      .unique();
    if (existingPair) {
      if (!existingPair.applicationId)
        await ctx.db.patch(existingPair._id, { applicationId });
      return existingPair._id;
    }
    // Final recheck (double-checked locking) to mitigate race between uniqueness check and insert
    const recheck = await ctx.db
      .query('conversations')
      .withIndex('by_pairKey', (q: any) => q.eq('pairKey', pairKey))
      .unique();
    if (recheck) {
      if (!recheck.applicationId)
        await ctx.db.patch(recheck._id, { applicationId });
      return recheck._id;
    }
    const now = Date.now();
    const convoId = await ctx.db.insert('conversations', {
      participantA: A,
      participantB: B,
      applicationId,
      jobId: application.jobId,
      status: 'active',
      pairKey,
      lastMessageAt: now,
      lastMessageId: undefined,
      unreadA: 0,
      unreadB: 0,
      createdAt: now,
    });
    return convoId;
  },
});

export const listConversationsForProfile = query({
  args: {
    limit: v.optional(v.number()),
    cursorA: v.optional(v.string()),
    cursorB: v.optional(v.string()),
  },
  handler: async (ctx, { limit, cursorA, cursorB }) => {
    const caller = await getCallerProfile(ctx);
    const pageLimit = Math.min(100, limit ?? 30);
    const qA = ctx.db
      .query('conversations')
      .withIndex('by_participantA_lastMessageAt', (q: any) =>
        q.eq('participantA', caller._id),
      )
      .order('desc');
    const qB = ctx.db
      .query('conversations')
      .withIndex('by_participantB_lastMessageAt', (q: any) =>
        q.eq('participantB', caller._id),
      )
      .order('desc');
    const pageA = await qA.paginate({
      cursor: cursorA ? JSON.parse(cursorA) : undefined,
      numItems: pageLimit,
    });
    const pageB = await qB.paginate({
      cursor: cursorB ? JSON.parse(cursorB) : undefined,
      numItems: pageLimit,
    });
    // Merge two sorted lists (by lastMessageAt)
    const merged: any[] = [];
    let i = 0,
      j = 0;
    const a = pageA.page;
    const b = pageB.page;
    while (merged.length < pageLimit && (i < a.length || j < b.length)) {
      const ai = a[i];
      const bj = b[j];
      if (ai && (!bj || ai.lastMessageAt >= bj.lastMessageAt)) {
        if (ai.status !== 'blocked') merged.push(ai);
        i++;
        continue;
      }
      if (bj) {
        if (bj.status !== 'blocked') merged.push(bj);
        j++;
        continue;
      }
    }
    // Enrich conversations with participant & job metadata for UI labeling
    const viewerRole: 'company' | 'job-seeker' = caller.companyData
      ? 'company'
      : 'job-seeker';
    const enriched = await Promise.all(
      merged.map(async (c) => {
        const otherId =
          c.participantA === caller._id ? c.participantB : c.participantA;
        const other: any = await ctx.db.get(otherId);
        let jobTitle: string | undefined = undefined;
        if (c.jobId) {
          const job: any = await ctx.db.get(c.jobId);
          if (job) jobTitle = job.title;
        }
        // Resolve participant display name role-aware
        let participantName: string | undefined = undefined;
        let participantAvatarUrl: string | undefined = undefined;
        if (other) {
          const isCompany = !!other?.companyData;
          if (viewerRole === 'job-seeker' && isCompany) {
            participantName = other?.companyData?.companyName || other?.name;
            participantAvatarUrl = other?.companyData?.companyPhotoUrl;
          } else if (viewerRole === 'company' && !isCompany) {
            participantName = other?.name;
            participantAvatarUrl = other?.jobSeekerData?.profilePhotoUrl;
          } else {
            participantName = other?.name;
            participantAvatarUrl = isCompany
              ? other?.companyData?.companyPhotoUrl
              : other?.jobSeekerData?.profilePhotoUrl;
          }
        }
        // Last message preview (fetch message body if we have id)
        let lastMessagePreview: string | undefined = undefined;
        if (c.lastMessageId) {
          const msg: any = await ctx.db.get(c.lastMessageId);
          if (msg && msg.body) {
            const body = (msg.body as string).trim();
            lastMessagePreview =
              body.length > 140 ? body.slice(0, 139) + '…' : body;
          }
        }
        const unreadCount =
          c.participantA === caller._id ? c.unreadA : c.unreadB;
        return {
          ...c,
          participantName,
          participantAvatarUrl,
          jobTitle,
          lastMessagePreview,
          unreadCount,
        };
      }),
    );
    return {
      conversations: enriched,
      nextCursorA: pageA.continueCursor
        ? JSON.stringify(pageA.continueCursor)
        : undefined,
      nextCursorB: pageB.continueCursor
        ? JSON.stringify(pageB.continueCursor)
        : undefined,
    } as const;
  },
});

export const getMessages = query({
  args: {
    conversationId: v.id('conversations'),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { conversationId, limit, cursor }) => {
    const caller = await getCallerProfile(ctx);
    const convo = await ctx.db.get(conversationId);
    if (!convo) return { messages: [], nextCursor: undefined } as const;
    if (convo.participantA !== caller._id && convo.participantB !== caller._id)
      return { messages: [], nextCursor: undefined } as const;
    const pageLimit = Math.min(200, limit ?? 50);
    const q = ctx.db
      .query('messages')
      .withIndex('by_conversation_createdAt', (q: any) =>
        q.eq('conversationId', conversationId),
      )
      .order('desc');
    const page = await q.paginate({
      cursor: cursor ? JSON.parse(cursor) : undefined,
      numItems: pageLimit,
    });
    const ordered = [...page.page].sort((a, b) => a.createdAt - b.createdAt);
    return {
      messages: ordered,
      nextCursor: page.continueCursor
        ? JSON.stringify(page.continueCursor)
        : undefined,
    } as const;
  },
});

export const markMessagesAsRead = mutation({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, { conversationId }) => {
    const caller = await getCallerProfile(ctx);
    const convo: any = await ctx.db.get(conversationId);
    if (!convo) return { ok: false, reason: 'not_found' } as const;
    if (convo.participantA !== caller._id && convo.participantB !== caller._id)
      return { ok: false, reason: 'not_participant' } as const;
    const now = Date.now();
    const msgs = await ctx.db
      .query('messages')
      .withIndex('by_conversation_createdAt', (q: any) =>
        q.eq('conversationId', conversationId),
      )
      .take(500); // batch window
    const toUpdate = msgs.filter((m) => m.senderId !== caller._id && !m.readAt);
    await Promise.all(
      toUpdate.map((m) => ctx.db.patch(m._id, { readAt: now })),
    );
    if (convo.participantA === caller._id && convo.unreadA > 0)
      await ctx.db.patch(conversationId, { unreadA: 0 });
    if (convo.participantB === caller._id && convo.unreadB > 0)
      await ctx.db.patch(conversationId, { unreadB: 0 });
    return { ok: true, updated: toUpdate.length } as const;
  },
});

export const markMessageAsDelivered = mutation({
  args: { messageId: v.id('messages') },
  handler: async (ctx, { messageId }) => {
    const caller = await getCallerProfile(ctx);
    const msg = await ctx.db.get(messageId);
    if (!msg) return { ok: false } as const;
    const convo = await ctx.db.get(msg.conversationId);
    if (!convo) return { ok: false } as const;
    if (convo.participantA !== caller._id && convo.participantB !== caller._id)
      return { ok: false } as const;
    if (!msg.deliveredAt)
      await ctx.db.patch(messageId, { deliveredAt: Date.now() });
    return { ok: true } as const;
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const caller = await getCallerProfile(ctx);
    const asA = await ctx.db
      .query('conversations')
      .withIndex('by_participantA_lastMessageAt', (q: any) =>
        q.eq('participantA', caller._id),
      )
      .collect();
    const asB = await ctx.db
      .query('conversations')
      .withIndex('by_participantB_lastMessageAt', (q: any) =>
        q.eq('participantB', caller._id),
      )
      .collect();
    let total = 0;
    for (const c of asA) total += c.unreadA;
    for (const c of asB) total += c.unreadB;
    return { total } as const;
  },
});

export const searchMessages = query({
  args: { term: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { term, limit }) => {
    const caller = await getCallerProfile(ctx);
    const norm = term.trim().toLowerCase();
    if (!norm) return [] as any[];
    const pageLimit = Math.min(100, limit ?? 50);
    const asA = await ctx.db
      .query('conversations')
      .withIndex('by_participantA_lastMessageAt', (q: any) =>
        q.eq('participantA', caller._id),
      )
      .collect();
    const asB = await ctx.db
      .query('conversations')
      .withIndex('by_participantB_lastMessageAt', (q: any) =>
        q.eq('participantB', caller._id),
      )
      .collect();
    const convIds = [...asA, ...asB].map((c) => c._id);
    const results: any[] = [];
    for (const id of convIds) {
      if (results.length >= pageLimit) break;
      const msgs = await ctx.db
        .query('messages')
        .withIndex('by_conversation_createdAt', (q: any) =>
          q.eq('conversationId', id),
        )
        .take(200);
      for (const m of msgs) {
        if (results.length >= pageLimit) break;
        if (m.body.toLowerCase().includes(norm))
          results.push({ conversationId: id, message: m });
      }
    }
    return results;
  },
});

export const updateConversationStatus = mutation({
  args: {
    conversationId: v.id('conversations'),
    status: v.union(
      v.literal('active'),
      v.literal('archived'),
      v.literal('blocked'),
    ),
  },
  handler: async (ctx, { conversationId, status }) => {
    const caller = await getCallerProfile(ctx);
    const convo = await ctx.db.get(conversationId);
    if (!convo) return { ok: false, reason: 'not_found' } as const;
    if (convo.participantA !== caller._id && convo.participantB !== caller._id)
      return { ok: false, reason: 'not_participant' } as const;
    await ctx.db.patch(conversationId, { status });
    return { ok: true } as const;
  },
});

export const getConversationsByJob = query({
  args: {
    jobId: v.id('jobs'),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { jobId, limit, cursor }) => {
    const caller = await getCallerProfile(ctx);
    const pageLimit = Math.min(100, limit ?? 30);
    const q = ctx.db
      .query('conversations')
      .withIndex('by_jobId_lastMessageAt', (q: any) => q.eq('jobId', jobId))
      .order('desc');
    const page = await q.paginate({
      cursor: cursor ? JSON.parse(cursor) : undefined,
      numItems: pageLimit,
    });
    const filtered = page.page.filter(
      (c) => c.participantA === caller._id || c.participantB === caller._id,
    );
    return {
      conversations: filtered,
      nextCursor: page.continueCursor
        ? JSON.stringify(page.continueCursor)
        : undefined,
    } as const;
  },
});

export const getConversationWithParticipants = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, { conversationId }) => {
    const caller = await getCallerProfile(ctx);
    const convo: any = await ctx.db.get(conversationId);
    if (!convo) return null;
    if (convo.participantA !== caller._id && convo.participantB !== caller._id)
      return null;
    const a = await ctx.db.get(convo.participantA);
    const b = await ctx.db.get(convo.participantB);
    const viewerRole = caller.companyData ? 'company' : 'job-seeker';
    return {
      conversation: convo,
      participantA: sanitizeProfileForViewer(a, viewerRole),
      participantB: sanitizeProfileForViewer(b, viewerRole),
    } as const;
  },
});

export const searchConversations = query({
  args: { term: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { term, limit }) => {
    const caller = await getCallerProfile(ctx);
    const norm = term.trim().toLowerCase();
    if (!norm) return [] as any[];
    const pageLimit = Math.min(100, limit ?? 50);
    // replicate listConversationsForProfile logic (first pages only)
    const asA = await ctx.db
      .query('conversations')
      .withIndex('by_participantA_lastMessageAt', (q: any) =>
        q.eq('participantA', caller._id),
      )
      .order('desc')
      .take(pageLimit);
    const asB = await ctx.db
      .query('conversations')
      .withIndex('by_participantB_lastMessageAt', (q: any) =>
        q.eq('participantB', caller._id),
      )
      .order('desc')
      .take(pageLimit);
    const convs = [...asA, ...asB]
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
      .slice(0, pageLimit);
    const results: any[] = [];
    for (const c of convs) {
      if (results.length >= (limit ?? 50)) break;
      const otherId =
        c.participantA === caller._id ? c.participantB : c.participantA;
      const prof: any = await ctx.db.get(otherId);
      const texts: string[] = [];
      if (prof && (prof as any).name) texts.push((prof as any).name);
      if (prof && (prof as any).companyData?.companyName)
        texts.push((prof as any).companyData.companyName);
      if (c.jobId) {
        const job: any = await ctx.db.get(c.jobId);
        if (job && (job as any).title) texts.push((job as any).title);
      }
      const hay = texts.join(' ').toLowerCase();
      if (hay.includes(norm)) results.push(c);
    }
    return results;
  },
});
