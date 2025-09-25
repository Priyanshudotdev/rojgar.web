"use client";

import React, { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Filter, RefreshCw } from 'lucide-react';
import type { ApplicationStatus } from '@/hooks/useApplications';
import { Badge } from '@/components/ui/badge';

export interface ApplicationFilterState {
  status: ApplicationStatus | 'all';
  search: string;
  dateRange: '7d' | '30d' | '90d' | 'all';
  sort: 'newest' | 'oldest' | 'status';
}

interface ApplicationFiltersProps {
  value: ApplicationFilterState;
  onChange: (v: ApplicationFilterState) => void;
  statusCounts: Record<ApplicationStatus, number>;
}

const STATUSES: { key: ApplicationStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'New', label: 'New' },
  { key: 'In Review', label: 'In Review' },
  { key: 'Interviewing', label: 'Interviewing' },
  { key: 'Hired', label: 'Hired' },
  { key: 'Rejected', label: 'Rejected' },
];

const DATES: { key: ApplicationFilterState['dateRange']; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: '7d', label: 'Last 7d' },
  { key: '30d', label: 'Last 30d' },
  { key: '90d', label: 'Last 3 mo' },
];

export function ApplicationFilters({ value, onChange, statusCounts }: ApplicationFiltersProps) {
  const applyPatch = (patch: Partial<ApplicationFilterState>) => onChange({ ...value, ...patch });
  const clearAll = () => onChange({ status: 'all', search: '', dateRange: 'all', sort: 'newest' });

  // Active filter chips (excluding defaults)
  const chips: { label: string; onRemove: () => void }[] = [];
  if (value.status !== 'all') chips.push({ label: value.status, onRemove: () => applyPatch({ status: 'all' }) });
  if (value.dateRange !== 'all') chips.push({ label: DATES.find(d => d.key === value.dateRange)?.label || '', onRemove: () => applyPatch({ dateRange: 'all' }) });
  if (value.search.trim()) chips.push({ label: `Search: ${value.search}`, onRemove: () => applyPatch({ search: '' }) });
  if (value.sort !== 'newest') chips.push({ label: `Sort: ${value.sort}`, onRemove: () => applyPatch({ sort: 'newest' }) });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex-1">
          <label className="text-xs font-medium text-gray-600 mb-1 block">Search</label>
          <div className="relative">
            <Input
              placeholder="Search by job title or company"
              value={value.search}
              onChange={(e) => applyPatch({ search: e.target.value })}
              aria-label="Search applications"
              className="pr-10"
            />
            {value.search && (
              <button
                type="button"
                onClick={() => applyPatch({ search: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearAll} aria-label="Clear all filters"><RefreshCw className="h-4 w-4 mr-1" /> Reset</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map(s => {
          const active = value.status === s.key;
          const count = s.key === 'all' ? Object.values(statusCounts).reduce((a,b)=>a+b,0) : statusCounts[s.key as ApplicationStatus] || 0;
          return (
            <button
              key={s.key}
              onClick={() => applyPatch({ status: s.key })}
              className={`px-3 py-1 rounded-full text-xs border transition ${active ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
              aria-pressed={active}
            >
              {s.label} <span className="ml-1 text-[10px] opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {DATES.map(d => {
          const active = value.dateRange === d.key;
          return (
            <button
              key={d.key}
              onClick={() => applyPatch({ dateRange: d.key })}
              className={`px-2.5 py-1 rounded-md text-[11px] border ${active ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
              aria-pressed={active}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 items-center text-[11px]">
        <span className="text-gray-500">Sort:</span>
        {(['newest','oldest','status'] as const).map(opt => {
          const active = value.sort === opt;
          return (
            <button
              key={opt}
              onClick={() => applyPatch({ sort: opt })}
              className={`px-2 py-0.5 rounded border ${active ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
              aria-pressed={active}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {chips.map(c => (
            <Badge key={c.label} className="flex items-center gap-1 bg-gray-100 text-gray-700" variant="secondary">
              <span>{c.label}</span>
              <button onClick={c.onRemove} className="hover:text-red-600" aria-label={`Remove filter ${c.label}`}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
