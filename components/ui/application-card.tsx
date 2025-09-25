"use client";

import React from 'react';
import { Card } from './card';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Button } from './button';
import { ApplicationStatusBadge } from './application-status-badge';
import type { EnrichedApplication } from '@/hooks/useApplications';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface ApplicationCardProps {
  application: EnrichedApplication;
  onChat?: (application: EnrichedApplication) => void;
  onViewJob?: (jobId: string) => void;
  className?: string;
}

export function ApplicationCard({ application, onChat, onViewJob, className }: ApplicationCardProps) {
  const router = useRouter();
  const job = application.job;
  const company = job?.company;
  const appliedAgo = formatDistanceToNow(new Date(application.appliedAt), { addSuffix: true });
  const location = job?.location?.city || '—';
  const salary = job?.salary ? `${job.salary.min.toLocaleString()} - ${job.salary.max.toLocaleString()}` : '—';

  return (
    <Card className={cn('p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow', className)}>
      <div className="flex items-start gap-3">
        <Avatar className="w-12 h-12">
          {company?.photoUrl ? <AvatarImage src={company.photoUrl} alt={company.name} /> : null}
          <AvatarFallback>{(company?.name || 'C').slice(0,1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold truncate">{job?.title || 'Job removed'}</h3>
            <ApplicationStatusBadge status={application.status} />
          </div>
          <p className="text-xs text-gray-500 truncate">{company?.name || 'Unknown company'}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-600">
            <span>{location}</span>
            <span>{job?.jobType}</span>
            <span>₹{salary}</span>
            <span>Applied {appliedAgo}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (job?._id) {
              onViewJob ? onViewJob(job._id as any) : router.push(`/job/${job._id}`);
            }
          }}
          aria-label="View job details"
        >
          <ExternalLink className="h-4 w-4 mr-1" /> Details
        </Button>
        <Button
          size="sm"
            onClick={() => onChat?.(application)}
            aria-label="Message company"
        >
          <MessageCircle className="h-4 w-4 mr-1" /> Message Company
        </Button>
      </div>
    </Card>
  );
}

export function ApplicationCardSkeleton() {
  return (
    <Card className="p-4 animate-pulse space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-200 rounded w-1/3" />
          <div className="flex gap-3">
            <div className="h-3 bg-gray-200 rounded w-12" />
            <div className="h-3 bg-gray-200 rounded w-16" />
            <div className="h-3 bg-gray-200 rounded w-10" />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <div className="h-8 w-24 bg-gray-200 rounded" />
        <div className="h-8 w-32 bg-gray-200 rounded" />
      </div>
    </Card>
  );
}
