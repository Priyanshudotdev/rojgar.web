"use client";

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Select } from '@/components/ui/select';

export type JobFiltersValue = {
  jobTypes?: string[];
  salaryMin?: number;
  salaryMax?: number;
  experienceLevels?: string[];
  city?: string;
  locality?: string;
};

export function JobFilters({
  value,
  onChange,
}: {
  value: JobFiltersValue;
  onChange: (v: JobFiltersValue) => void;
}) {
  const [local, setLocal] = useState<JobFiltersValue>(value);

  // Keep local state in sync with parent value to avoid stale UI
  useEffect(() => {
    setLocal(value);
  }, [value]);

  const apply = () => onChange(local);

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Job Types */}
      <div className="flex items-center gap-2">
        {['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'].map((t) => (
          <label key={t} className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={!!local.jobTypes?.includes(t)}
              onChange={(e) => {
                setLocal((prev) => {
                  const cur = new Set(prev.jobTypes ?? []);
                  if (e.target.checked) cur.add(t); else cur.delete(t);
                  return { ...prev, jobTypes: Array.from(cur) };
                });
              }}
            />
            <span>{t}</span>
          </label>
        ))}
      </div>

      {/* Salary range */}
      <div className="flex items-center gap-2 text-sm">
        <span>Min</span>
        <Input
          type="number"
          value={local.salaryMin ?? ''}
          onChange={(e) => {
            const raw = e.target.value;
            setLocal((p) => ({ ...p, salaryMin: raw === '' ? undefined : Number(raw) }));
          }}
          className="w-24"
        />
        <span>Max</span>
        <Input
          type="number"
          value={local.salaryMax ?? ''}
          onChange={(e) => {
            const raw = e.target.value;
            setLocal((p) => ({ ...p, salaryMax: raw === '' ? undefined : Number(raw) }));
          }}
          className="w-24"
        />
      </div>

      {/* Experience */}
      <div className="flex items-center gap-2 text-sm">
        {['Fresher', 'Junior', 'Mid', 'Senior'].map((lvl) => (
          <label key={lvl} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={!!local.experienceLevels?.includes(lvl)}
              onChange={(e) => {
                setLocal((prev) => {
                  const cur = new Set(prev.experienceLevels ?? []);
                  if (e.target.checked) cur.add(lvl); else cur.delete(lvl);
                  return { ...prev, experienceLevels: Array.from(cur) };
                });
              }}
            />
            <span>{lvl}</span>
          </label>
        ))}
      </div>

      {/* Location */}
      <div className="flex items-center gap-2 text-sm">
        <Input
          placeholder="City"
          value={local.city ?? ''}
          onChange={(e) => setLocal((p) => ({ ...p, city: e.target.value }))}
          className="w-28"
        />
        <Input
          placeholder="Locality"
          value={local.locality ?? ''}
          onChange={(e) => setLocal((p) => ({ ...p, locality: e.target.value }))}
          className="w-28"
        />
      </div>

      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={apply}>
        Apply
      </Button>
    </div>
  );
}

export function SortingOptions({
  value,
  onChange,
}: {
  value: 'newest' | 'oldest' | 'salary_desc' | 'salary_asc' | 'title_asc' | 'title_desc' | 'relevance';
  onChange: (v: 'newest' | 'oldest' | 'salary_desc' | 'salary_asc' | 'title_asc' | 'title_desc' | 'relevance') => void;
}) {
  return (
    <select
      className="border rounded px-2 py-1 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value as any)}
      aria-label="Sort jobs"
    >
      <option value="newest">Newest</option>
      <option value="oldest">Oldest</option>
      <option value="salary_desc">Salary: High to Low</option>
      <option value="salary_asc">Salary: Low to High</option>
      <option value="title_asc">Title: A-Z</option>
      <option value="title_desc">Title: Z-A</option>
      <option value="relevance">Relevance</option>
    </select>
  );
}

export function FilterChips({ onSelect, chips }: { onSelect: (chip: string) => void; chips?: string[] }) {
  const defaults = ['Delivery', 'Driver', 'Receptionist', 'Carpenter', 'Security'];
  const list = chips && chips.length > 0 ? chips : defaults;
  return (
    <div className="flex flex-wrap gap-2">
      {list.map((c) => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          className="px-3 py-1 bg-gray-100 rounded-full text-xs"
          aria-label={`Quick filter ${c}`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

export function SavedFilters({
  value,
  onSelect,
}: {
  value: JobFiltersValue;
  onSelect: (v: JobFiltersValue) => void;
}) {
  const [name, setName] = useState('');
  const [saved, setSaved] = useState<Array<{ name: string; v: JobFiltersValue }>>(() => {
    try {
      const raw = localStorage.getItem('saved-job-filters');
      return raw ? (JSON.parse(raw) as Array<{ name: string; v: JobFiltersValue }>) : [];
    } catch {
      return [];
    }
  });

  const persist = (next: Array<{ name: string; v: JobFiltersValue }>) => {
    setSaved(next);
    try { localStorage.setItem('saved-job-filters', JSON.stringify(next)); } catch {}
  };

  const save = () => {
    const n = name.trim() || `Preset ${saved.length + 1}`;
    const next = [...saved.filter((s) => s.name !== n), { name: n, v: value }];
    persist(next);
    setName('');
  };

  const remove = (n: string) => {
    persist(saved.filter((s) => s.name !== n));
  };

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input placeholder="Save current filters as…" value={name} onChange={(e) => setName(e.target.value)} className="w-56" />
        <Button size="sm" variant="outline" onClick={save}>Save</Button>
      </div>
      {saved.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {saved.map((s) => (
            <div key={s.name} className="flex items-center gap-2 border rounded-full px-2 py-1 text-xs">
              <button onClick={() => onSelect(s.v)} aria-label={`Apply ${s.name}`}>{s.name}</button>
              <button onClick={() => remove(s.name)} aria-label={`Remove ${s.name}`}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
