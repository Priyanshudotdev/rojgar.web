"use client";
// Added client directive to enable useState and custom hooks in this page.
import { MessageCircle, Filter, Settings, Search } from 'lucide-react';
import { ChatLayout } from '../../../../components/chat/ChatLayout';
import { useUnreadCount } from '../../../../hooks/useChat';
import { Input } from '../../../../components/ui/input';
import { Button } from '../../../../components/ui/button';
import { useState } from 'react';
import { useMe } from '@/components/providers/me-provider';

export default function CompanyChatPage() {
  const { me } = useMe();
  const unread = useUnreadCount(me ?? null);
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
 
  return (
    <div className="flex flex-col h-full pb-20">
      {/* WhatsApp-style top header */}
      <div className="sticky top-0 z-20">
        <div className="bg-green-600 text-white px-4 sm:px-6 py-3 flex items-center gap-3">
          <MessageCircle className="w-5 h-5" />
          <h1 className="text-base sm:text-lg font-semibold tracking-tight flex items-center gap-2">
            Messages
            {unread > 0 && (
              <span className="ml-1 inline-flex items-center justify-center text-[11px] font-semibold min-w-[1.25rem] h-5 px-1 rounded-full bg-white text-[#25D366]">
                {unread}
              </span>
            )}
          </h1>
          <div className="flex-1" />
          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="h-9 pl-9 w-64 rounded-full bg-white text-gray-900 placeholder:text-gray-400 shadow-sm focus-visible:ring-[#25D366]"
              />
            </div>
            <Button
              size="sm"
              onClick={() => setFiltersOpen((o) => !o)}
              className="gap-1 rounded-full bg-white text-[#25D366] hover:bg-white/90"
              variant="default"
            >
              <Filter className="w-4 h-4" />
              Filters
            </Button>
            <Button size="sm" className="gap-1 rounded-full bg-white text-[#25D366] hover:bg-white/90" variant="default">
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </div>
        </div>
        {/* Mobile search row */}
        <div className="md:hidden bg-white px-4 py-2 border-b">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="h-10 pl-9 w-full rounded-full bg-white text-gray-900 placeholder:text-gray-400 border-gray-200 focus-visible:ring-[#25D366]"
              />
            </div>
            <Button
              size="icon"
              onClick={() => setFiltersOpen((o) => !o)}
              className="rounded-full bg-[#25D366] hover:bg-[#128C7E] text-white"
            >
              <Filter className="w-4 h-4" />
            </Button>
            <Button size="icon" className="rounded-full bg-[#25D366] hover:bg-[#128C7E] text-white">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {filtersOpen && (
          <div className="bg-white px-4 sm:px-6 py-2 border-b text-xs text-gray-600">
            <div className="flex items-center gap-3">
              <span className="text-gray-500">Filter panel (future): job, status, unread</span>
            </div>
          </div>
        )}
      </div>
      {/* Body */}
      <div className="flex-1 min-h-0 bg-white">
        <ChatLayout role="company" searchTerm={search} />
      </div>
    </div>
  );
}
