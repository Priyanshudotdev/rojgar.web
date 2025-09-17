"use client";

import { useEffect, useState, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'] as const;
const genders = ['Male', 'Female', 'Other', 'Prefer not to say'] as const;

export default function NewJobPage() {
  const router = useRouter();
  const createJob = useMutation(api.jobs.createJob);
  const [companyId, setCompanyId] = useState<Id<'profiles'> | null>(null);
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
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/me', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.profile?._id) setCompanyId(data.profile._id as Id<'profiles'>);
      }
    })();
  }, []);

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

  const toggleEdu = (v: string) => {
    setForm((p) => ({
      ...p,
      educationRequirements: p.educationRequirements.includes(v)
        ? p.educationRequirements.filter((x) => x !== v)
        : [...p.educationRequirements, v],
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
      await createJob({
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
        status: 'Active',
      });
      router.push('/dashboard/company');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/dashboard/company')} className="cursor-pointer group">
            <ArrowLeft className="w-6 h-6 group-hover:text-black" />
          </button>
          <h1 className="font-semibold text-black">Post a Job</h1>
          <div />
        </div>
      </div>

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
              <button key={e} onClick={() => toggleEdu(e)} className={`px-3 py-2 rounded-full border text-sm ${form.educationRequirements.includes(e) ? 'bg-green-100 border-green-500 text-green-700' : 'border-gray-300 text-neutral-700'}`}>
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

        <div className="mt-6">
          <Button onClick={submit} disabled={submitting || !companyId} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 disabled:opacity-60">
            <Plus className="w-4 h-4 mr-2" /> Post Job
          </Button>
        </div>
      </div>
    </div>
  );
}
