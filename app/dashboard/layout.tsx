
"use client";
import { ReactNode, useEffect, useState } from 'react';
import { useMe } from '@/components/providers/me-provider';

export default function DashboardShell({ children }: { children: ReactNode }) {
  const { me, loading, redirecting } = useMe();

  // Show a simple fallback (e.g., login link) if unauthenticated state persists for a few seconds
  const [stale, setStale] = useState(false);

  console.log("me:- ", me);

  useEffect(() => {
    setStale(false);
    if (!me?.user) {
      const t = setTimeout(() => setStale(true), 5000);
      return () => clearTimeout(t);
    }
  }, [me?.user]);

  if (loading || !me?.user || redirecting) {
    return (
      <div className="min-h-screen grid place-items-center text-white/80 px-4 text-center">
        <div className="space-y-2">
          <div className="animate-pulse">
            {redirecting ? 'Redirecting you to the right place…' : 'Loading your dashboard…'}
          </div>
          {!redirecting && !loading && !me?.user && stale && (
            <div className="text-xs text-white/60">
              Still waiting? Try <a href="/auth/login" className="underline">logging in</a> again.
            </div>
          )}
        </div>
      </div>
    );
  }
  // Do not redirect here; MeProvider + middleware handle auth routing.
  return <>{children}</>;
}
