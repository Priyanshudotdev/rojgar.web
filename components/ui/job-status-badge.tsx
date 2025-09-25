"use client";
import * as React from 'react';
import { Badge } from './badge';
import { CheckCircle2, Flame, Clock4, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export type JobStatus = 'Active' | 'Closed' | 'Urgent' | 'New';

export interface JobStatusBadgeProps {
  status: JobStatus | string;
  postedAt?: Date | string | number;
  className?: string;
  urgentHint?: string;
}

export const JobStatusBadge: React.FC<JobStatusBadgeProps> = ({ status, postedAt, className, urgentHint }) => {
  const normalized = (status as string) as JobStatus;
  const ageMs = postedAt ? Date.now() - new Date(postedAt).getTime() : null;
  const isFresh = ageMs !== null && ageMs < 1000 * 60 * 60 * 24 * 2; // < 2 days

  let variant: string = 'default';
  let Icon: any = null;
  let extra: React.ReactNode = null;
  let pulse = false;
  switch (normalized) {
    case 'Active':
      variant = 'secondary';
      Icon = CheckCircle2;
      break;
    case 'Closed':
      variant = 'destructive';
      Icon = CheckCircle2;
      break;
    case 'Urgent':
      variant = 'destructive';
      Icon = Flame;
      pulse = true;
      extra = urgentHint ? <span className="ml-1 hidden sm:inline">{urgentHint}</span> : null;
      break;
    case 'New':
      variant = 'outline';
      Icon = Sparkles;
      break;
    default:
      variant = 'secondary';
  }
  if (normalized === 'Active' && isFresh) {
    extra = <span className="ml-1 text-[10px] text-green-700">New</span>;
  }

  return (
    <Badge
      variant={variant as any}
      className={cn('flex items-center gap-1.5 text-xs font-medium relative', pulse ? 'animate-pulse' : '', className)}
      aria-label={`Job status: ${normalized}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      <span>{normalized}</span>
      {extra}
      {normalized === 'Closed' && <Clock4 className="w-3 h-3 opacity-60" />}
    </Badge>
  );
};

export default JobStatusBadge;
