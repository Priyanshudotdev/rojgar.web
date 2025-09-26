"use client";
import React, { useEffect, useState } from 'react';
import CompanyBottomNav from '@/components/ui/company-bottom-nav';
import DashboardLoading from '@/components/ui/dashboard-loading';
import DashboardError from '@/components/ui/dashboard-error';
import { useMe } from '@/components/providers/me-provider';

export default function CompanyDashboardLayout({ children }: { children: React.ReactNode }) {
  const { me, loading, error, errorCode, recovery, refresh } = useMe();
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
        if (res.status === 204) { setPathCheck('none'); return; }
        if (!res.ok) { setPathCheck('error'); return; }
        const data = await res.json();
        const route = data?.route as string | undefined;
        if (!route) { setPathCheck('none'); return; }
        setPathCheck(route);
        if (route && route !== '/dashboard/company') window.location.href = route; // navigate if server suggests different route
      } catch {
        if (!cancelled) setPathCheck('error');
      } finally {
        clearTimeout(t);
        if (!cancelled) setChecking(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [me]);

  const showLoading = (loading || checking) && !error && !timedOut;
  if (showLoading) return <DashboardLoading variant="company" onRetry={() => refresh()} onTimeout={() => setTimedOut(true)} />;
  if (timedOut) return <DashboardError variant="company" message="Session validation timed out." code="TIMEOUT" onRetry={() => { setTimedOut(false); refresh(); }} recovery={recovery} />;
  if (error) {
    if (errorCode === 'NETWORK_ERROR' && loading) {
      return <DashboardLoading variant="company" onRetry={() => refresh()} onTimeout={() => setTimedOut(true)} />;
    }
    return <DashboardError variant="company" message={error} code={errorCode} recovery={recovery} onRetry={() => refresh()} />;
  }
  if (!me || !me.user) return <DashboardError variant="company" message="No active session. Please login." code="NO_SESSION" recovery={[{ type: 'relogin', label: 'Login' }, { type: 'retry', label: 'Retry' }]} onRetry={() => refresh()} />;
  if (pathCheck === 'error') return <DashboardError variant="company" message="Failed to validate route access." code="ROUTE_CHECK_FAILED" onRetry={() => refresh()} recovery={recovery} />;

  return (
    <div className="h-screen bg-gray-100 flex justify-center items-center">
      <div className="w-full max-w-md h-full bg-white relative overflow-hidden">
        <main className="h-full overflow-y-auto pb-20">{children}</main>
        <CompanyBottomNav />
      </div>
    </div>
  );
}