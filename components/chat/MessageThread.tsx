import React, { useCallback, useEffect, useRef } from 'react';
import { useMessages, useMarkAsRead } from '../../hooks/useChat';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { cn } from '../../lib/utils';
import { Skeleton } from '../ui/skeleton';
import { format } from 'date-fns';
import { Id } from '../../convex/_generated/dataModel';

interface MessageThreadProps {
  conversationId?: Id<'conversations'> | string | null;
  role: 'job-seeker' | 'company';
  currentProfileId?: Id<'profiles'>; // used for alignment
}

export const MessageThread: React.FC<MessageThreadProps> = ({ conversationId, role, currentProfileId }) => {
  const convId = (conversationId || undefined) as Id<'conversations'> | undefined;
  const { messages, isLoading, loadOlder, loadingMore, bottomRef } = useMessages(convId);
  const markAsRead = useMarkAsRead(convId);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);

  // Load older messages when top becomes visible
  useEffect(() => {
    if (!topSentinelRef.current) return;
    const el = topSentinelRef.current;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) loadOlder();
      });
    }, { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, [loadOlder]);

  // Mark as read only when user is near bottom (viewport heuristic)
  useEffect(() => {
    const scroller = topSentinelRef.current?.parentElement; // container with overflow
    if (!scroller) return;
    const handler = () => {
      const el = scroller;
      const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
      if (distanceFromBottom < 120) {
        markAsRead();
      }
    };
    scroller.addEventListener('scroll', handler, { passive: true });
    // initial check
    handler();
    return () => scroller.removeEventListener('scroll', handler);
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
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        <div ref={topSentinelRef} />
        {loadingMore && <div className="text-center text-[10px] text-gray-400 py-2">Loading…</div>}
  {isLoading && messages.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={cn('flex gap-2', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
                <div className="max-w-[70%]">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-xs text-gray-400 pt-10">No messages yet. Say hello!</div>
        ) : (
          messages.map(m => {
            const isMine = currentProfileId && m.senderProfileId === currentProfileId;
            if (m.isSystem) {
              return (
                <div key={m._id} className="flex w-full justify-center py-1">
                  <div className="text-[11px] px-3 py-1 rounded-full bg-gray-100 text-gray-500 tracking-wide">
                    {m.body}
                  </div>
                </div>
              );
            }
            return (
              <div key={m._id} className={cn('flex w-full', isMine ? 'justify-end' : 'justify-start')}>
                {!isMine && (
                  <Avatar className="w-8 h-8 mr-2 self-end">
                    <AvatarFallback>{'U'}</AvatarFallback>
                  </Avatar>
                )}
                <div className={cn('rounded-lg px-3 py-2 text-sm shadow-sm max-w-[75%] break-words', isMine ? 'bg-green-600 text-white' : 'bg-white border')}> 
                  <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                  <div className={cn('mt-1 text-[10px] flex items-center gap-1', isMine ? 'text-green-100' : 'text-gray-400')}> 
                    <span>{format(new Date(m.createdAt), 'p')}</span>
                    {isMine && (
                      <span>
                        {m.readAt ? <span className="text-blue-300">✓✓</span> : m.deliveredAt ? <span className="text-gray-300">✓✓</span> : m.optimistic ? <span className="animate-pulse">…</span> : <span className="text-gray-300">✓</span>}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
