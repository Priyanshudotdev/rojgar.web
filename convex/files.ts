import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// Generate a signed upload URL to send a file directly to Convex storage from the client.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const url = await ctx.storage.generateUploadUrl();
    return url;
  },
});

// Given a storageId, return a temporary URL suitable for <img src>.
export const getUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    const url = await ctx.storage.getUrl(storageId);
    return url; // can be null if missing
  },
});
