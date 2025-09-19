"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import TopNav from '@/components/ui/top-nav';

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();
  const setPasswordMutation = useAction(api.auth.setPassword);
  const verifyPasswordAction = useAction(api.auth.verifyPassword);
  const createSession = useMutation(api.auth.createSession);

  const userId = typeof window !== "undefined" ? (localStorage.getItem("verifiedUserId") as Id<"users"> | null) : null;
  const mode = typeof window !== 'undefined' ? localStorage.getItem('passwordMode') || 'set' : 'set';
  const phoneNumber = typeof window !== 'undefined' ? localStorage.getItem('phoneNumber') : null;

  // Only enforce redirect for set mode; enter mode intentionally has no userId yet
  useEffect(() => {
    if (mode === 'set' && !userId) {
      router.replace('/auth/phone');
    }
  }, [mode, userId, router]);

  // (moved mode & phoneNumber earlier)

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (submitting) return;
    if (mode === 'enter') {
      // Existing user entering password directly (userId may not be in localStorage yet)
      if (!phoneNumber) {
        setError('Session expired. Please start again.');
        router.replace('/auth/phone');
        return;
      }
      if (!password) {
        setError('Enter password');
        return;
      }
      try {
        setSubmitting(true);
        const res = await verifyPasswordAction({ phone: phoneNumber, password });
        await fetch('/api/session/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: res.token, expiresAt: res.expiresAt }),
        });
  const roleVal = res.role;
  if (roleVal) localStorage.setItem('userRole', roleVal);
        localStorage.setItem('verifiedUserId', res.userId);
        const isNew = localStorage.getItem('newUser') === '1';
        try { localStorage.removeItem('passwordMode'); if (!isNew) localStorage.removeItem('newUser'); } catch {}
        if (isNew && res.role) {
          router.replace(`/onboarding/${res.role}`);
        } else if (res.role === 'company') {
          router.replace('/dashboard/company');
        } else if (res.role === 'job-seeker') {
          router.replace('/dashboard/job-seeker');
        } else {
          router.replace('/role-selection');
        }
      } catch (e: any) {
        setError(e.message || 'Invalid credentials');
      } finally {
        setSubmitting(false);
      }
      return;
    }
    // mode === set
    if (!userId) return;
    if (!password || password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    try {
      setSubmitting(true);
      await setPasswordMutation({ userId: userId as Id<'users'>, password });
      const session = await createSession({ userId: userId as Id<'users'> });
      await fetch('/api/session/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: session.token, expiresAt: session.expiresAt }),
      });
      const role = localStorage.getItem('userRole');
      const isNew = localStorage.getItem('newUser') === '1';
      try { localStorage.removeItem('passwordMode'); if (!isNew) localStorage.removeItem('newUser'); } catch {}
      if (isNew && role) {
        router.replace(`/onboarding/${role}`);
      } else if (role === 'company') {
        router.replace('/dashboard/company');
      } else if (role === 'job-seeker') {
        router.replace('/dashboard/job-seeker');
      } else {
        router.replace('/role-selection');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to set password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col text-white">
      <TopNav title="Set Password" />
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full px-6 py-8">
        <h2 className="text-xl font-semibold mb-4">{mode === 'enter' ? 'Enter your password' : 'Set your password'}</h2>
        <div className="relative mb-3">
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-white/10 border border-white/20 text-white placeholder:text-white/60 pr-10"
          />
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword(p => !p)}
            className="absolute inset-y-0 right-2 flex items-center text-white/70 hover:text-white"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {mode !== 'enter' && (
          <div className="relative mb-3">
            <Input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="bg-white/10 border border-white/20 text-white placeholder:text-white/60 pr-10"
            />
            <button
              type="button"
              aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              onClick={() => setShowConfirm(p => !p)}
              className="absolute inset-y-0 right-2 flex items-center text-white/70 hover:text-white"
            >
              {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        )}
        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
        <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-white text-green-600 hover:bg-gray-100 font-semibold py-3 flex items-center justify-center gap-2 disabled:opacity-70">
          {submitting && <Loader2 className="animate-spin w-5 h-5" />}
          {submitting ? (mode === 'enter' ? 'Logging in...' : 'Saving...') : (mode === 'enter' ? 'Login' : 'Continue')}
        </Button>
      </div>
    </div>
  );
}
