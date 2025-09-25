"use client";
import * as React from 'react';
import { Card } from './card';
import { Briefcase, Users, Clock3, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EnhancedJobCardProps {
  experience: string;
  jobType: string;
  positions: number | string;
  staffNeeded?: number | string;
  className?: string;
}

const Item: React.FC<{ label: string; value: React.ReactNode; icon: React.ReactNode }>= ({ label, value, icon }) => (
  <div className="flex flex-col items-center justify-center py-2">
    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center mb-1 text-green-700">
      {icon}
    </div>
    <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">{label}</p>
    <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
  </div>
);

export const EnhancedJobCard: React.FC<EnhancedJobCardProps> = ({ experience, jobType, positions, staffNeeded, className }) => {
  return (
    <Card className={cn('p-2 sm:p-4 bg-gradient-to-br from-white to-green-50/40 border-green-100 shadow-sm', className)}>
      <div className="grid grid-cols-3 divide-x divide-green-100 text-center">
        <Item label="Experience" value={experience} icon={<Briefcase className="w-4 h-4" />} />
        <Item label="Job Type" value={jobType} icon={<Clock3 className="w-4 h-4" />} />
        <Item label="Positions" value={positions} icon={<Users className="w-4 h-4" />} />
      </div>
      {staffNeeded && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-green-700 font-medium">
          <Layers className="w-3.5 h-3.5" /> Staff Needed: {staffNeeded}
        </div>
      )}
    </Card>
  );
};

export default EnhancedJobCard;
