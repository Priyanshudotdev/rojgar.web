
"use client";
import { ReactNode, useEffect, useRef, useState } from 'react';
import { useMe } from '@/components/providers/me-provider';
import DashboardLoading from '@/components/ui/dashboard-loading';
import DashboardError from '@/components/ui/dashboard-error';

export default function DashboardShell({ children }: { children: ReactNode }) {
  const { me, loading, redirecting, refresh, error, errorCode, recovery } = useMe();
  const [timedOut, setTimedOut] = useState(false);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    if (!loading) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setTimedOut(true), 15000);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [loading]);

  const showLoading = !error && (loading || redirecting) && !timedOut;
  if (showLoading) {
    return <DashboardLoading onRetry={() => refresh()} onTimeout={() => setTimedOut(true)} />;
  }

  if (timedOut || error) {
    return (
      <DashboardError
        message={error || (timedOut ? 'Request timed out while verifying session.' : null)}
        code={errorCode || (timedOut ? 'TIMEOUT' : undefined)}
        recovery={recovery}
        onRetry={() => { setTimedOut(false); refresh(); }}
      />
    );
  }

  if (!loading && !me?.user) {
    return (
      <DashboardError
        message={'No active session. Please login again.'}
        code={errorCode || 'NO_SESSION'}
        recovery={[{ type: 'relogin', label: 'Login' }, { type: 'retry', label: 'Retry' }]}
        onRetry={() => refresh()}
      />
    );
  }

  return <>{children}</>;
}
