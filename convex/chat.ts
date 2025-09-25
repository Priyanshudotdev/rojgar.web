import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';

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
  }
};

// Shared validators
const ProfileId = v.id('profiles');

export const ensureConversation = mutation({
  args: {
    participantA: ProfileId, // any two participants (order agnostic)
    participantB: ProfileId,
    applicationId: v.optional(v.id('applications')),
  },
  handler: async (ctx, args) => {
    const [A, B] = ConversationIdentifier.for(args.participantA, args.participantB);
    // Attempt to find existing conversation via participantA index then filter B
    const existing = await ctx.db
      .query('conversations')
      .withIndex('by_participantA_lastMessageAt', q => q.eq('participantA', A))
      .collect();
    let convo = existing.find(c => c.participantB === B);
    if (convo) return convo._id;
    const now = Date.now();
    const id = await ctx.db.insert('conversations', {
      participantA: A,
      participantB: B,
      applicationId: args.applicationId,
      lastMessageAt: now,
      lastMessageId: undefined,
      unreadA: 0,
      unreadB: 0,
      createdAt: now,
    });
    return id;
  }
});

export const sendMessage = mutation({
  args: {
    conversationId: v.id('conversations'),
    senderId: ProfileId,
    body: v.string(),
  },
  handler: async (ctx, { conversationId, senderId, body }) => {
    const convo = await ctx.db.get(conversationId);
    if (!convo) throw new Error('Conversation not found');
    if (convo.participantA !== senderId && convo.participantB !== senderId) {
      throw new Error('Not a participant in this conversation');
    }
    const now = Date.now();
    const messageId = await ctx.db.insert('messages', {
      conversationId,
      senderId,
      body: body.trim(),
      kind: 'user',
      createdAt: now,
      deliveredAt: now,
      readAt: undefined,
    });
    // Update conversation metadata & unread counters.
    const unreadA = convo.participantA === senderId ? convo.unreadA : convo.unreadA + 1;
    const unreadB = convo.participantB === senderId ? convo.unreadB : convo.unreadB + 1;
    await ctx.db.patch(conversationId, {
      lastMessageAt: now,
      lastMessageId: messageId,
      unreadA,
      unreadB,
    });
    return { ok: true, messageId } as const;
  }
});

export const sendSystemMessage = mutation({
  args: {
    conversationId: v.id('conversations'),
    body: v.string(),
  },
  handler: async (ctx, { conversationId, body }) => {
    const convo = await ctx.db.get(conversationId);
    if (!convo) throw new Error('Conversation not found');
    const now = Date.now();
    const messageId = await ctx.db.insert('messages', {
      conversationId,
      senderId: convo.participantA, // arbitrarily store participantA to satisfy schema; treat specially on client
      body: body.trim(),
      kind: 'system',
      createdAt: now,
      deliveredAt: now,
      readAt: now, // system messages are implicitly read
    });
    await ctx.db.patch(conversationId, {
      lastMessageAt: now,
      lastMessageId: messageId,
    });
    return { ok: true, messageId } as const;
  }
});

export const getConversation = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, { conversationId }) => {
    const convo = await ctx.db.get(conversationId);
    if (!convo) return null;
    return convo;
  }
});

export const getOrCreateConversationForApplication = mutation({
  args: {
    applicationId: v.id('applications'),
    companyProfileId: v.id('profiles'),
    jobSeekerProfileId: v.id('profiles'),
  },
  handler: async (ctx, { applicationId, companyProfileId, jobSeekerProfileId }) => {
    const [A, B] = ConversationIdentifier.for(companyProfileId, jobSeekerProfileId);
    // Attempt to find existing by applicationId first
    const byApp = await ctx.db.query('conversations').withIndex('by_applicationId', q => q.eq('applicationId', applicationId)).collect();
    if (byApp.length > 0) return byApp[0]._id;
    // Fallback to participant scan
    const existing = await ctx.db
      .query('conversations')
      .withIndex('by_participantA_lastMessageAt', q => q.eq('participantA', A))
      .collect();
    const match = existing.find(c => c.participantB === B);
    if (match) return match._id;
    const now = Date.now();
    const convoId = await ctx.db.insert('conversations', {
      participantA: A,
      participantB: B,
      applicationId,
      lastMessageAt: now,
      lastMessageId: undefined,
      unreadA: 0,
      unreadB: 0,
      createdAt: now,
    });
    return convoId;
  }
});

export const listConversationsForProfile = query({
  args: { profileId: v.id('profiles'), limit: v.optional(v.number()) },
  handler: async (ctx, { profileId, limit }) => {
    const pageLimit = Math.min(100, limit ?? 50);
    // Collect as participantA
    const asA = await ctx.db
      .query('conversations')
      .withIndex('by_participantA_lastMessageAt', q => q.eq('participantA', profileId))
      .collect();
    // Collect as participantB via index on participantB
    const asB = await ctx.db
      .query('conversations')
      .withIndex('by_participantB_lastMessageAt', q => q.eq('participantB', profileId))
      .collect();
    const merged = [...asA, ...asB].sort((a,b) => b.lastMessageAt - a.lastMessageAt).slice(0, pageLimit);
    return merged;
  }
});

export const getMessages = query({
  args: { conversationId: v.id('conversations'), limit: v.optional(v.number()) },
  handler: async (ctx, { conversationId, limit }) => {
    const pageLimit = Math.min(200, limit ?? 100);
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_conversation_createdAt', q => q.eq('conversationId', conversationId))
      .order('desc')
      .take(pageLimit);
    return messages.sort((a,b) => a.createdAt - b.createdAt); // ascending for UI
  }
});

export const markConversationRead = mutation({
  args: { conversationId: v.id('conversations'), profileId: v.id('profiles') },
  handler: async (ctx, { conversationId, profileId }) => {
    const convo = await ctx.db.get(conversationId);
    if (!convo) return { ok: false, reason: 'not_found' } as const;
    if (convo.participantA !== profileId && convo.participantB !== profileId) {
      return { ok: false, reason: 'not_participant' } as const;
    }
    if (convo.participantA === profileId && convo.unreadA > 0) {
      await ctx.db.patch(conversationId, { unreadA: 0 });
    } else if (convo.participantB === profileId && convo.unreadB > 0) {
      await ctx.db.patch(conversationId, { unreadB: 0 });
    }
    return { ok: true } as const;
  }
});

export const getUnreadCount = query({
  args: { profileId: v.id('profiles') },
  handler: async (ctx, { profileId }) => {
    const asA = await ctx.db
      .query('conversations')
      .withIndex('by_participantA_lastMessageAt', q => q.eq('participantA', profileId))
      .collect();
    const asB = await ctx.db
      .query('conversations')
      .withIndex('by_participantB_lastMessageAt', q => q.eq('participantB', profileId))
      .collect();
    let total = 0;
    for (const c of asA) total += c.unreadA;
    for (const c of asB) total += c.unreadB;
    return { total } as const;
  }
});

export const searchMessages = query({
  args: { profileId: v.id('profiles'), term: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { profileId, term, limit }) => {
    const norm = term.trim().toLowerCase();
    if (!norm) return [] as any[];
    const pageLimit = Math.min(100, limit ?? 50);
    // Get all conversations for the profile first (bounded by typical usage)
    const asA = await ctx.db
      .query('conversations')
      .withIndex('by_participantA_lastMessageAt', q => q.eq('participantA', profileId))
      .collect();
    const asB = await ctx.db
      .query('conversations')
      .withIndex('by_participantB_lastMessageAt', q => q.eq('participantB', profileId))
      .collect();
    const convIds = [...asA, ...asB].map(c => c._id);
    const results: any[] = [];
    for (const id of convIds) {
      if (results.length >= pageLimit) break;
      const msgs = await ctx.db
        .query('messages')
        .withIndex('by_conversation_createdAt', q => q.eq('conversationId', id))
        .take(200); // scan recent slice
      for (const m of msgs) {
        if (results.length >= pageLimit) break;
        if (m.body.toLowerCase().includes(norm)) {
          results.push({ conversationId: id, message: m });
        }
      }
    }
    return results;
  }
});
