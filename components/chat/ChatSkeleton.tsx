import React from 'react';
import { Skeleton } from '../ui/skeleton';

export const ConversationListSkeleton: React.FC = () => {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <Skeleton className="h-3 w-6" />
        </div>
      ))}
    </div>
  );
};

export const MessageThreadSkeleton: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <div className="max-w-[70%] space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const ChatLayoutSkeleton: React.FC = () => {
  return (
    <div className="flex h-full w-full">
      <div className="hidden md:flex w-full">
        <div className="w-1/3 border-r">
          <ConversationListSkeleton />
        </div>
        <div className="flex-1 flex flex-col">
          <MessageThreadSkeleton />
          <div className="border-t p-4">
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
      <div className="flex md:hidden w-full flex-col">
        <ConversationListSkeleton />
      </div>
    </div>
  );
};
