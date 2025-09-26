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
  // Enhanced skip detection that distinguishes between:
  // - explicit skip (args === 'skip'): unauth or do-not-run state
  // - pending (args === undefined or any arg value === undefined): often auth loading
  // - missing queryRef (undefined/null): coding-time bug or codegen mismatch; treat as hard skip to avoid crashes
  const isExplicitSkip = useMemo(() => args === 'skip', [args]);
  // Pending: only when the entire args is undefined (e.g., awaiting prerequisites like IDs)
  // Do NOT treat object properties that are undefined as pending, since many Convex args are optional.
  const isPending = useMemo(() => args === undefined, [args]);
  // Consider queryRef missing ONLY if it's null/undefined.
  // Convex exposes function references as objects/proxies; don't try to introspect shape.
  // If a caller passes a primitive by mistake, let useQuery surface a useful dev error instead of silently skipping.
  const isQueryMissing = useMemo(() => queryRef == null, [queryRef]);
  // Log once in dev to aid diagnosis if a caller passed an undefined query
  if (
    isQueryMissing &&
    typeof window !== 'undefined' &&
    process.env.NODE_ENV !== 'production'
  ) {
    try {
      // eslint-disable-next-line no-console
      console.warn(
        'useCachedConvexQuery: queryRef is undefined/null.\nThis often means Convex API codegen has not produced function references yet or the import failed. Ensure: \n- convex/_generated/api is present\n- run `npx convex dev` (or `npm run convex:codegen`) to regenerate.\nTreating this call as `skip` to avoid a crash.',
        { key: options?.key, args },
      );
    } catch {}
  }
  const isSkipped = isExplicitSkip || isPending || isQueryMissing;
  const key = useMemo(() => {
    const base = options?.key ?? 'convex-query';
    return `${base}:${JSON.stringify(args)}`;
  }, [args, options?.key]);

  const [cached, setCached] = useState<TData | undefined>(undefined);
  const [hydrated, setHydrated] = useState(false);
  // Conditionally call Convex useQuery only when not skipped to prevent premature execution
  // Note: When skipped, we DO NOT call useQuery at all (prevents UNAUTHENTICATED during auth bootstrap)
  const convexData = ((): TData | undefined => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return !isSkipped && !isQueryMissing
      ? (useQuery(queryRef, args as any) as unknown as TData | undefined)
      : undefined;
  })();
  const wroteRef = useRef(false);

  // Hydrate cache on mount (client only)
  useEffect(() => {
    if (isExplicitSkip || isQueryMissing) {
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
  }, [key, options?.ttlMs, isExplicitSkip, isQueryMissing]);

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
    // Data behavior:
    // - explicit skip: no data (unauthenticated, do not show stale)
    // - missing queryRef: treat as hard skip (no data)
    // - pending (auth loading): show cached if available while loading
    // - active: show live or cached
    data:
      isExplicitSkip || isQueryMissing
        ? undefined
        : isPending
          ? cached
          : (convexData ?? cached),
    // Loading behavior:
    // - pending (auth loading): loading true
    // - explicit skip (unauth) or missing query: not loading
    // - active: loading until either live or cached is present
    isLoading: isPending
      ? true
      : isExplicitSkip || isQueryMissing
        ? false
        : hydrated
          ? convexData === undefined && cached === undefined
          : true,
    hasLive: !isSkipped && convexData !== undefined,
    cached: isExplicitSkip || isQueryMissing ? undefined : cached,
    error: undefined as unknown,
  } as const;
}
