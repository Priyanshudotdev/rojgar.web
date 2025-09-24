"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Skeleton } from './skeleton';
import { Button } from './button';
import { inspectSessionCookie } from '@/lib/utils/session-debug';

type DashboardLoadingProps = {
  variant?: 'default' | 'company' | 'job-seeker';
  timeoutMs?: number; // total time before declaring timeout
  onTimeout?: () => void;
  onRetry?: () => void;
  showDebug?: boolean;
};

// Thresholds (progressive messaging)
const STAGES = [
  { at: 0, label: 'Loading your dashboard…' },
  { at: 3000, label: 'Still loading…' },
  { at: 8000, label: 'This is taking longer than usual…' },
];

export const DashboardLoading: React.FC<DashboardLoadingProps> = ({
  variant = 'default',
  timeoutMs = 15000,
  onTimeout,
  onRetry,
  showDebug = process.env.NODE_ENV !== 'production',
}) => {
  const startRef = useRef<number>(Date.now());
  const [, force] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const i = setInterval(() => force((x) => x + 1), 500);
    const t = setTimeout(() => {
      setTimedOut(true);
      onTimeout?.();
    }, timeoutMs);
    return () => { clearInterval(i); clearTimeout(t); };
  }, [timeoutMs, onTimeout]);

  const elapsed = Date.now() - startRef.current;
  const stage = useMemo(() => {
    if (timedOut) return 'Timeout exceeded. Please check your connection.';
    let current = STAGES[0].label;
    for (const s of STAGES) {
      if (elapsed >= s.at) current = s.label;
    }
    return current;
  }, [elapsed, timedOut]);

  const containerClasses = variant === 'company'
    ? 'w-full max-w-md h-full bg-white relative overflow-hidden'
    : 'w-full max-w-md bg-white rounded-xl p-6 text-black shadow';

  return (
    <div className={variant === 'company' ? 'h-screen bg-gray-100 flex justify-center items-center' : 'min-h-screen grid place-items-center px-4 text-center'}>
      <div className={containerClasses} aria-live="polite" aria-busy={!timedOut}>
        <div className={variant === 'company' ? 'p-6 space-y-4' : 'space-y-4'}>
          <div className="font-semibold text-sm md:text-base">{stage}</div>
          {!timedOut && (
            <div className="space-y-3" data-stage={stage}>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <div className="grid grid-cols-3 gap-3 pt-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            </div>
          )}
          {timedOut && (
            <div className="space-y-4">
              <div className="text-sm text-red-600 font-medium">Loading timeout.</div>
              <div className="flex gap-2 flex-wrap justify-center">
                {onRetry && <Button size="sm" onClick={onRetry}>Retry</Button>}
                <Button size="sm" variant="outline" onClick={() => (window.location.href = '/auth/login')}>Login</Button>
                <Button size="sm" variant="outline" onClick={async () => { try { await fetch('/api/session/clear', { method: 'POST' }); } catch {}; window.location.href = '/auth/login'; }}>Clear Session</Button>
              </div>
            </div>
          )}
          {showDebug && elapsed > 5000 && !timedOut && (
            <div className="mt-4 text-left">
              <details className="text-xs text-gray-500">
                <summary className="cursor-pointer select-none">Debug info</summary>
                <div className="pt-2 space-y-1">
                  <div>Elapsed: {Math.round(elapsed / 100) / 10}s</div>
                  {(() => {
                    try {
                      const c = inspectSessionCookie();
                      if (!c) return <div>Cookie: none</div>;
                      return <div>Cookie: {c.masked}</div>;
                    } catch {
                      return <div>Cookie: error</div>;
                    }
                  })()}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardLoading;
