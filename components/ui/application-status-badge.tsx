"use client";

import { Badge } from './badge';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, Eye, Users, XCircle } from 'lucide-react';
import React from 'react';
import type { ApplicationStatus } from '@/hooks/useApplications';

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  pulse?: boolean; // optional manual override
}

const ICONS: Record<ApplicationStatus, React.ReactNode> = {
  New: <Clock className="h-3.5 w-3.5" />,
  'In Review': <Eye className="h-3.5 w-3.5" />,
  Interviewing: <Users className="h-3.5 w-3.5" />,
  Hired: <CheckCircle className="h-3.5 w-3.5" />,
  Rejected: <XCircle className="h-3.5 w-3.5" />,
};

const COLORS: Record<ApplicationStatus, string> = {
  New: 'bg-blue-600 text-white',
  'In Review': 'bg-amber-500 text-white',
  Interviewing: 'bg-purple-600 text-white',
  Hired: 'bg-green-600 text-white',
  Rejected: 'bg-red-600 text-white',
};

export function ApplicationStatusBadge({ status, size = 'sm', className, pulse }: ApplicationStatusBadgeProps) {
  const base = 'inline-flex items-center gap-1 rounded-full font-medium';
  const sizes = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };
  const animate = pulse ?? ['New', 'In Review', 'Interviewing'].includes(status) ? 'animate-pulse-subtle' : '';
  return (
    <Badge
      aria-label={`Application status: ${status}`}
      className={cn(base, sizes[size], COLORS[status], animate, className)}
      variant="secondary"
    >
      {ICONS[status]}
      <span>{status}</span>
    </Badge>
  );
}

// Minimal pulse animation utility (can be moved to globals if reused)
// Add this CSS somewhere global if not present:
// .animate-pulse-subtle { animation: pulse-subtle 2s ease-in-out infinite; }
// @keyframes pulse-subtle { 0%,100% { opacity: 1 } 50% { opacity: .75 } }
