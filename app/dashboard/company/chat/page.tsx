import { MessageCircle, Filter } from 'lucide-react';
import { ChatLayout } from '../../../../components/chat/ChatLayout';
import { useUnreadCount } from '../../../../hooks/useChat';
import { Input } from '../../../../components/ui/input';
import { Button } from '../../../../components/ui/button';
import { useState } from 'react';

export default function CompanyChatPage() {
  const unread = useUnreadCount();
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="flex flex-col h-full pb-20">
      <div className="px-4 py-3 border-b bg-white/70 backdrop-blur sticky top-0 z-10 flex items-center gap-3">
        <MessageCircle className="w-5 h-5 text-green-600" />
        <h1 className="text-base font-semibold flex items-center gap-2">Messages {unread > 0 && <span className="text-xs text-green-600 font-medium">({unread})</span>}</h1>
        <div className="flex-1" />
        <div className="hidden md:flex gap-2 items-center">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" className="h-8 w-48" />
          <Button variant="outline" size="sm" onClick={() => setFiltersOpen(o => !o)} className="gap-1"><Filter className="w-4 h-4" /> Filters</Button>
          <Button variant="outline" size="sm">Settings</Button>
        </div>
      </div>
      {filtersOpen && (
        <div className="border-b bg-white px-4 py-2 text-xs flex items-center gap-3">
          <span className="text-gray-500">Filter panel (future): job, status, unread</span>
        </div>
      )}
      <div className="flex-1 min-h-0">
        <ChatLayout role="company" searchTerm={search} />
      </div>
    </div>
  );
}
