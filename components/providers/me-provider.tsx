"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { MeResponse } from '@/app/api/me/route';
import { redirectGuard } from '@/hooks/useSessionAuthedRedirect';
import { AuthError, buildBackoff, categorizeError, getRecoveryActions, getUserFriendlyMessage, type ErrorCode } from '@/lib/utils/errors';

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
};

export function MeProvider({ children, initial = undefined, skipInitialFetch = false }: MeProviderProps) {
  const [me, setMe] = useState<Me | null | undefined>(initial);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<{ type: string; label?: string; url?: string }[] | undefined>(undefined);
  const redirecting = redirectGuard.isInProgress();
  const controllerRef = useRef<AbortController | null>(null);

  const abortOngoing = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
  };

  const fetchMe = async (): Promise<{ kind: 'ok' | 'unauth' | 'error'; code?: ErrorCode }> => {
    abortOngoing();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;
    try {
      // show brief loading on manual refresh; error visibility is preserved by loading computation
      setMe(undefined);
      const res = await fetch('/api/me', { credentials: 'include', signal: ctrl.signal });
      if (res.status === 401 || res.status === 204) {
        setMe(null);
        setError(null);
        setErrorCode(null);
        setRecovery(undefined);
        return { kind: 'unauth' };
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
        return { kind: 'error', code: err.code };
      }
      const data = (await res.json()) as Partial<MeResponse> | any;
      setMe({ user: (data as any)?.user ?? null, profile: (data as any)?.profile ?? null });
      setError(null);
      setErrorCode(null);
      setRecovery(undefined);
      return { kind: 'ok' };
    } catch (e: any) {
      if (e?.name === 'AbortError') return { kind: 'error' as const };
      const ce = categorizeError(e);
      setError(getUserFriendlyMessage(ce));
      setErrorCode(ce.code);
      setRecovery(getRecoveryActions(ce));
      setMe(undefined);
      return { kind: 'error', code: ce.code };
    }
  };

  const refresh = async () => {
    // Retry with exponential backoff only for network errors, based on immediate return
    let attempt = 0;
    for (;;) {
      const r = await fetchMe();
      if (r.kind !== 'error' || r.code !== 'NETWORK_ERROR' || attempt >= 2) break;
      await new Promise((res) => setTimeout(res, buildBackoff(attempt++)));
    }
  };

  useEffect(() => {
    if (!skipInitialFetch) fetchMe();
    const onUpdate = () => fetchMe();
    window.addEventListener('session-updated', onUpdate);
    return () => {
      window.removeEventListener('session-updated', onUpdate);
      abortOngoing();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loading = me === undefined && !error;
  const value: MeContextValue = useMemo(
    () => ({ me, loading, refresh, redirecting, error, errorCode, recovery }),
    [me, loading, redirecting, error, errorCode, recovery],
  );
  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}


export function useMe() {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error('useMe must be used within MeProvider');
  return ctx;
}
