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

export default function LoginPhonePage() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const checkUserExists = useAction(api.auth.checkUserExists);
  const requestOtp = useAction(api.auth.requestOtp);

  useEffect(() => {
    const msg = localStorage.getItem('loginNotice');
    if (msg) {
      setError(msg);
      localStorage.removeItem('loginNotice');
    }
  }, []);

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
    try {
      const existsRes = await checkUserExists({ phone });
      if (!existsRes.exists) {
        localStorage.setItem('registerNotice', 'No account found. Please register first.');
        router.replace('/auth/register');
        return;
      }
      localStorage.setItem('authFlow', 'login');
      localStorage.setItem('phoneNumber', phone);
      const otpRes = await requestOtp({ phone, purpose: 'login' }) as any;
      if (otpRes?.debugCode) {
        try { localStorage.setItem('debugOtp', otpRes.debugCode); } catch {}
      }
      router.push('/auth/otp');
    } catch (e: any) {
      setError(e.message || 'Failed to continue');
    } finally {
      setLoading(false);
    }
  };

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
          {loading ? 'Sending OTP…' : 'Continue'}
        </Button>
        <p className="text-sm text-center">New here? <button className="underline" onClick={() => router.push('/auth/register')}>Register</button></p>
      </div>
      <div className="text-center px-6 pb-6 text-sm opacity-75">By continuing you agree to our Terms & Privacy.</div>
    </div>
  );
}
