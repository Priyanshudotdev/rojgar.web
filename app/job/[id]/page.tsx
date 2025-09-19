"use client";

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Share2, MapPin, DollarSign, Clock, Users } from 'lucide-react';
import Logo from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = (params?.id as string) as Id<'jobs'>;
  const data = useQuery(api.jobs.getJobPublicById, jobId ? { jobId } : 'skip') as
    | { job: any; company: { name?: string; photoUrl?: string } | null }
    | null
    | undefined;
  const loading = data === undefined;

  const handleApply = () => {
    // TODO: Implement application flow; for now, a placeholder
    alert('Application submitted successfully!');
  };

  return (
    <div className="h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
  <button onClick={() => router.push('/dashboard/job-seeker')}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-semibold">Details</h1>
        <Button variant="outline" size="icon">
          <Share2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 space-y-6">
        {loading ? (
          <p className="text-sm text-gray-600">Loading…</p>
        ) : !data ? (
          <p className="text-sm text-gray-600">Job not found.</p>
        ) : (
          <>
            {/* Company Header */}
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                {data.company?.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.company.photoUrl} alt={data.company?.name || 'Employeer'} className="w-full h-full object-cover" />
                ) : (
                  <Logo size={48} alt="Employeer Logo" className="rounded-lg" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-gray-600 text-sm">{data.company?.name ?? 'Employeer'}</p>
                <h1 className="text-2xl font-bold">{data.job.title}</h1>
                <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {data.job.location.city}
                    {data.job.location.locality ? `, ${data.job.location.locality}` : ''}
                  </div>
                </div>
                <div className="flex items-center mt-1 space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    ₹{data.job.salary.min} - ₹{data.job.salary.max}
                  </div>
                  <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${data.job.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {data.job.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Job Info Cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 text-center">
                <Clock className="w-5 h-5 mx-auto mb-1 text-gray-600" />
                <p className="text-xs text-gray-600">{data.job.experienceRequired}</p>
                <p className="text-sm font-medium">{data.job.jobType}</p>
              </Card>
              <Card className="p-3 text-center">
                <Users className="w-5 h-5 mx-auto mb-1 text-gray-600" />
                <p className="text-xs text-gray-600">{data.job.genderRequirement}</p>
              </Card>
              <Card className="p-3 text-center">
                <span className="text-xl">👤</span>
                <p className="text-xs text-gray-600">{data.job.staffNeeded} openings</p>
              </Card>
            </div>

            {/* Job Description */}
            <div>
              <h3 className="font-semibold mb-3">Job Description</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{data.job.description}</p>
            </div>
          </>
        )}
      </div>

      {/* Bottom Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleApply}
            disabled={!!data && data.job.status === 'Closed'}
            className={`flex-1 text-white ${data && data.job.status === 'Closed' ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
            title={data && data.job.status === 'Closed' ? 'This job is closed' : undefined}
          >
            {data && data.job.status === 'Closed' ? 'Job Closed' : 'Apply Now'}
          </Button>
        </div>
      </div>
    </div>
  );
}