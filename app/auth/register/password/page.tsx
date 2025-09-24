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
  const createSession = useMutation(api.auth.createSession);

  const userId = typeof window !== "undefined" ? (localStorage.getItem("verifiedUserId") as Id<"users"> | null) : null;

  useEffect(() => {
    if (!userId) {
      router.replace('/auth/register');
    }
  }, [userId, router]);

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (submitting) return;

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (!userId) {
      router.replace('/auth/register');
      return;
    }
    try {
      setSubmitting(true);
      await setPasswordMutation({ userId, password });
      const session = await createSession({ userId });
      const setRes = await fetch('/api/session/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: session.token, expiresAt: session.expiresAt }),
      });
      if (!setRes.ok) {
        const text = await setRes.text().catch(() => setRes.statusText || 'Failed to set session');
        throw new Error(`Failed to set session: ${text}`);
      }
      try { window.dispatchEvent(new CustomEvent('session-updated')); } catch {}
      await new Promise((r) => setTimeout(r, 100));

      const role = localStorage.getItem('userRole') as 'company' | 'job-seeker' | null;

      if (role) {
        localStorage.removeItem('authFlow');
        localStorage.removeItem('passwordMode');
        localStorage.removeItem('phoneNumber');
        localStorage.removeItem('verifiedUserId');
        localStorage.removeItem('newUser');
        localStorage.removeItem('userRole');
  router.replace(`/onboarding/${role}`);
      } else {
        setError('Could not determine your role. Please try again.');
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
        <h2 className="text-xl font-semibold mb-4">Set your password</h2>
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
        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
        <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-white text-green-600 hover:bg-gray-100 font-semibold py-3 flex items-center justify-center gap-2 disabled:opacity-70">
          {submitting && <Loader2 className="animate-spin w-5 h-5" />}
          {submitting ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
