"use client";
// Client component: uses hooks (useEffect, useRef)
import React, { useCallback, useEffect, useRef } from 'react';
import { useMessages, useMarkAsRead, useTypingIndicator } from '../../hooks/useChat';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { cn } from '../../lib/utils';
import { Skeleton } from '../ui/skeleton';
import { format } from 'date-fns';
import { Id } from '../../convex/_generated/dataModel';
import MessageStatusIcon from './MessageStatusIcon';

interface MessageThreadProps {
  conversationId?: Id<'conversations'> | string | null;
  role: 'job-seeker' | 'company';
  currentProfileId?: Id<'profiles'>; // used for alignment
}

export const MessageThread: React.FC<MessageThreadProps> = ({ conversationId, role, currentProfileId }) => {
  const convId = (conversationId || undefined) as Id<'conversations'> | undefined;
  const { messages, isLoading, loadOlder, loadingMore, bottomRef } = useMessages(convId, 30, { currentProfileId });
  const markAsRead = useMarkAsRead(convId);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const { isOtherTyping, otherParticipantName } = useTypingIndicator(convId, currentProfileId);

  // Load older messages when top becomes visible
  useEffect(() => {
    if (!topSentinelRef.current) return;
    const el = topSentinelRef.current;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) loadOlder();
      });
    }, { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, [loadOlder]);

  // Mark as read when scrolled near bottom
  useEffect(() => {
    const scroller = topSentinelRef.current?.parentElement;
    if (!scroller) return;
    const handler = () => {
      const el = scroller;
      const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
      if (distanceFromBottom < 120) {
        markAsRead();
      }
    };
    scroller.addEventListener('scroll', handler as any, { passive: true } as any);
    handler();
    return () => scroller.removeEventListener('scroll', handler as any);
  }, [markAsRead, messages.length]);

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
        Select a conversation
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <div ref={topSentinelRef} />
        {loadingMore && (
          <div className="text-center text-[10px] text-gray-400 py-2">Loading…</div>
        )}
        {isLoading && messages.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={cn('flex gap-2', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
                <div className="max-w-[80%]">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-xs text-gray-400 pt-10">No messages yet. Say hello!</div>
        ) : (
          messages.map((m, i) => {
            // Fallback: if currentProfileId is unavailable, use sender on last message in view as a temporary hint to avoid flicker
            const fallbackId = currentProfileId ?? (messages[messages.length - 1]?.senderProfileId as Id<'profiles'> | undefined);
            const msgSender = (m as any).senderProfileId ?? (m as any).senderId;
            const isMine = fallbackId && msgSender === fallbackId;
            const prev = i > 0 ? messages[i - 1] : undefined;
            const next = i < messages.length - 1 ? messages[i + 1] : undefined;
            const prevSame = prev && ((prev as any).senderProfileId ?? (prev as any).senderId) === msgSender;
            const nextSame = next && ((next as any).senderProfileId ?? (next as any).senderId) === msgSender;
            const bubbleRounding = isMine
              ? cn('rounded-2xl', prevSame ? 'rounded-tr-md' : 'rounded-tr-2xl', nextSame ? 'rounded-br-md' : 'rounded-br-2xl')
              : cn('rounded-2xl', prevSame ? 'rounded-tl-md' : 'rounded-tl-2xl', nextSame ? 'rounded-bl-md' : 'rounded-bl-2xl');
            const itemSpacing = cn('flex w-full items-end gap-2', isMine ? 'justify-end' : 'justify-start', prevSame ? 'mt-0.5' : 'mt-2');
            if ((m as any).kind === 'system') {
              return (
                <div key={m._id} className="flex w-full justify-center py-2">
                  <div className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-500 tracking-wide">
                    {m.body}
                  </div>
                </div>
              );
            }
            return (
              <div key={m._id} className={itemSpacing}>
                {!isMine && (
                  <Avatar className="w-8 h-8 self-start">
                    <AvatarFallback>{'U'}</AvatarFallback>
                  </Avatar>
                )}
                <div className={cn(bubbleRounding, 'px-4 py-2 text-sm shadow-sm max-w-[80%] break-words', isMine ? 'bg-[#25D366] text-white' : 'bg-[#f1f1f1] text-gray-900')}>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                  <div className={cn('mt-1 text-[10px] flex items-center gap-1 justify-end', isMine ? 'text-white/80' : 'text-gray-500')}>
                    <span>{format(new Date((m as any).createdAt), 'p')}</span>
                    {isMine && (
                      <MessageStatusIcon
                        optimistic={(m as any).optimistic}
                        deliveredAt={(m as any).deliveredAt}
                        readAt={(m as any).readAt}
                        error={(m as any).error}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        {isOtherTyping && (
          <div className="w-full flex justify-start mt-1">
            <div className="px-3 py-1 rounded-2xl bg-[#f1f1f1] text-gray-600 text-[11px] inline-flex items-center gap-1 shadow-sm">
              <span>{otherParticipantName ? `${otherParticipantName} is typing` : 'typing'}</span>
              <span className="inline-flex items-center gap-0.5">
                <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-.2s]"></span>
                <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-.1s]"></span>
                <span className="w-1 h-1 bg-current rounded-full animate-bounce"></span>
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
