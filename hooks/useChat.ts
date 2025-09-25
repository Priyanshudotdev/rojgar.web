import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from 'convex/react';
import { Id } from '../convex/_generated/dataModel';
// After adding chat.ts server module, re-run `npx convex dev` so generated API includes `chat`.
// Until codegen is refreshed, cast api to any to access chat.* symbols without type errors.
import { api as generatedApi } from '../convex/_generated/api';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api: any = generatedApi;
import { useCachedConvexQuery } from './useCachedConvexQuery';

// Chat related hooks encapsulating conversation & message logic.
// These hooks follow existing caching + real-time patterns while adding
// optimistic updates, pagination helpers, and convenience utilities.

// Types ----------------------------------------------------------------------
export interface ConversationSummary {
  _id: Id<'conversations'>;
  lastMessageAt?: number;
  lastMessagePreview?: string;
  participantProfileId?: Id<'profiles'>; // other participant for labeling
  jobTitle?: string;
  jobId?: Id<'jobs'> | null;
  unreadCount?: number;
  status?: string;
  participantName?: string;
  participantAvatarUrl?: string;
}

export interface MessageRecord {
  _id: Id<'messages'>;
  conversationId: Id<'conversations'>;
  senderProfileId?: Id<'profiles'> | null;
  body: string;
  createdAt: number;
  deliveredAt?: number | null;
  readAt?: number | null;
  isSystem?: boolean;
  optimistic?: boolean; // local only flag
  error?: boolean; // send failed
}

// useConversations -----------------------------------------------------------
export function useConversations(pageSize = 20) {
  const [cursor, setCursor] = useState<string | null>(null);
  const [pendingCursor, setPendingCursor] = useState<string | null>(null);
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [exhausted, setExhausted] = useState(false);

  const { data, isLoading, error } = useCachedConvexQuery(
    api.chat.listConversationsForProfile,
    // Updated server signature: using dual cursors (cursorA/cursorB) removed in refactor, keep compatibility
    { cursorA: cursor, cursorB: cursor, limit: pageSize } as any,
    { key: 'chat:conversations', ttlMs: 30_000, persist: false },
  );

  useEffect(() => {
    if (!data) return;
    // Expect backend to return shape: { conversations, pageInfo }
    const conversations = (data as any).conversations as ConversationSummary[];
    // Determine next cursor logic using nextCursorA/nextCursorB if present
    const nextA = (data as any).nextCursorA as string | undefined;
    const nextB = (data as any).nextCursorB as string | undefined;
    if (cursor === null) {
      setItems(conversations);
    } else if (pendingCursor === cursor) {
      setItems((prev) => [...prev, ...conversations]);
    }
    // Exhausted when both are undefined
    setExhausted(!nextA && !nextB);
    setPendingCursor(null);
  }, [data, cursor, pendingCursor]);

  const loadMore = useCallback(() => {
    if (exhausted || pendingCursor) return;
    const next = (data as any)?.nextCursorA || (data as any)?.nextCursorB;
    if (!next) return;
    setPendingCursor(next);
    setCursor(next);
  }, [data, exhausted, pendingCursor]);

  return { conversations: items, isLoading, error, loadMore, exhausted };
}

// useMessages ----------------------------------------------------------------
export function useMessages(
  conversationId: Id<'conversations'> | undefined,
  pageSize = 30,
) {
  const [cursor, setCursor] = useState<string | null>(null); // older messages cursor
  const [loadingMore, setLoadingMore] = useState(false);
  const [items, setItems] = useState<MessageRecord[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const autoscrollRef = useRef(true);

  const args = conversationId
    ? { conversationId, cursor, limit: pageSize }
    : 'skip';
  const { data, isLoading, error } = useCachedConvexQuery(
    api.chat.getMessages,
    args as any,
    { key: `chat:messages:${conversationId}`, ttlMs: 15_000, persist: false },
  );

  // Append or replace message list depending on cursor state
  useEffect(() => {
    if (!data || !conversationId) return;
    const payload = data as any;
    const messages = payload.messages as MessageRecord[];
    const pageInfo = payload.pageInfo as { nextCursor: string | null };

    if (cursor === null) {
      setItems(messages);
    } else {
      setItems((prev) => [...messages, ...prev]); // older messages prepend
    }
    setLoadingMore(false);

    // If autoscroll enabled and initial load, scroll to bottom soon
    if (autoscrollRef.current && bottomRef.current && cursor === null) {
      requestAnimationFrame(() =>
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' }),
      );
    }
  }, [data, conversationId, cursor]);

  const loadOlder = useCallback(() => {
    if (loadingMore) return;
    const nextCursor = (data as any)?.pageInfo?.nextCursor as string | null;
    if (!nextCursor) return;
    setLoadingMore(true);
    setCursor(nextCursor);
  }, [data, loadingMore]);

  // Real-time new messages: rely on convex live query reactivity (data includes latest)
  // Optimistic messages are merged locally below.

  const addOptimisticMessage = useCallback((temp: MessageRecord) => {
    setItems((prev) => [...prev, temp]);
    autoscrollRef.current = true;
    requestAnimationFrame(() =>
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' }),
    );
  }, []);

  const resolveOptimistic = useCallback(
    (tempId: string, real: MessageRecord) => {
      setItems((prev) =>
        prev.map((m) => (m._id === (tempId as any) ? real : m)),
      );
    },
    [],
  );

  const failOptimistic = useCallback((tempId: string) => {
    setItems((prev) =>
      prev.map((m) => (m._id === (tempId as any) ? { ...m, error: true } : m)),
    );
  }, []);

  return {
    messages: items,
    isLoading,
    error,
    loadOlder,
    loadingMore,
    bottomRef,
    addOptimisticMessage,
    resolveOptimistic,
    failOptimistic,
  } as const;
}

// useSendMessage -------------------------------------------------------------
export function useSendMessage(
  conversationId: Id<'conversations'> | undefined,
  helpers?: {
    addOptimisticMessage?: (m: MessageRecord) => void;
    resolveOptimistic?: (tempId: string, real: MessageRecord) => void;
    failOptimistic?: (tempId: string) => void;
  },
) {
  const sendMutation = useMutation(api.chat.sendMessage);

  return useCallback(
    async (body: string) => {
      if (!conversationId) return;
      const trimmed = body.trim();
      if (!trimmed) return;
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic: MessageRecord = {
        _id: tempId as any,
        conversationId,
        body: trimmed,
        createdAt: Date.now(),
        optimistic: true,
      };
      helpers?.addOptimisticMessage?.(optimistic);
      try {
        const result = await sendMutation({ conversationId, body: trimmed });
        const realId = (result as any).messageId || result; // server returns { ok, messageId }
        helpers?.resolveOptimistic?.(optimistic._id as any, {
          ...optimistic,
          _id: realId as any,
          optimistic: false,
          deliveredAt: Date.now(),
        });
      } catch (e) {
        helpers?.failOptimistic?.(optimistic._id as any);
      }
    },
    [conversationId, sendMutation, helpers],
  );
}

// useUnreadCount -------------------------------------------------------------
export function useUnreadCount() {
  const { data } = useCachedConvexQuery(
    api.chat.getUnreadCount,
    {},
    { key: 'chat:unread', ttlMs: 10_000, persist: false },
  );
  return (data as any)?.total ?? 0;
}

// useMarkAsRead --------------------------------------------------------------
export function useMarkAsRead(conversationId: Id<'conversations'> | undefined) {
  const mark = useMutation(api.chat.markMessagesAsRead);
  const pendingRef = useRef(false);
  return useCallback(async () => {
    if (!conversationId || pendingRef.current) return;
    pendingRef.current = true;
    try {
      await mark({ conversationId });
    } finally {
      pendingRef.current = false;
    }
  }, [conversationId, mark]);
}

// useConversationActions -----------------------------------------------------
export function useConversationActions(
  conversationId: Id<'conversations'> | undefined,
) {
  const update = useMutation(api.chat.updateConversationStatus);
  const setStatus = useCallback(
    async (status: string) => {
      if (!conversationId) return;
      await update({ conversationId, status });
    },
    [conversationId, update],
  );
  return { setStatus } as const;
}
