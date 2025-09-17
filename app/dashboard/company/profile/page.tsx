'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, ArrowLeft } from 'lucide-react';
import { CompanyNotificationsBell } from '@/components/company/notifications-bell';
import type { Id } from '@/convex/_generated/dataModel';
import { CompanyTopBar } from '@/components/company/topbar';
import { useMe } from '@/components/providers/me-provider';

export default function CompanyProfilePage() {
  const { me, loading, refresh } = useMe();
  const companyId = (me?.profile?._id as Id<'profiles'>) ?? null;
  const company = me?.profile?.companyData as
    | {
        companyName: string;
        contactPerson: string;
        email: string;
        companyAddress: string;
        aboutCompany: string;
        companyPhotoUrl: string;
      }
    | undefined;

  // Display-only profile page; uploads handled during onboarding

  return (
    <div className="">
      <CompanyTopBar
        showBack
        title="Profile"
        right={
          <div className="flex text-black gap-2 items-center">
            <CompanyNotificationsBell companyId={companyId} />
            {/* <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button> */}
          </div>
        }
      />

      {loading ? (
        <p className="text-sm text-gray-600">Loading…</p>
      ) : company ? (
        <Card className="bg-white rounded-xl border border-gray-100">
          <CardHeader className="flex flex-col items-center text-center">
            <Avatar className="w-24 h-24 mb-4">
              <AvatarImage src={company.companyPhotoUrl || "https://cdn-icons-png.flaticon.com/512/282/282182.png"} />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <CardTitle className="text-2xl">{company.companyName}</CardTitle>
            {company.companyAddress && (
              <p className="text-sm text-gray-500">{company.companyAddress}</p>
            )}
          </CardHeader>
          <CardContent className="text-sm">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold">Contact Person</h4>
                <p className="text-gray-600">{company.contactPerson}</p>
              </div>
              <div>
                <h4 className="font-semibold">Address</h4>
                <p className="text-gray-600">{company.companyAddress}</p>
              </div>
              <div>
                <h4 className="font-semibold">About</h4>
                <p className="text-gray-600 whitespace-pre-wrap">{company.aboutCompany || 'No description provided.'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
  <p className="text-center text-gray-500">Employeer profile not found.</p>
      )}
    </div>
  );
}
