'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Edit2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const profileStats = [
  { label: 'Applied', count: 12, type: 'Jobs' },
  { label: 'Reviewed', count: 8, type: 'Jobs' },
  { label: 'Interviewed', count: 3, type: 'Jobs' }
];

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const profile = localStorage.getItem('userProfile');
    if (profile) {
      setUserProfile(JSON.parse(profile));
    }
  }, []);

  return (
    <div className="h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/dashboard/job-seeker')}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-semibold">Details</h1>
          <Settings className="w-6 h-6 text-gray-600" />
        </div>
      </div>

      {/* Profile Section */}
      <div className="p-4">
        <Card className="p-6 text-center">
          <Avatar className="w-24 h-24 mx-auto mb-4">
            <AvatarImage src="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg" />
            <AvatarFallback>SB</AvatarFallback>
          </Avatar>
          
          <div className="flex items-center justify-center space-x-2 mb-2">
            <h2 className="text-xl font-semibold">Selmon Bhai</h2>
            <Edit2 className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-4">India</p>

          {/* Stats */}
          <div className="flex justify-around mb-6">
            {profileStats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-gray-600 text-sm">{stat.label}</p>
                <p className="font-semibold text-lg">{stat.count} <span className="text-sm text-gray-500">{stat.type}</span></p>
              </div>
            ))}
          </div>

          {/* Education Section */}
          <div className="text-left">
            <h3 className="font-semibold mb-3">Education</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-600">Add your education details to get better job recommendations</p>
              <Button variant="link" className="text-green-600 p-0 mt-2">
                + Add Education
              </Button>
            </div>
          </div>
        </Card>
      </div>     
    </div>
  );
}