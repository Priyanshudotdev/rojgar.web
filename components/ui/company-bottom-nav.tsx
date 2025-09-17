'use client';

import { Home, Briefcase, Users, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard/company', icon: Home, label: 'Dashboard' },
  { href: '/dashboard/company/jobs', icon: Briefcase, label: 'Jobs' },
  { href: '/dashboard/company/applicants', icon: Users, label: 'Applicants' },
  { href: '/dashboard/company/profile', icon: User, label: 'Profile' },
];

export default function CompanyBottomNav() {
  const pathname = usePathname();

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t z-10">
      <div className="flex justify-around py-2">
        {navItems.map((item) => (
          <Link href={item.href} key={item.label}>
            <div
              className={`flex flex-col items-center space-y-1 transition-colors duration-150 ${
                pathname === item.href ? 'text-green-600' : 'text-gray-500'
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
