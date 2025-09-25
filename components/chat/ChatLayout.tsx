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

type SelectedConversation = { id: Id<'conversations'>; status?: string } | null;

export const ChatLayout: React.FC<ChatLayoutProps> = ({ role, searchTerm }) => {
  const [selected, setSelected] = useState<SelectedConversation>(null);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const { me } = useMe();
  const currentProfileId = me?.profile?._id as Id<'profiles'> | undefined;

  const handleSelect = (c: { id: string; status?: string }) => {
    setSelected({ id: c.id as any, status: c.status });
  };

  const handleBack = () => {
    setSelected(null);
  };

  // Desktop: split view; Mobile: conditional rendering (only one mount set)
  if (isDesktop) {
    return (
      <div className="flex h-full w-full">
        <div className="w-1/3 border-r flex flex-col">
          <ConversationList onSelect={handleSelect} activeId={selected?.id} role={role} searchTerm={searchTerm} />
        </div>
        <div className="flex-1 flex flex-col">
          <MessageThread conversationId={selected?.id} role={role} currentProfileId={currentProfileId} />
          <MessageComposer conversationId={selected?.id} status={selected?.status} />
        </div>
      </div>
    );
  }

  // Mobile
  if (!selected) {
    return (
      <div className="flex h-full w-full">
        <ConversationList onSelect={handleSelect} activeId={selected?.id} role={role} searchTerm={searchTerm} />
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center gap-2 p-2 border-b bg-white">
        <button onClick={handleBack} className="text-sm text-green-600 font-medium">Back</button>
        <span className="text-xs text-gray-500 truncate">Conversation</span>
      </div>
      <MessageThread conversationId={selected.id} role={role} currentProfileId={currentProfileId} />
      <MessageComposer conversationId={selected.id} status={selected.status} />
    </div>
  );
};
