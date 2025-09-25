import { MessageCircle } from 'lucide-react';
import { ChatLayout } from '../../../../components/chat/ChatLayout';
import { useUnreadCount } from '../../../../hooks/useChat';
import { Input } from '../../../../components/ui/input';
import { useState } from 'react';
import { Button } from '../../../../components/ui/button';

export default function JobSeekerChatPage() {
  const unread = useUnreadCount();
  const [search, setSearch] = useState('');

  return (
    <div className="flex flex-col h-full pb-20">
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MessageCircle className="w-5 h-5 text-green-600" />
          <h1 className="text-base font-semibold flex items-center gap-2">Messages {unread > 0 && <span className="text-xs text-green-600 font-medium">({unread})</span>}</h1>
        </div>
        <div className="hidden md:flex gap-2 items-center">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" className="h-8 w-40" />
          <Button variant="outline" size="sm">Settings</Button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ChatLayout role="job-seeker" searchTerm={search} />
      </div>
    </div>
  );
}
