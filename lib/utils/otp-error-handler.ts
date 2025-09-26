import React from 'react';
import {
  AuthError,
  categorizeError,
  getRecoveryActions,
  getUserFriendlyMessage,
  buildBackoff,
} from '@/lib/utils/errors';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

type OtpResponse = { ok: true; dev?: boolean; debugCode?: string } | any;

type Handlers = {
  onRetry?: () => void | Promise<void>;
  onRelogin?: () => void | Promise<void>;
  onClearSession?: () => void | Promise<void>;
  onRegister?: () => void | Promise<void>;
};

export function showOtpErrorToast(err: unknown, handlers: Handlers = {}) {
  const e = categorizeError(err);
  const description = getUserFriendlyMessage(e);
  const actions = getRecoveryActions(e);
  const titleByCategory = {
    network: 'Loading...',
    server: 'Service unavailable',
    auth: 'Invalid input',
    session: 'Session issue',
    unknown: 'Something went wrong',
  } as const;
  const title = (titleByCategory as any)[e.category] || 'Something went wrong';

  // Map first actionable recovery into a ToastAction
  const primary = actions[0];
  let actionEl: React.ReactElement | undefined;
  if (primary) {
    const onClick = async () => {
      switch (primary.type) {
        case 'retry':
          await handlers.onRetry?.();
          break;
        case 'relogin':
          await handlers.onRelogin?.();
          break;
        case 'clear-session':
          await handlers.onClearSession?.();
          if (primary.url) window.location.href = primary.url;
          break;
        case 'register':
          if (primary.url) window.location.href = primary.url;
          else await handlers.onRegister?.();
          break;
        default:
          break;
      }
    };
    actionEl = React.createElement(
      ToastAction as any,
      { altText: primary.label || 'Action', onClick },
      primary.label || 'Action',
    );
  }

  toast({ title, description, action: actionEl });
}

export type OtpFormField = 'phone' | 'otp' | 'password' | null;

export function mapErrorToFormField(err: unknown): OtpFormField {
  const e = categorizeError(err);
  switch (e.code) {
    case 'INVALID_PHONE':
      return 'phone';
    case 'FORBIDDEN': // invalid code
      return 'otp';
    case 'SESSION_EXPIRED':
      return 'otp';
    case 'NOT_FOUND':
      return 'otp';
    default:
      return null;
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  let attempt = 0;
  let lastErr: any = null;
  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (e) {
      const ce = categorizeError(e);
      lastErr = ce;
      if (ce.category !== 'network' || attempt === maxRetries) {
        throw ce;
      }
      const delay = buildBackoff(attempt);
      await new Promise((res) => setTimeout(res, delay));
      attempt++;
    }
  }
  throw lastErr;
}

export function getServiceStatus(err: unknown): {
  service: 'twilio';
  unavailable: boolean;
  reason?: 'unconfigured' | 'unavailable';
} | null {
  const e = categorizeError(err);
  if (e.code === 'SERVER_ERROR') {
    // Distinguish likely reasons based on message content if present
    const msg = (e as any)?.message || '';
    const notConfigured =
      /not configured|missing credentials|credentials missing/i.test(msg);
    return {
      service: 'twilio',
      unavailable: true,
      reason: notConfigured ? 'unconfigured' : 'unavailable',
    };
  }
  return null;
}

// Fake/Debug OTP helpers
export function isFakeOtpResponse(resp: OtpResponse): boolean {
  return Boolean(
    resp && resp.ok === true && resp.dev === true && resp.debugCode,
  );
}

export function storeDebugOtp(
  code: string,
  meta?: {
    reason?: 'unconfigured' | 'unavailable' | 'development';
    at?: number;
  },
) {
  try {
    if (typeof window === 'undefined') return;
    const payload = {
      code,
      at: meta?.at ?? Date.now(),
      reason: meta?.reason ?? 'development',
    };
    localStorage.setItem('debugOtp', JSON.stringify(payload));
  } catch {}
}
export function getDebugOtp(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('debugOtp');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed?.code || null;
    } catch {
      return raw; // legacy plain string
    }
  } catch {
    return null;
  }
}
export function clearDebugOtp() {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('debugOtp');
  } catch {}
}

export function getFakeOtpStatus():
  | {
      active: true;
      code: string;
      reason: 'unconfigured' | 'unavailable' | 'development';
      at: number;
    }
  | { active: false } {
  try {
    if (typeof window === 'undefined') return { active: false };
    const raw = localStorage.getItem('debugOtp');
    if (!raw) return { active: false };
    const parsed = (() => {
      try {
        return JSON.parse(raw);
      } catch {
        return { code: raw, at: Date.now(), reason: 'development' as const };
      }
    })();
    const code = parsed?.code || null;
    if (!code) return { active: false };
    return {
      active: true,
      code,
      reason: (parsed?.reason as any) || 'development',
      at: Number(parsed?.at) || Date.now(),
    };
  } catch {
    return { active: false };
  }
}

export function createAutoFillHandler(setter: (val: string) => void) {
  return (code: string) => {
    if (typeof code !== 'string') return;
    const c = code.trim().slice(0, 6);
    if (!/^\d{6}$/.test(c)) return;
    setter(c);
  };
}
