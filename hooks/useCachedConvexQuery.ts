'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'convex/react';

// Minimal generic cache for Convex queries. Shows cached data immediately
// and updates cache once live query resolves. TTL is optional.
export function useCachedConvexQuery<TArgs extends object, TData = any>(
  queryRef: any,
  args: TArgs,
  options?: { key?: string; ttlMs?: number },
) {
  const isSkipped = (args as unknown) === 'skip';
  const key = useMemo(() => {
    const base = options?.key ?? (queryRef?.toString?.() || 'convex-query');
    return `${base}:${JSON.stringify(args)}`;
  }, [queryRef, args, options?.key]);

  const [cached, setCached] = useState<TData | undefined>(undefined);
  const [hydrated, setHydrated] = useState(false);
  const convexData = useQuery(queryRef, args as any) as TData | undefined;
  const wroteRef = useRef(false);

  // Hydrate cache on mount (client only)
  useEffect(() => {
    if (isSkipped) {
      setCached(undefined);
      setHydrated(true);
      return;
    }
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as { t: number; v: TData };
        if (!options?.ttlMs || Date.now() - parsed.t < options.ttlMs) {
          setCached(parsed.v);
        } else {
          // expired
          localStorage.removeItem(key);
        }
      }
    } catch {}
    setHydrated(true);
  }, [key, options?.ttlMs, isSkipped]);

  // Reset writer when key or skip state changes
  useEffect(() => {
    wroteRef.current = false;
  }, [key, isSkipped]);

  // When Convex returns, update cache once
  useEffect(() => {
    if (isSkipped) return;
    if (convexData === undefined) return;
    if (wroteRef.current) return;
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ t: Date.now(), v: convexData }),
      );
      setCached(convexData);
      wroteRef.current = true;
    } catch {}
  }, [convexData, key, isSkipped]);

  return {
    data: isSkipped ? undefined : (convexData ?? cached),
    isLoading: isSkipped
      ? true
      : hydrated
        ? convexData === undefined && cached === undefined
        : true,
    hasLive: !isSkipped && convexData !== undefined,
    cached: isSkipped ? undefined : cached,
  } as const;
}
