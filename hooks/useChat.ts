import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from 'convex/react';
import { Id } from '../convex/_generated/dataModel';
import { api } from '../convex/_generated/api';
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
export function useConversations(pageSize = 20, enabled = true) {
  const [cursor, setCursor] = useState<string | null>(null);
  const [pendingCursor, setPendingCursor] = useState<string | null>(null);
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [exhausted, setExhausted] = useState(false);
  // Try to derive caller profile id from global (set by MeProvider) to avoid Convex auth dependency
  const [callerProfileId, setCallerProfileId] = useState<any>(undefined);
  useEffect(() => {
    try {
      const anyWin: any = window as any;
      if (anyWin && anyWin.__meProfileId)
        setCallerProfileId(anyWin.__meProfileId);
    } catch {}
  }, []);

  const finalEnabled = enabled && Boolean(callerProfileId);
  const { data, isLoading, error } = useCachedConvexQuery(
    api.chat.listConversationsForProfile,
    // Only include cursors when defined; passing null triggers validator errors
    finalEnabled
      ? ((c) => {
          const base: any = { limit: pageSize };
          if (typeof c === 'string') {
            base.cursorA = c;
            base.cursorB = c;
          }
          if (callerProfileId) base.profileId = callerProfileId;
          return base;
        })(cursor as any)
      : ('skip' as any),
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
  opts?: { currentProfileId?: Id<'profiles'> },
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
    const nextCursor = (data as any)?.nextCursor as string | null;
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

  // Auto-mark delivery for peer messages
  const markBatch = useMutation(api.chat.markMessagesAsDelivered);
  const batchPendingRef = useRef(false);
  useEffect(() => {
    if (!conversationId || !items.length || batchPendingRef.current) return;
    const myId = opts?.currentProfileId as any;
    if (!myId) return;
    const toDeliver = items
      .filter((m) => {
        const sender: any = (m as any).senderProfileId || (m as any).senderId;
        return !m.optimistic && !m.deliveredAt && sender && sender !== myId;
      })
      .map((m) => m._id as any);
    if (toDeliver.length === 0) return;
    batchPendingRef.current = true;
    (async () => {
      try {
        await markBatch({ messageIds: toDeliver });
      } finally {
        batchPendingRef.current = false;
      }
    })();
  }, [conversationId, items, opts?.currentProfileId, markBatch]);

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

export function useTypingIndicator(
  conversationId: Id<'conversations'> | undefined,
  currentProfileId?: Id<'profiles'>,
) {
  const { data } = useCachedConvexQuery(
    api.chat.getConversationWithParticipants,
    conversationId ? { conversationId } : 'skip',
    {
      key: `chat:convo:${conversationId}:withParticipants`,
      ttlMs: 5000,
      persist: false,
    },
  );
  const setTyping = useMutation(api.chat.setTypingIndicator);
  const convoWrap = data as any;
  const convo = convoWrap?.conversation as any;
  const otherTypingTs = (() => {
    if (!convo) return 0;
    if (!currentProfileId)
      return Math.max(convo.typingAAt || 0, convo.typingBAt || 0);
    const amA = convo.participantA === currentProfileId;
    return amA ? convo.typingBAt || 0 : convo.typingAAt || 0;
  })();
  const isOtherTyping = otherTypingTs && Date.now() - otherTypingTs < 5000;
  const otherParticipantName: string | undefined = (() => {
    if (!convoWrap) return undefined;
    const amA = convoWrap.conversation?.participantA === currentProfileId;
    const other = amA ? convoWrap.participantB : convoWrap.participantA;
    return other?.company?.companyName || other?.name || undefined;
  })();
  const publish = useCallback(async () => {
    if (!conversationId) return;
    try {
      await setTyping({ conversationId });
    } catch {}
  }, [conversationId, setTyping]);
  return { isOtherTyping, setTyping: publish, otherParticipantName } as const;
}

export function useTypingPublisher(
  conversationId: Id<'conversations'> | undefined,
  currentProfileId?: Id<'profiles'>,
) {
  const setTyping = useMutation(api.chat.setTypingIndicator);
  const lastSentRef = useRef(0);
  const timeoutRef = useRef<any>(null);
  const touch = useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current > 2000) {
      lastSentRef.current = now;
      if (conversationId) setTyping({ conversationId });
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      // let it expire naturally on clients after ~5s
    }, 5000);
  }, [conversationId, setTyping]);
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);
  return { touch } as const;
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
  const meProfileIdRef = useRef<Id<'profiles'> | undefined>(undefined);
  // Best-effort: try to derive me.profile from a global if available in app context
  // This file avoids importing providers to keep hooks decoupled; runtime may set window.__meProfileId
  useEffect(() => {
    try {
      const anyWin: any = window as any;
      if (anyWin && anyWin.__meProfileId)
        meProfileIdRef.current = anyWin.__meProfileId as Id<'profiles'>;
    } catch {}
  }, []);

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
          // Keep as sent (no deliveredAt yet). Include sender to preserve isMine
          senderProfileId:
            (optimistic as any).senderProfileId || meProfileIdRef.current,
          // deliveredAt intentionally omitted here to allow ✓ (single) state until receipt
        });
      } catch (e) {
        helpers?.failOptimistic?.(optimistic._id as any);
      }
    },
    [conversationId, sendMutation, helpers],
  );
}

// useUnreadCount -------------------------------------------------------------
export function useUnreadCount(me: { profile: any } | null) {
  const { data } = useCachedConvexQuery(
    api.chat.getUnreadCount,
    me?.profile?._id ? ({ profileId: me.profile._id } as any) : 'skip',
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
    async (status: 'active' | 'archived' | 'blocked') => {
      if (!conversationId) return;
      await update({ conversationId, status });
    },
    [conversationId, update],
  );
  return { setStatus } as const;
}
