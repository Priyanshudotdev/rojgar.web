"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useMe } from '@/components/providers/me-provider';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from 'lucide-react';
import { CompanyTopBar } from '@/components/company/topbar';

type ApplicantRow = {
  _id: Id<'applications'>;
  jobId: Id<'jobs'>;
  jobTitle: string;
  status: string;
  appliedAt: number;
  profile?: {
    name?: string;
    jobSeekerData?: { jobRole?: string };
  } | null;
};

export default function CompanyApplicantsPage() {
  const router = useRouter();
  const { me } = useMe();
  const companyId = me?.profile?._id as Id<'profiles'> | undefined;
  const data = useQuery(api.jobs.getApplicantsByCompany, companyId ? { companyId } : 'skip') as ApplicantRow[] | undefined;
  const applicants = data ?? [];

  return (
    <div className="bg-white min-h-screen">
      <CompanyTopBar showBack title="Applicants" />

      <div className="p-4">
        {applicants.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-gray-600">No applicants!!</p>
          </Card>
        ) : (
          <Card className="bg-white rounded-xl border border-gray-100">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Applied On</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applicants.map((app) => (
                    <TableRow key={app._id}>
                      <TableCell className="font-medium">{app.profile?.name ?? 'Unknown'}</TableCell>
                      <TableCell>{app.jobTitle}</TableCell>
                      <TableCell>{new Date(app.appliedAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-800">{app.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
