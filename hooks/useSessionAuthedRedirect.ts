'use client';

import { useEffect, useState } from 'react';
import { redirectToDashboard } from '@/lib/auth/redirect';

// Global redirect guard to prevent multiple simultaneous redirects/race conditions
class RedirectGuard {
  private static _instance: RedirectGuard | null = null;
  private _inProgress = false;
  private _timer: any = null;
  private _count = 0;
  private constructor() {}
  static get instance(): RedirectGuard {
    if (!this._instance) this._instance = new RedirectGuard();
    return this._instance;
  }
  isInProgress() {
    return this._inProgress;
  }
  start(timeoutMs = 7000) {
    // Reference-counted start; returns a disposer to decrement count
    this._count++;
    if (!this._inProgress) {
      this._inProgress = true;
      if (this._timer) clearTimeout(this._timer);
      this._timer = setTimeout(() => {
        // Safety auto-stop if all disposers were not called
        this._inProgress = false;
        this._count = 0;
        this._timer = null;
      }, timeoutMs);
    }
    let disposed = false;
    return () => {
      if (disposed) return;
      disposed = true;
      this._count = Math.max(0, this._count - 1);
      if (this._count === 0) {
        this.stop();
      }
    };
  }
  stop() {
    this._inProgress = false;
    this._count = 0;
    if (this._timer) clearTimeout(this._timer);
    this._timer = null;
  }
  async debounce(ms = 300) {
    await new Promise((r) => setTimeout(r, ms));
  }
}

export const redirectGuard = RedirectGuard.instance;

type SessionRedirectState = {
  authed: boolean;
  redirectTo?: string;
  checking: boolean;
  error?: string;
};

export function useSessionAuthedRedirect(): SessionRedirectState {
  const [state, setState] = useState<SessionRedirectState>({
    authed: false,
    checking: true,
  });

  useEffect(() => {
    let cancelled = false;
    // Track if this hook instance started the guard
    let disposeGuard: (() => void) | null = null;
    (async () => {
      // Skip heavy work if a redirect is already in progress
      if (redirectGuard.isInProgress()) {
        if (process.env.NODE_ENV !== 'production') {
          console.debug(
            '[useSessionAuthedRedirect] Redirect in progress; skipping.',
          );
        }
        if (!cancelled) setState({ authed: false, checking: false });
        return;
      }

      // Try hydrate from MeProvider cache to avoid duplicate API calls
      const hydrateFromCache = () => {
        try {
          const raw = localStorage.getItem('me-cache:v1');
          if (!raw) return null;
          const parsed = JSON.parse(raw) as { t: number; v: any };
          // Tighter TTL for redirect decisions to reduce stale-auth
          const TTL_MS = 60 * 1000; // 1 minute for hook redirect decisions
          if (Date.now() - parsed.t < TTL_MS) return parsed.v;
        } catch {}
        return null;
      };

      try {
        // Debounce to avoid rapid-fire calls when navigating between auth pages
        await redirectGuard.debounce(300);

        const cached = hydrateFromCache();
        if (cached) {
          const profile = cached?.profile;
          const user = cached?.user;
          if (user) {
            const userRole: string | undefined = user?.role ?? undefined;
            let redirectTo = '/profile';
            try {
              redirectTo = redirectToDashboard(profile, userRole);
            } catch {
              redirectTo = '/profile';
            }
            // Start guard only when an authenticated redirect is likely to occur
            disposeGuard = redirectGuard.start();
            if (!cancelled)
              setState({ authed: true, redirectTo, checking: false });
          } else {
            if (!cancelled) setState({ authed: false, checking: false });
          }
          return;
        }

        const res = await fetch('/api/me', { cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) setState({ authed: false, checking: false });
          return;
        }
        const data = await res.json();
        const profile = data?.profile;
        const user = data?.user;
        if (user) {
          const userRole: string | undefined = user?.role ?? undefined;
          let redirectTo = '/profile';
          try {
            redirectTo = redirectToDashboard(profile, userRole);
          } catch {
            redirectTo = '/profile';
          }
          disposeGuard = redirectGuard.start();
          if (!cancelled)
            setState({ authed: true, redirectTo, checking: false });
        } else {
          if (!cancelled) setState({ authed: false, checking: false });
        }
      } catch (e: any) {
        if (!cancelled)
          setState({
            authed: false,
            checking: false,
            error: e?.message || 'Session check failed',
          });
      }
    })();
    return () => {
      cancelled = true;
      if (disposeGuard) {
        try {
          disposeGuard();
        } catch {}
      }
    };
  }, []);

  return state;
}
