"use client";
// Client component: uses hooks (useEffect, useMemo, useRef)
import React, { useEffect, useMemo, useRef } from 'react';
import { useConversations } from '../../hooks/useChat';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../lib/utils';
import { Skeleton } from '../ui/skeleton';
import { filterConversations } from '../../lib/utils/chat-helpers';

interface ConversationListProps {
  onSelect: (c: { id: string; status?: string }) => void;
  activeId?: string | null;
  role: 'job-seeker' | 'company';
  searchTerm?: string;
}

export const ConversationList: React.FC<ConversationListProps> = ({ onSelect, activeId, role, searchTerm }) => {
  const { conversations, isLoading, loadMore, exhausted } = useConversations();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || exhausted) return;
    const el = loadMoreRef.current;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) loadMore();
      });
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore, exhausted]);

  const filtered = useMemo(() => filterConversations(conversations as any, searchTerm || ''), [conversations, searchTerm]);

  return (
    <div className="flex flex-col h-full">
      {/* Search input removed; searchTerm controlled by parent header */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && conversations.length === 0 ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            {searchTerm ? 'No matches' : "You don't have any chats!!"}
          </div>
        ) : (
          <ul className="divide-y">
            {filtered.map(c => {
              const primary = c.participantName || c.jobTitle || 'Conversation';
              const secondary = c.participantName && c.jobTitle ? c.jobTitle : c.lastMessagePreview || (c.jobTitle && !c.participantName ? '' : 'No messages yet');
              const isActive = activeId === c._id;
              return (
                <li
                  key={c._id}
                  onClick={() => onSelect({ id: c._id as any, status: c.status })}
                  className={cn(
                    'p-4 cursor-pointer flex gap-4 items-start transition-colors hover:bg-green-50',
                    isActive && 'bg-[#25D366]/10 border-l-4 border-[#25D366]'
                  )}
                >
                  <Avatar className="w-12 h-12 ring-1 ring-black/5 shadow-sm">
                    {c.participantAvatarUrl ? (
                      <AvatarImage src={c.participantAvatarUrl} alt={primary} />
                    ) : null}
                    <AvatarFallback>{(primary || 'C').slice(0,1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-base font-semibold truncate">{primary}</p>
                      <span className="text-xs text-gray-500 whitespace-nowrap">{c.lastMessageAt ? formatDistanceToNow(new Date(c.lastMessageAt), { addSuffix: true }) : ''}</span>
                    </div>
                    {secondary ? (
                      <p className="text-sm text-gray-600 line-clamp-1">{secondary}</p>
                    ) : null}
                  </div>
                  {c.unreadCount ? (
                    <span className="bg-[#25D366] text-white px-2 h-5 min-w-[1.25rem] flex items-center justify-center rounded-full text-[10px]">
                      {c.unreadCount > 99 ? '99+' : c.unreadCount}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {!exhausted && (
          <div ref={loadMoreRef} className="p-4 text-center text-xs text-gray-400">Loading more…</div>
        )}
      </div>
    </div>
  );
};
