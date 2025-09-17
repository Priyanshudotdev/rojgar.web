"use client";

import { useEffect, useState, ChangeEvent, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useMe } from '@/components/providers/me-provider';
import { invalidateCachedQuery, invalidateKeys } from '@/hooks/useInvalidateCachedQuery';

const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'] as const;
const genders = ['Male', 'Female', 'Other', 'Prefer not to say'] as const;

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = (params?.id as string) as Id<'jobs'>;
  const { me } = useMe();
  const companyId = me?.profile?._id as Id<'profiles'> | undefined;

  const data = useQuery(api.jobs.getJobById, jobId ? { jobId } : 'skip') as any;
  const updateJob = useMutation(api.jobs.updateJob);

  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    location: { city: '', locality: '' },
    salary: { min: '', max: '' } as { min: number | ''; max: number | '' },
    jobType: '' as '' | typeof jobTypes[number],
    staffNeeded: '' as number | '',
    genderRequirement: '' as '' | typeof genders[number],
    educationRequirements: [] as string[],
    experienceRequired: '',
    description: '',
    status: 'Active' as 'Active' | 'Closed',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!data) return;
    setForm({
      title: data.title || '',
      location: { city: data.location?.city || '', locality: data.location?.locality || '' },
      salary: { min: data.salary?.min ?? '', max: data.salary?.max ?? '' },
      jobType: data.jobType || '',
      staffNeeded: data.staffNeeded ?? '',
      genderRequirement: data.genderRequirement || '',
      educationRequirements: data.educationRequirements || [],
      experienceRequired: data.experienceRequired || '',
      description: data.description || '',
      status: data.status || 'Active',
    });
  }, [data]);

  const change = (key: string) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (key === 'city' || key === 'locality') {
      setForm((p) => ({ ...p, location: { ...p.location, [key]: val } }));
    } else if (key === 'min' || key === 'max') {
      setForm((p) => ({ ...p, salary: { ...p.salary, [key]: val === '' ? '' : Number(val) } }));
    } else {
      setForm((p) => ({ ...p, [key]: val } as any));
    }
  };

  const toggle = (listKey: 'educationRequirements', v: string) => {
    setForm((p) => ({
      ...p,
      [listKey]: (p as any)[listKey].includes(v)
        ? (p as any)[listKey].filter((x: string) => x !== v)
        : [...(p as any)[listKey], v],
    }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title) e.title = 'Required';
    if (!form.location.city) e.city = 'Required';
    if (!form.jobType) e.jobType = 'Required';
    if (!form.staffNeeded) e.staffNeeded = 'Required';
    if (!form.genderRequirement) e.genderRequirement = 'Required';
    if (form.educationRequirements.length === 0) e.educationRequirements = 'Select at least one';
    if (!form.experienceRequired) e.experienceRequired = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate() || !companyId) return;
    try {
      setSubmitting(true);
      await updateJob({
        jobId,
        companyId,
        title: form.title,
        location: { city: form.location.city, locality: form.location.locality || undefined },
        salary: { min: Number(form.salary.min) || 0, max: Number(form.salary.max) || 0 },
        jobType: form.jobType as any,
        staffNeeded: Number(form.staffNeeded) || 1,
        genderRequirement: form.genderRequirement as any,
        educationRequirements: form.educationRequirements,
        experienceRequired: form.experienceRequired,
        description: form.description,
        status: form.status,
      });

      // Invalidate cached lists
      invalidateKeys(['jobsByCompany', 'company-jobs']);
      invalidateCachedQuery('convex-query', { jobId }); // fallback generic key

      router.push(`/dashboard/company/jobs/${jobId}`);
    } finally {
      setSubmitting(false);
    }
  };

  const ready = !!data;

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/dashboard/company')} className="cursor-pointer group">
            <ArrowLeft className="w-6 h-6 group-hover:text-black" />
          </button>
          <h1 className="font-semibold text-black">Edit Job</h1>
          <div />
        </div>
      </div>

      {!ready ? (
        <div className="p-6 text-sm text-gray-600">Loading…</div>
      ) : (
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Job Title</label>
            <Input value={form.title} onChange={change('title')} className="bg-white text-black" />
            {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <Input value={form.location.city} onChange={change('city')} className="bg-white text-black" />
              {errors.city && <p className="text-red-500 text-sm">{errors.city}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Locality</label>
              <Input value={form.location.locality} onChange={change('locality')} className="bg-white text-black" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Expected Income (₹)</label>
            <div className="flex gap-4">
              <Input placeholder="Min" inputMode="numeric" value={form.salary.min === '' ? '' : String(form.salary.min)} onChange={change('min')} className="bg-white text-black" />
              <Input placeholder="Max" inputMode="numeric" value={form.salary.max === '' ? '' : String(form.salary.max)} onChange={change('max')} className="bg-white text-black" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Job Type</label>
            <div className="flex flex-wrap gap-2">
              {jobTypes.map((jt) => (
                <button key={jt} onClick={() => setForm((p) => ({ ...p, jobType: jt }))} className={`px-3 py-2 rounded-full border text-sm ${form.jobType === jt ? 'bg-green-100 border-green-500 text-green-700' : 'border-gray-300 text-neutral-700'}`}>
                  {jt}
                </button>
              ))}
            </div>
            {errors.jobType && <p className="text-red-500 text-sm">{errors.jobType}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Number of Staff Needed</label>
            <Input type="number" min="1" value={form.staffNeeded === '' ? '' : String(form.staffNeeded)} onChange={(e) => setForm((p) => ({ ...p, staffNeeded: e.target.value === '' ? '' : Math.max(1, Number(e.target.value)) }))} className="bg-white text-black" />
            {errors.staffNeeded && <p className="text-red-500 text-sm">{errors.staffNeeded}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Gender Requirement</label>
            <div className="flex flex-wrap gap-2">
              {genders.map((g) => (
                <button key={g} onClick={() => setForm((p) => ({ ...p, genderRequirement: g }))} className={`px-3 py-2 rounded-full border text-sm ${form.genderRequirement === g ? 'bg-green-100 border-green-500 text-green-700' : 'border-gray-300 text-neutral-700'}`}>
                  {g}
                </button>
              ))}
            </div>
            {errors.genderRequirement && <p className="text-red-500 text-sm">{errors.genderRequirement}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Education Requirements</label>
            <div className="flex flex-wrap gap-2">
              {['Below 10th', '10th', '12th', 'ITI/Diploma', 'Graduate', 'Post Graduate'].map((e) => (
                <button key={e} onClick={() => toggle('educationRequirements', e)} className={`px-3 py-2 rounded-full border text-sm ${form.educationRequirements.includes(e) ? 'bg-green-100 border-green-500 text-green-700' : 'border-gray-300 text-neutral-700'}`}>
                  {e}
                </button>
              ))}
            </div>
            {errors.educationRequirements && <p className="text-red-500 text-sm">{errors.educationRequirements}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Experience</label>
            <div className="flex gap-2">
              {['Any', 'Freshers', 'Experienced'].map((x) => (
                <button key={x} onClick={() => setForm((p) => ({ ...p, experienceRequired: x }))} className={`px-3 py-2 rounded-full border text-sm ${form.experienceRequired === x ? 'bg-green-100 border-green-500 text-green-700' : 'border-gray-300 text-neutral-700'}`}>
                  {x}
                </button>
              ))}
            </div>
            {errors.experienceRequired && <p className="text-red-500 text-sm">{errors.experienceRequired}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Job Description</label>
            <Textarea value={form.description} onChange={change('description')} className="bg-white text-black" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <div className="flex gap-2">
              {(['Active', 'Closed'] as const).map((s) => (
                <button key={s} onClick={() => setForm((p) => ({ ...p, status: s }))} className={`px-3 py-2 rounded-full border text-sm ${form.status === s ? 'bg-green-100 border-green-500 text-green-700' : 'border-gray-300 text-neutral-700'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <Button onClick={submit} disabled={submitting || !companyId} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 disabled:opacity-60">
              <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
