"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Logo from '@/components/ui/logo';
import TopNav from '@/components/ui/top-nav';
import { useSessionAuthedRedirect } from '@/hooks/useSessionAuthedRedirect';

export default function LoginPhonePage() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { authed, redirectTo, checking } = useSessionAuthedRedirect();
  const router = useRouter();
  const checkUserExists = useAction(api.auth.checkUserExists);
  const requestOtp = useAction(api.auth.requestOtp);

  useEffect(() => {
    // Note: `loginNotice` is set from the Register flow when a phone number already has an account
    // (see: app/auth/register/page.tsx). It informs users to login instead of registering again.
    const msg = localStorage.getItem('loginNotice');
    if (msg) {
      setError(msg);
      localStorage.removeItem('loginNotice');
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (checking) return;
    if (authed && redirectTo) {
      router.replace(redirectTo);
    }
  }, [authed, redirectTo, checking, router]);

  const validate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    setPhone(cleaned);
    if (!cleaned) return setError('');
    if (cleaned.length !== 10) return setError('Phone must be 10 digits');
    if (!/^[6-9]\d{9}$/.test(cleaned)) return setError('Invalid Indian mobile number');
    setError('');
  };

  const submit = async () => {
    if (!phone || error) return;
    setLoading(true);
    setError("");
    try {
      console.log("Phone Number:- ", phone)
      const existsRes = await checkUserExists({ phone });
      if (!existsRes.exists) {
        // New flow: send new users to onboarding instead of direct registration
        try {
          localStorage.removeItem('authFlow');
          // Intentionally clear any partial phone capture here. The onboarding screen does not
          // read `phoneNumber`; users will go through role selection first, then to auth/phone.
          localStorage.removeItem('phoneNumber');
          localStorage.setItem(
            'onboardingNotice',
            "We couldn't find an account for this mobile number. Let's get you set up — please complete onboarding first."
          );
        } catch {}
        router.replace('/onboarding');
        return;
      }
      // Redirect to password entry page
      localStorage.setItem('authFlow', 'login');
      localStorage.setItem('phoneNumber', phone);
      router.push('/auth/login/password');
    } catch (e: any) {
      if (e.message && e.message.includes('network')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(e.message || 'Failed to continue. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="h-screen flex items-center justify-center text-white">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col text-white">
      <TopNav title="Login" />
      <div className="px-6 pt-6 flex items-center mb-6">
        <Logo />
        <h1 className="text-2xl font-bold ml-2">Rojgar</h1>
      </div>
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <h2 className="text-xl font-semibold mb-4">Enter your registered mobile number</h2>
        <div className="mb-6 flex items-center space-x-2">
          <div className="bg-white/10 border border-white/20 rounded-lg px-3 py-3">
            <span className="text-white font-medium">+91</span>
          </div>
          <Input
            type="tel"
            value={phone}
            placeholder="Mobile Number"
            maxLength={10}
            onChange={(e) => validate(e.target.value)}
            className="flex-1 bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:border-white"
          />
        </div>
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <Button disabled={!phone || !!error || loading} onClick={submit} className="w-full bg-white text-green-600 hover:bg-gray-100 font-semibold py-3 mb-4 flex items-center justify-center gap-2 disabled:opacity-70">
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          {loading ? 'Loading…' : 'Continue'}
        </Button>
  <p className="text-sm text-center">New here? <button className="underline" onClick={() => { try { localStorage.setItem('authFlow', 'register'); localStorage.removeItem('phoneNumber'); } catch {} ; router.push('/auth/register'); }}>Register</button></p>
      </div>
      <div className="text-center px-6 pb-6 text-sm opacity-75">By continuing you agree to our Terms & Privacy.</div>
    </div>
  );
}
