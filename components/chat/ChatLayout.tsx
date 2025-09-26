"use client";
// Client component: uses useState, custom hooks, media queries.
import React, { useState } from 'react';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { MessageComposer } from './MessageComposer';
import { Id } from '../../convex/_generated/dataModel';
import { useMe } from '../providers/me-provider';

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    setMatches(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

interface ChatLayoutProps {
  role: 'job-seeker' | 'company';
  searchTerm?: string;
}

interface SelectedConversation { id: Id<'conversations'>; status?: string }

export const ChatLayout: React.FC<ChatLayoutProps> = ({ role, searchTerm }) => {
  const [selected, setSelected] = useState<SelectedConversation | null>(null);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const { me } = useMe();
  const currentProfileId = me?.profile?._id as Id<'profiles'> | undefined;

  const handleSelect = (c: { id: string; status?: string }) => {
    setSelected({ id: c.id as Id<'conversations'>, status: c.status });
  };

  const handleBack = () => {
    setSelected(null);
  };

  // Desktop: split view; Mobile: conditional rendering (only one mount set)
  const activeConversationId: Id<'conversations'> | null = selected ? selected.id : null;

  if (isDesktop) {
    // WhatsApp-like desktop: show only list until a conversation is selected.
    if (!selected) {
      return (
        <div className="flex h-full w-full bg-white">
          <div className="w-full flex flex-col">
            <ConversationList onSelect={handleSelect} activeId={activeConversationId} role={role} searchTerm={searchTerm} />
          </div>
        </div>
      );
    }
    return (
      <div className="flex h-full w-full bg-gray-50">
        <div className="w-1/3 border-r border-gray-200 flex flex-col bg-white">
          <ConversationList onSelect={handleSelect} activeId={activeConversationId} role={role} searchTerm={searchTerm} />
        </div>
        <div className="flex-1 flex flex-col bg-white">
          {/* Delay rendering thread until currentProfileId resolves to avoid misalignment flicker */}
          <MessageThread conversationId={selected?.id} role={role} currentProfileId={currentProfileId ?? (me?.profile?._id as Id<'profiles'> | undefined)} />
          <MessageComposer conversationId={selected?.id} status={selected?.status} />
        </div>
      </div>
    );
  }

  // Mobile
  if (!selected) {
    return (
      <div className="flex h-full w-full bg-gray-50">
        <ConversationList onSelect={handleSelect} activeId={activeConversationId} role={role} searchTerm={searchTerm} />
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full w-full bg-white">
      <div className="flex items-center gap-2 p-3 border-b border-gray-200 bg-white shadow-sm">
        <button onClick={handleBack} className="text-sm text-[#25D366] font-medium px-2 py-1">Back</button>
        <span className="text-sm text-gray-600 truncate">Conversation</span>
      </div>
  <MessageThread conversationId={selected.id} role={role} currentProfileId={currentProfileId ?? (me?.profile?._id as Id<'profiles'> | undefined)} />
      <MessageComposer conversationId={selected.id} status={selected.status} />
    </div>
  );
};
