
"use client";
import { ReactNode, useEffect, useState, useRef } from 'react';
import { useMe } from '@/components/providers/me-provider';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DashboardHeaderSkeleton } from '@/components/ui/skeleton';

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isOnboarding = pathname.startsWith('/onboarding');

  // Progressive loading & error handling UI
  const { me, loading, redirecting, refresh, error } = useMe();
  const [loadingMessage, setLoadingMessage] = useState('Loading your dashboard…');
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showDetailedError, setShowDetailedError] = useState(false);
  const mountedRef = useRef(true);
  const t1Ref = useRef<number | null>(null);
  const t2Ref = useRef<number | null>(null);
  const t3Ref = useRef<number | null>(null);
  const MAX_RETRIES = 3;

  useEffect(() => {
    mountedRef.current = true;

    // Update progressive messages based on elapsed time
    t1Ref.current = window.setTimeout(() => { if (mountedRef.current) setLoadingMessage('Verifying your session…'); }, 1000);
    t2Ref.current = window.setTimeout(() => { if (mountedRef.current) setLoadingMessage('Almost ready…'); }, 3000);
    t3Ref.current = window.setTimeout(() => { if (mountedRef.current) setLoadingMessage('Still working — showing options below'); }, 5000);

    return () => {
      mountedRef.current = false;
      if (t1Ref.current) { clearTimeout(t1Ref.current); t1Ref.current = null; }
      if (t2Ref.current) { clearTimeout(t2Ref.current); t2Ref.current = null; }
      if (t3Ref.current) { clearTimeout(t3Ref.current); t3Ref.current = null; }
    };
  }, []);

  // Clear progressive timeouts once loading completes or an error is present
  useEffect(() => {
    if (!loading || !!error) {
      if (t1Ref.current) { clearTimeout(t1Ref.current); t1Ref.current = null; }
      if (t2Ref.current) { clearTimeout(t2Ref.current); t2Ref.current = null; }
      if (t3Ref.current) { clearTimeout(t3Ref.current); t3Ref.current = null; }
    }
  }, [loading, error]);

  // Retry handler
  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount((c) => c + 1);
    try {
      await refresh();
    } finally {
      if (mountedRef.current) setIsRetrying(false);
    }
  };

  // Determine specific error message (defensively normalize error values)
  const getErrorMessage = () => {
    if (!error) return null;
    const raw = typeof error === 'string' ? error : (error as any)?.message ?? String(error);
    const lower = raw.toLowerCase();
    if (lower.includes('timeout')) return 'Session verification is taking longer than expected.';
    if (lower.includes('network') || lower.includes('failed to fetch')) return 'Connection issue detected. Check your internet and retry.';
    if (lower.includes('unauthorized') || lower.includes('401') || lower.includes('invalid')) return 'Session expired or invalid. Please login again.';
    return raw;
  };

  // Loading / redirecting / unauthenticated guard for non-onboarding pages
  if (!isOnboarding && (loading || !me?.user || redirecting)) {
    const errMsg = getErrorMessage();
    const isTimedOut = !loading && !!errMsg && errMsg.toLowerCase().includes('taking longer');

    return (
      <div className="min-h-screen grid place-items-center px-4 text-center">
        <div className="w-full max-w-md bg-white rounded-xl p-6 text-black shadow">
          <div className="space-y-4">
            {!errMsg && (
              <div aria-live="polite" className="flex items-center justify-center">
                <div className="animate-pulse font-semibold text-lg">{redirecting ? 'Redirecting you to the right place…' : loadingMessage}</div>
              </div>
            )}

            {loading && (
              <div>
                <div className="mb-2"><DashboardHeaderSkeleton /></div>
                <div className="text-sm text-gray-600">Preparing your personalized dashboard…</div>
              </div>
            )}

            {!loading && errMsg && (
              <div className="space-y-3">
                <div role="alert" className="text-sm text-red-600 font-medium">{errMsg}</div>
                <div className="text-xs text-gray-600">{showDetailedError ? '' : 'If this persists, try the options below.'}</div>
                {showDetailedError && (
                  <div className="text-xs text-gray-600 max-h-32 overflow-auto whitespace-pre-wrap break-words">
                    { (typeof error === 'string') ? error : (error as any)?.message ?? String(error) }
                  </div>
                )}
                <div className="flex gap-2 justify-center pt-2">
                  <Button onClick={handleRetry} disabled={isRetrying || retryCount >= MAX_RETRIES} aria-label="Retry session verification">
                    {isRetrying ? 'Retrying…' : (retryCount >= MAX_RETRIES ? 'Retry limit reached' : 'Try Again')}
                  </Button>
                  <Button variant="outline" onClick={() => window.location.href = '/auth/login'} aria-label="Login again">Login Again</Button>
                  <Button variant="ghost" onClick={() => setShowDetailedError((s) => !s)} aria-label="Toggle error details">{showDetailedError ? 'Hide details' : 'Show details'}</Button>
                </div>
                <div className="text-xs text-gray-500">Retry attempts: {retryCount}</div>
              </div>
            )}

            {!loading && !errMsg && !me?.user && (
              <div className="text-sm text-gray-600">Still waiting? Try <a href="/auth/login" className="underline">logging in</a> again.</div>
            )}
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
