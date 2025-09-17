'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Diamond, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Logo from '@/components/ui/logo';
import { useAction, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import TopNav from '@/components/ui/top-nav';

export default function OTPVerification() {
  const [otp, setOTP] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const verifyOtp = useAction(api.auth.verifyOtp);
  const requestOtp = useAction(api.auth.requestOtp);
  const createSession = useMutation(api.auth.createSession);
  const router = useRouter();

  useEffect(() => {
    const phone = localStorage.getItem('phoneNumber');
    if (phone) setPhoneNumber(phone);
    try {
      const dbg = localStorage.getItem('debugOtp');
      if (dbg) setDebugOtp(dbg);
    } catch {}
    return () => {
      // Optional: clear debug OTP when leaving the screen if not verified yet
      // localStorage.removeItem('debugOtp');
    };
  }, []);

  // Resend OTP with cooldown
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (!phoneNumber || resending || cooldown > 0) return;
    setError('');
    setResending(true);
    try {
      const flow = (localStorage.getItem('authFlow') || 'login') as 'login' | 'register';
      await requestOtp({ phone: phoneNumber, purpose: flow });
      setCooldown(30);
    } catch (e: any) {
      setError(e.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6 || verifying) return;
    try {
      setError('');
      setVerifying(true);
      const flow = (localStorage.getItem('authFlow') || 'login') as 'login' | 'register';
      const selectedRole = localStorage.getItem('userRole') as 'job-seeker' | 'company' | null;
      const result = await verifyOtp({ phone: phoneNumber, code: otp, role: flow === 'register' ? selectedRole ?? undefined : undefined });
      // Registration path
      if (flow === 'register') {
        if (!result.userId) {
          // Should not happen, but guard anyway
          setError('Could not proceed with registration');
          return;
        }
        localStorage.setItem('verifiedUserId', result.userId as unknown as string);
        if (result.newlyCreated) {
          try { localStorage.setItem('newUser', '1'); } catch {}
        }
        try { localStorage.removeItem('debugOtp'); } catch {}
        router.push('/auth/password');
        return;
      }

      // Login path: if user exists -> create session; else -> go to register
      if (result.exists && result.userId) {
        localStorage.setItem('verifiedUserId', result.userId as unknown as string);
        const session = await createSession({ userId: result.userId as any });
        await fetch('/api/session/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: session.token, expiresAt: session.expiresAt }),
        });
        // Direct role-based redirect to avoid landing on the wrong dashboard
        const role = result.role;
        try { localStorage.removeItem('debugOtp'); } catch {}
        if (role === 'company') {
          router.replace('/dashboard/company');
        } else if (role === 'job-seeker') {
          router.replace('/dashboard/job-seeker');
        } else {
          // Fallback to /profile if role could not be inferred
          router.replace('/profile');
        }
      } else {
        // Not registered: inform and go to register flow
        localStorage.setItem('authFlow', 'register');
        localStorage.setItem('registerNotice', 'Account not found for this mobile number. Please register to continue.');
        setError('Account not found. Redirecting to register…');
        setTimeout(() => router.replace('/auth/register'), 1200);
      }
    } catch (e: any) {
      setError(e.message || 'Invalid or expired OTP');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="h-screen flex flex-col text-white">
      <TopNav title="Verify" />
      <div className="px-6 pt-6 flex items-center gap-x-2 mb-6">
        <Logo />
        <h1 className="text-2xl font-bold">Rojgar</h1>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Enter OTP</h2>
          <p className="text-white/80">
            We've sent a 6-digit code to +91 {phoneNumber}
          </p>
        </div>

        <div className="mb-8 space-y-4">
          <Input
            type="text"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => setOTP(e.target.value.slice(0, 6))}
            className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:border-white text-center text-xl tracking-widest"
            maxLength={6}
          />
          {debugOtp && (
            <div className="bg-amber-500/10 border border-amber-400/40 rounded-md p-3 text-sm text-amber-200">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">Test OTP (dev only)</span>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(debugOtp); }}
                  className="text-xs underline"
                >Copy</button>
              </div>
              <code className="font-mono text-lg tracking-widest">{debugOtp}</code>
              <p className="text-[11px] mt-1 opacity-70">Do not expose in production. This block will be removed later.</p>
            </div>
          )}
        </div>

        <Button
          onClick={handleVerify}
          disabled={otp.length !== 6 || verifying}
          className="w-full bg-white text-green-600 hover:bg-gray-100 font-semibold py-3 mb-6 flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {verifying && <Loader2 className="animate-spin w-5 h-5" />}
          {verifying ? 'Verifying...' : 'Verify OTP'}
        </Button>

        <div className="text-center">
          <p className="text-sm opacity-75 mb-2">Didn't receive the code?</p>
          <Button
            variant="link"
            className="text-white underline p-0 flex items-center gap-2 disabled:opacity-70"
            onClick={handleResend}
            disabled={resending || cooldown > 0 || verifying}
          >
            {resending && <Loader2 className="w-4 h-4 animate-spin" />}
            {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Sending...' : 'Resend OTP'}
          </Button>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}