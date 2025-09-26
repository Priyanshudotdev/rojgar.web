'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Diamond, User, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Logo from '@/components/ui/logo';
import TopNav from '@/components/ui/top-nav';
import { getRoleLabel } from '@/lib/roleLabels';

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<string>('');
  const router = useRouter();

  const handleContinue = () => {
    if (selectedRole) {
      localStorage.setItem('userRole', selectedRole);
      try { localStorage.setItem('authFlow', 'register'); } catch {}
      router.push('/auth/register');
    }
  };

  return (
    <div className="h-screen flex flex-col text-white">
      <TopNav title="Choose role" />
      <div className="px-2 pt-8 flex items-center gap-x-2 mb-8">
        <Logo />
        <h1 className="text-2xl font-bold">Rojgar</h1>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Continue as</h2>
          <p className="text-lg opacity-90">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <Card
            className={`p-3 flex items-center justify-center cursor-pointer transition-all ${
              selectedRole === 'job-seeker' 
                ? 'bg-white/90 text-primary border' 
                : 'bg-white/10 text-white border border-white/20'
            }`}
            onClick={() => setSelectedRole('job-seeker')}
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                <User className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">JOB SEEKERS</h3>
                <p className="text-sm opacity-75">Finding a job here never been easier than before</p>
              </div>
            </div>
          </Card>

          <Card
            className={`p-3 flex items-center justify-center cursor-pointer transition-all ${
              selectedRole === 'company' 
                ? 'bg-white/90 text-primary border' 
                : 'bg-white/10 text-white border border-white/20'
            }`}
            onClick={() => setSelectedRole('company')}
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <Building className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{getRoleLabel('company').toUpperCase()}</h3>
                <p className="text-sm opacity-75">Recruit great candidates faster here</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="space-y-4 px-2 pb-8">
        <p className="text-sm opacity-75 text-center">
          By clicking &apos;Continue&apos;, you agree to the Rojgar&apos;s{' '}
        </p>
        
        <Button
          onClick={handleContinue}
          disabled={!selectedRole}
          className="w-full bg-white text-green-600 hover:bg-gray-100 font-semibold py-3"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}