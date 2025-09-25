"use client";
import * as React from 'react';
import Image from 'next/image';
import { Card } from './card';
import { ShieldCheck, Timer, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CompanyProfileCardProps {
  name?: string;
  photoUrl?: string | null;
  sizeLabel?: string;
  industry?: string;
  responseTime?: string;
  verified?: boolean;
  className?: string;
}

export const CompanyProfileCard: React.FC<CompanyProfileCardProps> = ({
  name = 'Company',
  photoUrl,
  sizeLabel,
  industry,
  responseTime = 'Typically responds within a week',
  verified = true,
  className,
}) => {
  return (
    <Card className={cn('p-4 flex items-center gap-4 bg-gradient-to-br from-green-50 to-white border-green-100 shadow-sm', className)}>
      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-200 flex items-center justify-center">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <Image src={photoUrl} alt={name} fill className="object-cover" />
        ) : (
          <Building2 className="w-6 h-6 text-gray-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-semibold text-gray-900 text-base leading-tight truncate max-w-[180px]">{name}</h2>
          {verified && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
              <ShieldCheck className="w-3 h-3" /> Verified
            </span>
          )}
        </div>
        <div className="mt-1 text-xs text-gray-600 line-clamp-1">
          {industry || 'Industry not specified'}{sizeLabel ? ` • ${sizeLabel}` : ''}
        </div>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
          <Timer className="w-3 h-3" /> {responseTime}
        </div>
      </div>
    </Card>
  );
};

export default CompanyProfileCard;
