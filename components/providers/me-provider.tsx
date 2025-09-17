"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

type Me = {
  user: any | null;
  profile: any | null;
};

type MeContextValue = {
  me: Me | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const MeContext = createContext<MeContextValue | undefined>(undefined);

const LS_KEY = 'me-cache:v1';
const TTL_MS = 5 * 60 * 1000; // 5 minutes

type MeProviderProps = {
  children: React.ReactNode;
  /** Optional server-fetched initial value to avoid duplicate client round trip */
  initial?: Me | null;
  /** If true, skip the automatic fetch on mount (used when initial is authoritative) */
  skipInitialFetch?: boolean;
};

export function MeProvider({ children, initial = null, skipInitialFetch }: MeProviderProps) {
  const [me, setMe] = useState<Me | null>(initial);
  const [loading, setLoading] = useState(!initial);
  const fetchingRef = useRef(false);

  const hydrate = () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { t: number; v: Me };
      if (Date.now() - parsed.t < TTL_MS) {
        setMe(parsed.v);
      } else {
        localStorage.removeItem(LS_KEY);
      }
    } catch {}
  };

  const fetchMe = async () => {
    if (fetchingRef.current) {
      // allow subsequent calls to re-fetch after a short delay
      // avoids lock if localStorage was cleared mid-flight
      return;
    }
    fetchingRef.current = true;
    try {
      const res = await fetch('/api/me', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as Me;
        setMe(data);
        try {
          localStorage.setItem(LS_KEY, JSON.stringify({ t: Date.now(), v: data }));
        } catch {}
      }
    } catch {
      // ignore
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    // If we already have initial data (SSR-provided), seed localStorage immediately
    if (initial) {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({ t: Date.now(), v: initial }));
      } catch {}
    } else {
      hydrate();
    }
    if (skipInitialFetch) {
      // We trust the provided initial value; still allow manual refresh later
      setLoading(false);
      return;
    }
    // brief tick to avoid blocking paint, then fetch fresh data (may revalidate)
    const t = setTimeout(() => fetchMe(), 0);
    return () => clearTimeout(t);
  // we intentionally exclude fetchMe from deps to avoid ref churn
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipInitialFetch, initial]);

  const value = useMemo<MeContextValue>(
    () => ({ me, loading, refresh: fetchMe }),
    [me, loading]
  );

  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}

export function useMe() {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error('useMe must be used within MeProvider');
  return ctx;
}
