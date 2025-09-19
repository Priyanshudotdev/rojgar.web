"use client";

import { Button } from '@/components/ui/button';
import Logo from '@/components/ui/logo';
import TopNav from '@/components/ui/top-nav';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useSessionAuthedRedirect } from '@/hooks/useSessionAuthedRedirect';

export default function PhoneAuth() {
  const router = useRouter();
  const { authed, redirectTo, checking } = useSessionAuthedRedirect();
  const didFlowRedirect = useRef(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (checking) return;
    if (authed && redirectTo) {
      router.replace(redirectTo);
    }
  }, [authed, redirectTo, checking, router]);

  // Only check localStorage flow if unauthenticated
  useEffect(() => {
    if (checking || authed || didFlowRedirect.current) return;
    let flow: string | null = null;
    try { flow = localStorage.getItem('authFlow'); } catch {}
    if (flow === 'login') {
      didFlowRedirect.current = true;
      router.replace('/auth/login');
      return;
    }
    if (flow === 'register') {
      didFlowRedirect.current = true;
      router.replace('/auth/register');
      return;
    }
  }, [checking, authed, router]);

  // Clear stale or unknown authFlow values when arriving unauthenticated
  useEffect(() => {
    if (checking || authed) return;
    try {
      const flow = localStorage.getItem('authFlow');
      if (flow && flow !== 'login' && flow !== 'register') {
        localStorage.removeItem('authFlow');
      }
    } catch {}
  }, [checking, authed]);

  if (checking) {
    return (
      <div className="h-screen flex items-center justify-center text-white">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col text-white">
      <TopNav title="Login or Register" />
      <div className="px-6 pt-6 flex items-center mb-6">
        <Logo />
        <h1 className="text-2xl font-bold ml-2">Rojgar</h1>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full px-4 space-y-6">
        <h2 className="text-xl font-semibold text-center">Choose an option</h2>
        <Button onClick={() => {
          localStorage.setItem('authFlow', 'login');
          try { localStorage.removeItem('phoneNumber'); } catch {}
          router.push('/auth/login');
        }} className="w-full bg-white text-green-600 hover:bg-gray-100 font-semibold py-3">
          Login
        </Button>
        <Button onClick={() => {
          localStorage.setItem('authFlow', 'register');
          try { localStorage.removeItem('phoneNumber'); } catch {}
          router.push('/auth/register');
        }} variant="outline" className="w-full bg-transparent border border-white/40 text-white hover:bg-white/10 font-semibold py-3">
          Register
        </Button>
        {/* If no stored flow, users can still tap one of the buttons above; no auto-redirect needed */}
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