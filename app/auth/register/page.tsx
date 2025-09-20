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
import { useSessionAuthedRedirect } from '@/hooks/useSessionAuthedRedirect';

export default function RegisterLanding() {
  const router = useRouter();
  const { authed, redirectTo, checking } = useSessionAuthedRedirect();
  const [role, setRole] = useState<"job-seeker" | "company" | "">("");
  const [notice, setNotice] = useState<string>("");

  useEffect(() => {
    try {
      const msg = localStorage.getItem('registerNotice');
      if (msg) {
        setNotice(msg);
        localStorage.removeItem('registerNotice');
      }
    } catch {}
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (checking) return;
    if (authed && redirectTo) {
      router.replace(redirectTo);
    }
  }, [authed, redirectTo, checking, router]);

  const continueRegister = () => {
    if (!role) return;
    localStorage.setItem('userRole', role);
    router.push(`/onboarding/${role}`);
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
      </div>
      <div className="text-center px-6 pb-8">
        <p className="text-sm opacity-75">Already have an account? <button className="underline" onClick={() => router.push('/auth/login')}>Login</button></p>
      </div>
    </div>
  );
}
