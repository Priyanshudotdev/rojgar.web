'use client';

import { Button } from '@/components/ui/button';
import Logo from '@/components/ui/logo';
import TopNav from '@/components/ui/top-nav';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function PhoneAuth() {
  const router = useRouter();
  // This legacy route now acts as a simple choice screen while new flows live under /auth/login and /auth/register

  return (
    <div className="h-screen flex flex-col text-white">
  <TopNav title="Login or Register" />
      <div className="px-6 pt-6 flex items-center mb-6">
        <Logo />
        <h1 className="text-2xl font-bold ml-2">Rojgar</h1>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full px-4 space-y-6">
        <h2 className="text-xl font-semibold text-center">Choose an option</h2>
        <Button onClick={() => router.push('/auth/login')} className="w-full bg-white text-green-600 hover:bg-gray-100 font-semibold py-3">
          Login
        </Button>
        <Button onClick={() => router.push('/auth/register')} variant="outline" className="w-full bg-transparent border border-white/40 text-white hover:bg-white/10 font-semibold py-3">
          Register
        </Button>
      </div>

      <div className="text-center px-6 pb-6">
        <p className="text-sm opacity-75">
          By clicking 'Continue', you agree to the Rojgar's{' '}
          <span className="underline">Terms of Service</span> and{' '}
          <span className="underline">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}