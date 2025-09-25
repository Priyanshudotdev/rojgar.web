import { formatDistanceToNow, isYesterday, format } from 'date-fns';
import { Id } from '../../convex/_generated/dataModel';

// Time Formatting ------------------------------------------------------------
export function formatMessageTime(ts?: number) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + 'm';
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + 'h';
  if (isYesterday(d)) return 'Yesterday';
  if (diff < 7 * 86_400_000) return format(d, 'EEE');
  return format(d, 'MMM d');
}

export function formatLastSeen(ts?: number) {
  if (!ts) return 'offline';
  return 'last seen ' + formatDistanceToNow(new Date(ts), { addSuffix: true });
}

// Message Formatting ---------------------------------------------------------
export function truncateMessage(body: string, len = 120) {
  if (body.length <= len) return body;
  return body.slice(0, len - 1) + '…';
}

export function formatSystemMessage(body: string) {
  return `[System] ${body}`;
}

export function sanitizeMessageContent(body: string) {
  // Minimal client-side sanitization (server should sanitize authoritative copy)
  return body.replace(/<script/gi, '&lt;script');
}

// Conversation Helpers -------------------------------------------------------
export function getConversationTitle(conversation: any) {
  return conversation?.jobTitle || 'Conversation';
}

export function getConversationAvatar(conversation: any) {
  return conversation?.avatarUrl || null;
}

export function sortConversations(list: any[]) {
  return [...list].sort(
    (a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0),
  );
}

// Privacy Helpers ------------------------------------------------------------
export function sanitizeProfileForChat(profile: any) {
  if (!profile) return profile;
  const { phone, email, ...rest } = profile; // hide sensitive fields
  return rest;
}

export function canInitiateChat(user: any, jobApplication: any) {
  if (!user || !jobApplication) return false;
  return ['submitted', 'review', 'interview', 'offer'].includes(
    jobApplication.status,
  );
}

// Status Helpers -------------------------------------------------------------
export function getMessageStatusIcon(msg: any) {
  if (msg.readAt) return 'read';
  if (msg.deliveredAt) return 'delivered';
  if (msg.optimistic) return 'sending';
  return 'sent';
}

export function getConversationStatusColor(status?: string) {
  switch (status) {
    case 'archived':
      return 'text-gray-400';
    case 'blocked':
      return 'text-red-500';
    default:
      return '';
  }
}

// Search Helpers -------------------------------------------------------------
export function searchMessages(messages: any[], term: string) {
  if (!term) return messages;
  const lower = term.toLowerCase();
  return messages.filter((m) => m.body?.toLowerCase().includes(lower));
}

export function filterConversations(convos: any[], term: string) {
  if (!term) return convos;
  const lower = term.toLowerCase();
  return convos.filter(
    (c) =>
      (c.jobTitle || '').toLowerCase().includes(lower) ||
      (c.lastMessagePreview || '').toLowerCase().includes(lower) ||
      (c.participantName || '').toLowerCase().includes(lower),
  );
}
