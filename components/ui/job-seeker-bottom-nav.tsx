'use client';

import { FileText, Home, Search, User, MessageCircle } from 'lucide-react';
import { useUnreadCount } from '../../hooks/useChat';
import { usePathname, useRouter } from 'next/navigation';

import { useMe } from '../providers/me-provider';

export default function JobSeekerBottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;
  const { me } = useMe();
  const unread = useUnreadCount(me ?? null);

  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-center z-20">
      <div className="w-full max-w-sm mx-auto bg-white border-t border-gray-200 rounded-t-xl flex justify-around py-4 px-4">
        <button
          onClick={() => router.push('/dashboard/job-seeker')}
          className={`flex flex-col items-center space-y-1 focus:outline-none ${
            isActive('/dashboard/job-seeker') ? 'text-green-600' : 'text-gray-400'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-xs font-medium">Home</span>
        </button>

        <button
          onClick={() => router.push('/dashboard/job-seeker/search')}
          className={`flex flex-col items-center space-y-1 focus:outline-none ${
            isActive('/dashboard/job-seeker/search') ? 'text-green-600' : 'text-gray-400'
          }`}
        >
          <Search className="w-5 h-5" />
          <span className="text-xs font-medium">Search</span>
        </button>

        {/* Jobs tab removed as requested */}

        <button
          onClick={() => router.push('/dashboard/job-seeker/chat')}
          className={`relative flex flex-col items-center space-y-1 focus:outline-none ${
            pathname.startsWith('/dashboard/job-seeker/chat') ? 'text-green-600' : 'text-gray-400'
          }`}
        >
          <div className="relative">
            <MessageCircle className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full px-1.5 h-4 min-w-[1rem] flex items-center justify-center text-[10px] leading-none font-medium">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </div>
          <span className="text-xs font-medium">Chat</span>
        </button>

        <button
          onClick={() => router.push('/dashboard/job-seeker/profile')}
          className={`flex flex-col items-center space-y-1 focus:outline-none ${
            isActive('/dashboard/job-seeker/profile') ? 'text-green-600' : 'text-gray-400'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-xs font-medium">Profile</span>
        </button>
      </div>
    </nav>
  );
}
