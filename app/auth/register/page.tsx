"use client";

import { useRouter } from "next/navigation";
import Logo from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Building, User, Loader2 } from "lucide-react";
import TopNav from "@/components/ui/top-nav";
import { useEffect, useState } from "react";
import { Input } from '@/components/ui/input';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function RegisterLanding() {
  const router = useRouter();
  const [role, setRole] = useState<"job-seeker" | "company" | "">("");
  const [notice, setNotice] = useState<string>("");
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [step, setStep] = useState<'role' | 'phone'>('role');
  const [loading, setLoading] = useState(false);
  const checkUserExists = useAction(api.auth.checkUserExists);
  const requestOtp = useAction(api.auth.requestOtp);

  useEffect(() => {
    try {
      const msg = localStorage.getItem('registerNotice');
      if (msg) {
        setNotice(msg);
        localStorage.removeItem('registerNotice');
      }
    } catch {}
  }, []);

  const continueRegister = () => {
    if (!role) return;
    localStorage.setItem('userRole', role);
    setStep('phone');
  };

  const validatePhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    setPhone(cleaned);
    if (!cleaned) return setPhoneError('');
    if (cleaned.length !== 10) return setPhoneError('Phone must be 10 digits');
    if (!/^[6-9]\d{9}$/.test(cleaned)) return setPhoneError('Invalid Indian mobile number');
    setPhoneError('');
  };

  const submitPhone = async () => {
    if (!phone || phoneError) return;
    setLoading(true);
    try {
      const exists = await checkUserExists({ phone });
      if (exists.exists) {
        localStorage.setItem('loginNotice', 'Account already exists. Please login.');
        router.replace('/auth/login');
        return;
      }
      // proceed register
      localStorage.setItem('authFlow', 'register');
      localStorage.setItem('phoneNumber', phone);
      const otpRes = await requestOtp({ phone, purpose: 'register' }) as any;
      if (otpRes?.debugCode) {
        try { localStorage.setItem('debugOtp', otpRes.debugCode); } catch {}
      }
      router.push('/auth/otp');
    } catch (e: any) {
      setPhoneError(e.message || 'Failed to continue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col text-white">
      <TopNav title="Register" />
      <div className="px-6 pt-6 flex items-center gap-x-2 mb-8">
        <Logo />
        <h1 className="text-2xl font-bold">Rojgar</h1>
      </div>
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full px-6">
        {notice && (
          <div className="mb-4 text-sm text-yellow-100 bg-yellow-700/50 border border-yellow-400 rounded p-3">
            {notice}
          </div>
        )}
        {step === 'role' && (
          <>
            <h2 className="text-xl font-semibold mb-2">Create your account</h2>
            <p className="text-white/80 mb-6">Choose your role to continue.</p>
            <div className="space-y-4 mb-6">
              <Card
                className={`p-3 flex items-center justify-center cursor-pointer transition-all ${
                  role === 'job-seeker'
                    ? 'bg-white/90 text-primary border'
                    : 'bg-white/10 text-white border border-white/20'
                }`}
                onClick={() => setRole('job-seeker')}
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                    <User className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">JOB SEEKER</h3>
                    <p className="text-sm opacity-75">Find your next opportunity</p>
                  </div>
                </div>
              </Card>
              <Card
                className={`p-3 flex items-center justify-center cursor-pointer transition-all ${
                  role === 'company'
                    ? 'bg-white/90 text-primary border'
                    : 'bg-white/10 text-white border border-white/20'
                }`}
                onClick={() => setRole('company')}
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <Building className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">COMPANY</h3>
                    <p className="text-sm opacity-75">Hire great candidates faster</p>
                  </div>
                </div>
              </Card>
            </div>
            <Button onClick={continueRegister} disabled={!role} className="w-full bg-white text-green-600 hover:bg-gray-100 font-semibold py-3">Continue</Button>
          </>
        )}
        {step === 'phone' && (
          <>
            <h2 className="text-xl font-semibold mb-2">Enter your mobile number</h2>
            <p className="text-white/80 mb-6">We'll send an OTP to verify.</p>
            <div className="mb-6 flex items-center space-x-2">
              <div className="bg-white/10 border border-white/20 rounded-lg px-3 py-3">
                <span className="text-white font-medium">+91</span>
              </div>
              <Input
                type="tel"
                value={phone}
                placeholder="Mobile Number"
                maxLength={10}
                onChange={(e) => validatePhone(e.target.value)}
                className="flex-1 bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:border-white"
              />
            </div>
            {phoneError && <p className="text-red-400 text-sm mb-4">{phoneError}</p>}
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => setStep('role')} className="bg-white/10 text-white border border-white/20 hover:bg-white/20 flex-1">Back</Button>
              <Button disabled={!phone || !!phoneError || loading} onClick={submitPhone} className="flex-1 bg-white text-green-600 hover:bg-gray-100 font-semibold py-3 flex items-center justify-center gap-2 disabled:opacity-70">
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                {loading ? 'Sending OTP…' : 'Continue'}
              </Button>
            </div>
          </>
        )}
      </div>
      <div className="text-center px-6 pb-8">
        <p className="text-sm opacity-75">Already have an account? <button className="underline" onClick={() => router.push('/auth/login')}>Login</button></p>
      </div>
    </div>
  );
}
