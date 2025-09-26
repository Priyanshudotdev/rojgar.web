"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { MeResponse } from '@/app/api/me/route';
import { redirectGuard } from '@/hooks/useSessionAuthedRedirect';
import { AuthError, buildBackoff, categorizeError, getRecoveryActions, getUserFriendlyMessage, type ErrorCode } from '@/lib/utils/errors';
import { inspectSessionCookie } from '@/lib/utils/session-debug';

type Me = {
  user: MeResponse['user'] | null;
  profile: MeResponse['profile'] | null;
};

type MeContextValue = {
  me: Me | null | undefined; // undefined = loading, null = no session
  loading: boolean;
  refresh: () => Promise<void>;
  redirecting: boolean;
  error?: string | null;
  errorCode?: string | null;
  recovery?: { type: string; label?: string; url?: string }[];
};

const MeContext = createContext<MeContextValue | undefined>(undefined);

type MeProviderProps = {
  children: React.ReactNode;
  initial?: Me | null;
  skipInitialFetch?: boolean;
  timeoutMs?: number;
};

export function MeProvider({ children, initial = undefined, skipInitialFetch = false, timeoutMs = 10000 }: MeProviderProps) {
  const [me, setMe] = useState<Me | null | undefined>(initial);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<{ type: string; label?: string; url?: string }[] | undefined>(undefined);
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [lastEventTs, setLastEventTs] = useState<number | null>(null);
  const [retries, setRetries] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorHistory, setErrorHistory] = useState<{ code: string; ts: number }[]>([]);
  const redirecting = redirectGuard.isInProgress();
  const controllerRef = useRef<AbortController | null>(null);
  const inflightRef = useRef<Promise<{ kind: 'ok' | 'unauth' | 'error'; code?: ErrorCode }> | null>(null);
  const healthIntervalRef = useRef<any>(null);
  const meRef = useRef<Me | null | undefined>(me);
  const lastEventRef = useRef<number | null>(lastEventTs);
  const autoRetryRef = useRef<boolean>(false);

  const emit = (name: string, detail?: any) => {
    try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch {}
  };

  const abortOngoing = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
  };

  const fetchMe = useCallback(async (): Promise<{ kind: 'ok' | 'unauth' | 'error'; code?: ErrorCode }> => {
    if (inflightRef.current) return inflightRef.current;
    const p = (async () => {
      abortOngoing();
      const ctrl = new AbortController();
      controllerRef.current = ctrl;
      const t0 = Date.now();
      let timeoutId: any;
      try {
        // show brief loading on manual refresh; error visibility is preserved by loading computation
  const isInitial = meRef.current === undefined;
  if (isInitial) setMe(undefined); else setIsRefreshing(true);
  timeoutId = setTimeout(() => ctrl.abort(), timeoutMs);
        const res = await fetch('/api/me', { credentials: 'include', cache: 'no-store', signal: ctrl.signal });
        if (process.env.NODE_ENV !== 'production') {
          console.info('[MeProvider] /api/me first attempt', { status: res.status, ms: Date.now() - t0 });
        }
        if (res.status === 401 || res.status === 204) {
          // Single retry after brief delay to allow cookie propagation
          await new Promise((r) => setTimeout(r, 80));
          const retryStart = Date.now();
          const retry = await fetch('/api/me', { credentials: 'include', cache: 'no-store', signal: ctrl.signal });
          if (process.env.NODE_ENV !== 'production') {
            console.info('[MeProvider] /api/me retry', { status: retry.status, ms: Date.now() - retryStart });
          }
          if (retry.status === 401 || retry.status === 204) {
            setMe(null); // accepted unauth
            setError(null);
            setErrorCode(null);
            setRecovery(undefined);
            if (process.env.NODE_ENV !== 'production') {
              console.info('[MeProvider] unauthenticated after retry', { cookie: inspectSessionCookie() });
            }
            emit('session-unauthenticated', { t: Date.now() });
            return { kind: 'unauth' } as const;
          }
          if (!retry.ok) {
            let code: string | undefined;
            try { const data = await retry.json(); code = data?.code; } catch {}
            const err = new AuthError((code as any) || 'UNKNOWN_ERROR', `Request failed (${retry.status})`, { status: retry.status });
            const friendly = getUserFriendlyMessage(err);
            setError(friendly);
            setErrorCode(err.code);
            setRecovery(getRecoveryActions(err));
            setMe(undefined);
            return { kind: 'error', code: err.code } as const;
          }
          const dataR = (await retry.json()) as Partial<MeResponse> | any;
          setMe({ user: (dataR as any)?.user ?? null, profile: (dataR as any)?.profile ?? null });
          setError(null);
          setErrorCode(null);
          setRecovery(undefined);
          return { kind: 'ok' } as const;
        }
        if (!res.ok) {
          // Try to parse structured error with code
          let code: string | undefined;
          try {
            const data = await res.json();
            code = data?.code;
          } catch {}
          const err = new AuthError((code as any) || 'UNKNOWN_ERROR', `Request failed (${res.status})`, { status: res.status });
          const friendly = getUserFriendlyMessage(err);
          setError(friendly);
          setErrorCode(err.code);
          setRecovery(getRecoveryActions(err));
          setMe(undefined);
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[MeProvider] non-ok response', { status: res.status });
          }
          emit('session-error', { code: err.code, status: res.status });
          return { kind: 'error', code: err.code } as const;
        }
        const data = (await res.json()) as Partial<MeResponse> | any;
          setMe({ user: (data as any)?.user ?? null, profile: (data as any)?.profile ?? null });
        setError(null);
        setErrorCode(null);
        setRecovery(undefined);
        if (process.env.NODE_ENV !== 'production') {
          console.info('[MeProvider] success', { ms: Date.now() - t0 });
        }
        emit('session-authenticated', { t: Date.now() });
        setLastLatency(Date.now() - t0);
        setLastEventTs(Date.now());
        return { kind: 'ok' } as const;
      } catch (e: any) {
        if (e?.name === 'AbortError') {
          const ce: any = new AuthError('NETWORK_ERROR', 'Request aborted (timeout)', { category: 'network' });
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[MeProvider] aborted/timeout', { ms: Date.now() - t0 });
          }
          setError(getUserFriendlyMessage(ce));
          setErrorCode(ce.code);
          setRecovery(getRecoveryActions(ce));
          setErrorHistory(h => [...h.slice(-4), { code: ce.code, ts: Date.now() }]);
          setMe(undefined);
          emit('session-error', { code: ce.code, timeout: true });
          return { kind: 'error', code: ce.code } as const;
        }
        const ce = categorizeError(e);
        setError(getUserFriendlyMessage(ce));
        setErrorCode(ce.code);
        setRecovery(getRecoveryActions(ce));
        setErrorHistory(h => [...h.slice(-4), { code: ce.code, ts: Date.now() }]);
        setMe(undefined);
        if (process.env.NODE_ENV !== 'production') {
          console.error('[MeProvider] fetch error', { code: ce.code, ms: Date.now() - t0 });
        }
        emit('session-error', { code: ce.code });
        return { kind: 'error', code: ce.code } as const;
      } finally {
        clearTimeout(timeoutId);
        inflightRef.current = null;
        setIsRefreshing(false);
      }
    })();
    inflightRef.current = p;
    return p;
  }, [timeoutMs]);

  const refresh = useCallback(async () => {
    // Smarter retry: network errors (and timeout) up to 2 attempts, add jitter; single retry for 5xx
    let attempt = 0;
    for (;;) {
      const r = await fetchMe();
      if (r.kind === 'ok' || r.kind === 'unauth') break;
      const isNet = r.code === 'NETWORK_ERROR';
      const isServer = r.code === 'SERVER_ERROR';
      if (!(isNet || isServer)) break;
      if (attempt >= (isNet ? 2 : 1)) break;
      const base = buildBackoff(attempt);
      const delay = Math.round(base * (0.8 + Math.random() * 0.4));
      if (process.env.NODE_ENV !== 'production') {
        console.info('[MeProvider] retrying', { attempt, code: r.code, delay });
      }
      await new Promise((res) => setTimeout(res, delay));
      attempt++;
      setRetries(attempt);
    }
  }, [fetchMe]);

  useEffect(() => { meRef.current = me; }, [me]);
  useEffect(() => { lastEventRef.current = lastEventTs; }, [lastEventTs]);

  useEffect(() => {
    if (!skipInitialFetch) fetchMe();
    const onUpdate = () => {
      // Small delay to ensure cookie is written before fetch
      setTimeout(() => { fetchMe(); }, 80);
    };
    const health = () => {
      const cur = meRef.current;
      const lastEvt = lastEventRef.current;
      if (!cur || !cur.user) return;
      if (lastEvt && Date.now() - lastEvt > 4 * 60 * 1000) {
        if (process.env.NODE_ENV !== 'production') {
          console.info('[MeProvider] periodic health refresh');
        }
        refresh();
      }
    };
    healthIntervalRef.current = setInterval(health, 60000);
    window.addEventListener('session-updated', onUpdate);
    return () => {
      window.removeEventListener('session-updated', onUpdate);
      abortOngoing();
      if (healthIntervalRef.current) clearInterval(healthIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loading = me === undefined && !error;
  // Expose loading=true during transient errors (network/server/timeout) while me is undefined;
  // for non-transient errors, allow layouts to render error UI.
  const loadingPending = me === undefined && (!errorCode || errorCode === 'NETWORK_ERROR' || errorCode === 'SERVER_ERROR' || errorCode === 'TIMEOUT');
  const value: MeContextValue = useMemo(
    () => ({ me, loading: loadingPending, refresh, redirecting, error, errorCode, recovery }),
    [me, loadingPending, refresh, redirecting, error, errorCode, recovery],
  );
  // On initial transient errors (network/server/timeout), automatically retry once in the background
  useEffect(() => {
    if (autoRetryRef.current) return;
    if (me === undefined && (errorCode === 'NETWORK_ERROR' || errorCode === 'SERVER_ERROR' || errorCode === 'TIMEOUT')) {
      autoRetryRef.current = true;
      refresh();
    }
  }, [me, errorCode, refresh]);
  // Make profileId available globally for modules that avoid importing providers
  useEffect(() => {
    try {
      const anyWin: any = window as any;
      if (me && me.profile && me.profile._id) {
        anyWin.__meProfileId = me.profile._id;
      } else {
        if (anyWin.__meProfileId) delete anyWin.__meProfileId;
      }
    } catch {}
  }, [me?.profile?._id]);
  return (
    <MeContext.Provider value={value}>
      {children}
      {process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_SHOW_ME_DEBUG === '1' && (
        <div className="fixed bottom-2 right-2 z-50 text-[10px] bg-black/70 text-white px-2 py-1 rounded shadow space-x-2 font-mono">
          <span>{loading ? 'loading' : isRefreshing ? 'refresh' : me ? 'ok' : me === null ? 'unauth' : 'idle'}</span>
          {lastLatency && <span>{lastLatency}ms</span>}
          {retries > 0 && <span>r{retries}</span>}
          {errorCode && <span className="text-red-400">{errorCode}</span>}
          {errorHistory.length > 0 && (
            <span>hist:{errorHistory.map(h => h.code).join(',')}</span>
          )}
          <button onClick={() => refresh()} className="underline">refetch</button>
          <button onClick={() => { window.dispatchEvent(new Event('session-updated')); }} className="underline">fakeUpd</button>
          <button onClick={async () => { try { await fetch('/api/session/clear', { method: 'POST' }); } catch {}; window.location.reload(); }} className="underline">clear</button>
        </div>
      )}
    </MeContext.Provider>
  );
}


export function useMe() {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error('useMe must be used within MeProvider');
  return ctx;
}
