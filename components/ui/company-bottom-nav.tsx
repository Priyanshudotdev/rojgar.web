'use client';

import { Home, Briefcase, Users, User } from 'lucide-react';
import { useUnreadCount } from '../../hooks/useChat';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle } from 'lucide-react';

const navItems = [
  { href: '/dashboard/company', icon: Home, label: 'Dashboard' },
  { href: '/dashboard/company/applicants', icon: Users, label: 'Applicants' },
  { href: '/dashboard/company/chat', icon: MessageCircle, label: 'Chat' },
  { href: '/dashboard/company/profile', icon: User, label: 'Profile' },
];

import { useMe } from '../providers/me-provider';

export default function CompanyBottomNav() {
  const pathname = usePathname();
  const { me } = useMe();
  const unread = useUnreadCount(me ?? null);

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t z-10">
      <div className="flex justify-around py-2">
        {navItems.map((item) => {
          const isChat = item.href === '/dashboard/company/chat';
          const active = isChat ? pathname.startsWith('/dashboard/company/chat') : pathname === item.href;
          return (
            <Link href={item.href} key={item.label}>
              <div
                className={`flex flex-col items-center space-y-1 transition-colors duration-150 ${
                  active ? 'text-green-600' : 'text-gray-500'
                }`}
              >
                <div className="relative">
                  <item.icon className="w-6 h-6" />
                  {isChat && unread > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full px-1.5 h-4 min-w-[1rem] flex items-center justify-center text-[10px] leading-none font-medium">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
