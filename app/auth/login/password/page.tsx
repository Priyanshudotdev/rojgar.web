"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import TopNav from '@/components/ui/top-nav';
import { getDashboardPathByRole } from '@/lib/auth/clientRedirect';
import { normalizePhoneNumber } from '@/lib/utils/phone';
import { AuthError, categorizeError, getUserFriendlyMessage, buildBackoff } from '@/lib/utils/errors';

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = searchParams.get('isNew') === 'true';
  const setPasswordMutation = useAction(api.auth.setPassword);
  const verifyPasswordAction = useAction(api.auth.verifyPassword);
  const createSession = useMutation(api.auth.createSession);

  const userId = typeof window !== "undefined" ? (localStorage.getItem("verifiedUserId") as Id<"users"> | null) : null;
  const mode = typeof window !== 'undefined' ? localStorage.getItem('passwordMode') || 'set' : 'set';
  const phoneNumber = typeof window !== 'undefined' ? localStorage.getItem('phoneNumber') : null;

  // Only enforce redirect for set mode; enter mode intentionally has no userId yet
  useEffect(() => {
    if (mode === 'set' && !userId) {
      router.replace('/auth/login');
    }
  }, [mode, userId, router]);

  // (moved mode & phoneNumber earlier)

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (submitting) return;

    const clearLocalStorage = () => {
      try {
        localStorage.removeItem('authFlow');
        localStorage.removeItem('passwordMode');
        localStorage.removeItem('phoneNumber');
        localStorage.removeItem('verifiedUserId');
        localStorage.removeItem('newUser');
        localStorage.removeItem('userRole');
      } catch {}
    };

    if (mode === 'enter') {
      if (!phoneNumber) {
        setError('Session expired. Please start again.');
        // router.replace('/auth/login');
        return;
      }
      if (!password) {
        setError('Enter password');
        return;
      }
      try {
        setSubmitting(true);
        const normalized = normalizePhoneNumber(phoneNumber);
        let res;
        // Retry on transient network errors, parse server [CODE: ...] messages when present
        let attempt = 0;
        for (;;) {
          try {
            res = await verifyPasswordAction({ phone: normalized, password });
            break;
          } catch (err: any) {
            const msg = String(err?.message || '');
            const match = msg.match(/\[CODE:\s*([A-Z_]+)\]/);
            if (match?.[1]) {
              const code = match[1] as any;
              const authErr = new AuthError(code, msg, { category: undefined });
              setError(getUserFriendlyMessage(authErr));
              setSubmitting(false);
              return;
            }
            const ce = categorizeError(err);
            if (ce.code === 'NETWORK_ERROR' && attempt < 2) {
              await new Promise((r) => setTimeout(r, buildBackoff(attempt++)));
              continue;
            }
            if (ce.code === 'UNKNOWN_ERROR' && /Invalid credentials/i.test(msg)) {
              const authErr = new AuthError('INVALID_PASSWORD', 'Invalid credentials', { category: 'auth' });
              setError(getUserFriendlyMessage(authErr));
              setSubmitting(false);
              return;
            }
            setError(getUserFriendlyMessage(ce));
            setSubmitting(false);
            return;
          }
        }
        const setRes = await fetch('/api/session/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token: res.token, expiresAt: res.expiresAt }),
        });
        if (!setRes.ok) {
          const text = await setRes.text().catch(() => setRes.statusText || 'Failed to set session');
          const err = new AuthError('SESSION_CREATE_FAILED', `Failed to set session: ${text}`, { category: 'session', status: setRes.status });
          throw err;
        }
        try { window.dispatchEvent(new CustomEvent('session-updated')); } catch {}
        await new Promise((r) => setTimeout(r, 100));
        
        if (res.role === 'company') {
          // clearLocalStorage();
          router.replace('/dashboard/company');
        } else if (res.role === 'job-seeker') {
          // clearLocalStorage();
          router.replace('/dashboard/job-seeker');
        } else {
          setError('Could not determine your role. Please login again.');
        }
      } catch (e: any) {
        const ce = categorizeError(e);
        setError(getUserFriendlyMessage(ce));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // mode === 'set'
    // if (!userId) {
    //   router.replace('/auth/login');
    //   return;
    // }
    if (!password || password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    try {
      setSubmitting(true);
      await setPasswordMutation({ userId: userId as Id<'users'>, password });
      const session = await createSession({ userId: userId as Id<'users'> });
      const setRes2 = await fetch('/api/session/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: session.token, expiresAt: session.expiresAt }),
      });
      if (!setRes2.ok) {
        const text = await setRes2.text().catch(() => setRes2.statusText || 'Failed to set session');
        const err = new AuthError('SESSION_CREATE_FAILED', `Failed to set session: ${text}`, { category: 'session', status: setRes2.status });
        setError(getUserFriendlyMessage(err));
        setSubmitting(false);
        return;
      }
      try { window.dispatchEvent(new CustomEvent('session-updated')); } catch {}
      await new Promise((r) => setTimeout(r, 100));

      const role = localStorage.getItem('userRole') as 'company' | 'job-seeker' | null;

      if (isNew && role) {
        // clearLocalStorage();
        router.replace(`/onboarding/${role}`);
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
