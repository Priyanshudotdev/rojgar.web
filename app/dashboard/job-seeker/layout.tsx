"use client";
import React, { useEffect, useState } from 'react';
import JobSeekerBottomNav from '@/components/ui/job-seeker-bottom-nav';
import DashboardLoading from '@/components/ui/dashboard-loading';
import DashboardError from '@/components/ui/dashboard-error';
import { useMe } from '@/components/providers/me-provider';

// Hybrid client layout: we optimistically render loading while validating session.
export default function JobSeekerDashboardLayout({ children }: { children: React.ReactNode }) {
  const { me, loading, error, errorCode, refresh, recovery } = useMe();
  const [pathCheck, setPathCheck] = useState<string | null>('pending');
  const [checking, setChecking] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!me || !me.user) return;
      setChecking(true);
      const t = setTimeout(() => { if (!cancelled) setTimedOut(true); }, 15000);
      try {
        const res = await fetch('/api/onboarding/redirect', { cache: 'no-store' });
        if (cancelled) return;
        if (res.status === 204) { setPathCheck(null); return; }
        if (!res.ok) { setPathCheck(null); return; }
        const data = await res.json();
        const route = data?.route as string | undefined;
        setPathCheck(route || null);
        if (route === '/onboarding/job-seeker') window.location.href = route;
        else if (route && route !== '/dashboard/job-seeker') window.location.href = route; // role mismatch to server provided target
      } catch {
        if (!cancelled) setPathCheck(null);
      } finally {
        clearTimeout(t);
        if (!cancelled) setChecking(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [me]);

  const showLoading = (loading || checking) && !error && !timedOut;
  if (showLoading) return <DashboardLoading variant="job-seeker" onRetry={() => refresh()} onTimeout={() => setTimedOut(true)} />;
  if (timedOut) return <DashboardError message="Session validation timed out." code="TIMEOUT" onRetry={() => { setTimedOut(false); refresh(); }} recovery={recovery} />;
  if (error) return <DashboardError message={error} code={errorCode} recovery={recovery} onRetry={() => refresh()} />;
  if (!me || !me.user) return <DashboardError message="No active session. Please login." code="NO_SESSION" recovery={[{ type: 'relogin', label: 'Login' }, { type: 'retry', label: 'Retry' }]} onRetry={() => refresh()} />;
  if (pathCheck === null) return <DashboardError message="Failed to validate route access." code="ROUTE_CHECK_FAILED" onRetry={() => refresh()} recovery={recovery} />;

  return (
    <div className="relative min-h-screen pb-16">
      {children}
      <JobSeekerBottomNav />
    </div>
  );
}
