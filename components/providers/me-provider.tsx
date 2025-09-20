"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { redirectGuard } from '@/hooks/useSessionAuthedRedirect';

type Me = {
  user: any | null;
  profile: any | null;
};

type MeContextValue = {
  me: Me | null;
  loading: boolean;
  refresh: () => Promise<void>;
  redirecting: boolean;
  error?: string | null;
};

const MeContext = createContext<MeContextValue | undefined>(undefined);

type MeProviderProps = {
  children: React.ReactNode;
  /** Optional server-fetched initial value to avoid duplicate client round trip */
  initial?: Me | null;
  /** If true, use initial data as authoritative on first paint; queries will hydrate subsequently */
  skipInitialFetch?: boolean;
};

export function MeProvider({ children, initial = null, skipInitialFetch }: MeProviderProps) {
  const [meFromApi, setMeFromApi] = useState<Me | null | undefined>(undefined); // undefined = loading
  const [hydrated, setHydrated] = useState(false);
  const [redirecting, setRedirecting] = useState<boolean>(redirectGuard.isInProgress());
  const [error, setError] = useState<string | null>(null);

  const sessionSettledRef = useRef(false);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // Helper: call /api/me to detect session & user/profile server-side
  const checkSessionStatus = async () => {
    try {
      // Abort previous in-flight request
      if (controllerRef.current) {
        try { controllerRef.current.abort(); } catch {}
      }
      const controller = new AbortController();
      controllerRef.current = controller;
      const res = await fetch('/api/me', { method: 'GET', credentials: 'same-origin', signal: controller.signal });
      if (res.status === 401) {
        // No session
        setMeFromApi(null);
        setError(null);
        sessionSettledRef.current = true;
        // clear timers/interval handled elsewhere
        return null;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => 'Unknown error');
        throw new Error(text || 'Failed to fetch session');
      }
      const json = await res.json();
      // Expect shape { user, profile }
      setMeFromApi({ user: json.user ?? null, profile: json.profile ?? null });
      setError(null);
      sessionSettledRef.current = true;
      return json;
    } catch (e: any) {
      if (e?.name === 'AbortError') return undefined;
      // Network or other error - do not treat as logout; preserve undefined so timeout can decide
      setError(e?.message ?? 'Network error');
      return undefined;
    }
  };

  // Polling + event-driven detection
  useEffect(() => {
    let mounted = true;
    setHydrated(true);

    // Immediate check on mount
    checkSessionStatus();

    // Fallback polling: 250ms
    intervalRef.current = window.setInterval(() => {
      checkSessionStatus();
    }, 250);

    // Listener for immediate updates (e.g., onboarding pages dispatch this)
    const onSessionUpdated = () => {
      checkSessionStatus();
    };
    window.addEventListener('session-updated', onSessionUpdated as EventListener);

    // Initial timeout to avoid infinite loading (5s)
    timeoutRef.current = window.setTimeout(() => {
      if (mounted && !sessionSettledRef.current && meFromApi === undefined) {
        // mark as no session found or timed out
        setMeFromApi(null);
        setError((prev) => prev ?? 'Session detection timed out');
        sessionSettledRef.current = true;
      }
    }, 5000);

    return () => {
      mounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (controllerRef.current) {
        try { controllerRef.current.abort(); } catch {}
        controllerRef.current = null;
      }
      window.removeEventListener('session-updated', onSessionUpdated as EventListener);
    };
  }, []);

  // Stop polling once we have a settled session state
  useEffect(() => {
    if (meFromApi !== undefined) {
      sessionSettledRef.current = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (controllerRef.current) {
        try { controllerRef.current.abort(); } catch {}
        controllerRef.current = null;
      }
    }
  }, [meFromApi]);

  // Build me directly from /api/me result
  const meFromQueries: Me | null | undefined = meFromApi;

  // Determine loading state
  const loading = useMemo(() => {
    if (typeof window === 'undefined') return false;
    if (!hydrated) return true; // initial hydration
    if (skipInitialFetch && initial) return false;
    // If /api/me is still fetching, show loading
    return meFromQueries === undefined;
  }, [hydrated, meFromQueries, skipInitialFetch, initial]);

  // Prefer API result, fall back to initial prop if provided
  const me: Me | null = (meFromQueries ?? initial ?? null) as Me | null;

  // Refresh API: re-run /api/me check
  const refresh = async () => {
    await checkSessionStatus();
  };

  const value = useMemo<MeContextValue>(
    () => ({ me, loading, refresh, redirecting, error }),
    [me, loading, redirecting, error]
  );

  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}


export function useMe() {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error('useMe must be used within MeProvider');
  return ctx;
}
