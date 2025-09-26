'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'convex/react';

// Minimal generic cache for Convex queries. Shows cached data immediately
// and updates cache once live query resolves. TTL is optional.
export function useCachedConvexQuery<
  TArgs extends object | undefined,
  TData = any,
>(
  queryRef: any,
  args: TArgs | 'skip',
  options?: { key?: string; ttlMs?: number; persist?: boolean },
) {
  const isSkipped =
    (args as unknown) === 'skip' || args === (undefined as unknown);
  const key = useMemo(() => {
    const base = options?.key ?? (queryRef?.toString?.() || 'convex-query');
    return `${base}:${JSON.stringify(args)}`;
  }, [queryRef, args, options?.key]);

  const [cached, setCached] = useState<TData | undefined>(undefined);
  const [hydrated, setHydrated] = useState(false);
  let convexData: TData | undefined = undefined;
  let error: unknown = undefined;
  try {
    if (!isSkipped) {
      convexData = useQuery(queryRef, args as any) as TData | undefined;
    }
  } catch (e) {
    error = e;
  }
  const wroteRef = useRef(false);

  // Hydrate cache on mount (client only)
  useEffect(() => {
    if (isSkipped) {
      setCached(undefined);
      setHydrated(true);
      return;
    }
    if (options?.persist !== false) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as { t: number; v: TData };
          if (!options?.ttlMs || Date.now() - parsed.t < options.ttlMs) {
            setCached(parsed.v);
          } else {
            localStorage.removeItem(key);
          }
        }
      } catch {}
    }
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
    if (options?.persist !== false) {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ t: Date.now(), v: convexData }),
        );
        setCached(convexData);
        wroteRef.current = true;
      } catch {}
    } else {
      setCached(convexData);
      wroteRef.current = true;
    }
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
    error,
  } as const;
}
