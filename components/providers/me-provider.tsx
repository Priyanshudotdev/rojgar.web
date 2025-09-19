"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { redirectGuard } from '@/hooks/useSessionAuthedRedirect';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

type Me = {
  user: any | null;
  profile: any | null;
};

type MeContextValue = {
  me: Me | null;
  loading: boolean;
  refresh: () => Promise<void>;
  redirecting: boolean;
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
  const [phone, setPhone] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState<boolean>(redirectGuard.isInProgress());

  // Read phone number from localStorage (set during login/register)
  useEffect(() => {
    try {
      const p = localStorage.getItem('phoneNumber');
      setPhone(p || null);
    } catch {
      setPhone(null);
    }
  }, []);

  // Convex reactive queries
  const user = useQuery(api.users.getUserByPhone, phone ? { phone } : 'skip');
  const profileData = useQuery(
    api.profiles.getProfileByUserId,
    user && user._id ? { userId: user._id } : 'skip'
  ) as { user: any; profile: any } | null | undefined;

  // Build me from queries
  const meFromQueries: Me | null | undefined = useMemo(() => {
    if (phone == null) return null; // no phone -> unauthenticated
    if (user === undefined) return undefined; // user loading
    if (user === null) return { user: null, profile: null };
    if (profileData === undefined) return undefined; // profile loading
    const profile = profileData?.profile ?? null;
    return { user, profile };
  }, [phone, user, profileData]);

  // Determine loading state: undefined from useQuery indicates loading
  const loading = useMemo(() => {
    if (skipInitialFetch && initial) return false;
    if (phone == null) return false; // no phone to look up
    return meFromQueries === undefined;
  }, [meFromQueries, phone, skipInitialFetch, initial]);

  // Prefer live queries, fall back to initial on first render
  const me: Me | null = (meFromQueries ?? initial ?? null) as Me | null;

  // Reflect redirect guard state reactively
  useEffect(() => {
    const interval = setInterval(() => setRedirecting(redirectGuard.isInProgress()), 200);
    return () => clearInterval(interval);
  }, []);

  // No-op refresh; Convex queries are reactive. Kept for API compatibility.
  const refresh = async () => { return; };

  const value = useMemo<MeContextValue>(
    () => ({ me, loading, refresh, redirecting }),
    [me, loading, redirecting]
  );

  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}

export function useMe() {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error('useMe must be used within MeProvider');
  return ctx;
}
