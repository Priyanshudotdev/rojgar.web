"use client";

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Share2, MapPin, DollarSign, Clock, Users, Bookmark } from 'lucide-react';

// ... (rest of the file)

      <div className="flex items-center justify-between p-4 border-b">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-6 h-6 text-black" />
        </button>
        <h1 className="font-semibold text-black">Details</h1>
        <Button variant="ghost" size="icon">
          <Bookmark className="w-6 h-6 text-black" />
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

            {/* Job Info */}
            <div className="flex justify-between items-center text-center py-4">
              <div>
                <p className="text-sm text-gray-500">Experience</p>
                <p className="font-semibold text-black">{data.job.experienceRequired}</p>
              </div>
              <div className="border-l h-10"></div>
              <div>
                <p className="text-sm text-gray-500">Job Type</p>
                <p className="font-semibold text-black">{data.job.jobType}</p>
              </div>
              <div className="border-l h-10"></div>
              <div>
                <p className="text-sm text-gray-500">Level</p>
                <p className="font-semibold text-black">Entry level</p>
              </div>
            </div>

            {/* Managed By */}
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">This job post is managed by</p>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
                  {data.company?.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.company.photoUrl} alt={data.company?.name || 'Manager'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-300"></div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-black">{data.company?.name || 'Hiring Manager'}</p>
                  <p className="text-xs text-gray-500">Online 2 days ago</p>
                </div>
              </div>
            </div>

            {/* Must Have Skills */}
            <div>
              <h3 className="font-semibold mb-3 text-black">Must Have Skills</h3>
              <div className="flex flex-wrap gap-2">
                {data.job.educationRequirements.map((skill: string) => (
                  <div key={skill} className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md">
                    {skill}
                  </div>
                ))}
              </div>
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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex items-center justify-between">
        <Button variant="ghost" size="icon">
          <Share2 className="w-6 h-6 text-black" />
        </Button>
        <Button
          onClick={handleApply}
          disabled={!!data && data.job.status === 'Closed'}
          className={`w-full max-w-xs text-white rounded-full py-3 ${data && data.job.status === 'Closed' ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
          title={data && data.job.status === 'Closed' ? 'This job is closed' : undefined}
        >
          {data && data.job.status === 'Closed' ? 'Job Closed' : 'Apply Now'}
        </Button>
      </div>
    </div>
  );
}