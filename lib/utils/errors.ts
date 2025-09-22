// Centralized error utilities for auth/session flows
// - Error codes and categories
// - User-friendly messages
// - Recovery suggestions
// - Structured logging helpers

export type ErrorCode =
  | 'INVALID_PHONE'
  | 'USER_NOT_FOUND'
  | 'INVALID_PASSWORD'
  | 'SESSION_EXPIRED'
  | 'SESSION_NOT_FOUND'
  | 'INVALID_TOKEN_FORMAT'
  | 'MISSING_TOKEN'
  | 'PROFILE_FETCH_FAILED'
  | 'SESSION_CREATE_FAILED'
  | 'NETWORK_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';

export type ErrorCategory =
  | 'auth'
  | 'session'
  | 'network'
  | 'client'
  | 'server'
  | 'unknown';

export class AuthError extends Error {
  code: ErrorCode;
  category: ErrorCategory;
  status?: number;
  context?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message?: string,
    options?: {
      status?: number;
      category?: ErrorCategory;
      context?: Record<string, unknown>;
    },
  ) {
    super(message || code);
    this.name = 'AuthError';
    this.code = code;
    this.category = options?.category || inferCategoryFromCode(code);
    this.status = options?.status;
    this.context = options?.context;
  }
}

export function inferCategoryFromCode(code: ErrorCode): ErrorCategory {
  switch (code) {
    case 'INVALID_PHONE':
    case 'USER_NOT_FOUND':
    case 'INVALID_PASSWORD':
      return 'auth';
    case 'SESSION_EXPIRED':
    case 'SESSION_NOT_FOUND':
    case 'INVALID_TOKEN_FORMAT':
    case 'MISSING_TOKEN':
      return 'session';
    case 'NETWORK_ERROR':
      return 'network';
    case 'SERVER_ERROR':
      return 'server';
    default:
      return 'unknown';
  }
}

export function categorizeError(err: unknown): AuthError {
  if (err instanceof AuthError) return err;
  const msg = (err as any)?.message || String(err);
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return new AuthError(
      'NETWORK_ERROR',
      'You appear to be offline. Please check your connection.',
      {
        category: 'network',
      },
    );
  }
  if (msg?.toLowerCase?.().includes('network')) {
    return new AuthError('NETWORK_ERROR', 'Network error. Please try again.', {
      category: 'network',
    });
  }
  return new AuthError(
    'UNKNOWN_ERROR',
    msg || 'An unexpected error occurred.',
    { category: 'unknown' },
  );
}

export function getUserFriendlyMessage(err: AuthError): string {
  switch (err.code) {
    case 'INVALID_PHONE':
      return 'Please enter a valid 10-digit mobile number.';
    case 'USER_NOT_FOUND':
      return 'We couldn’t find an account for this number. You can register to create one.';
    case 'INVALID_PASSWORD':
      return 'That password doesn’t look right. Please try again.';
    case 'SESSION_EXPIRED':
      return 'Your session expired. Please login again.';
    case 'MISSING_TOKEN':
      return 'Login required. Please sign in again.';
    case 'INVALID_TOKEN_FORMAT':
      return 'Your session is invalid. Please login again.';
    case 'SESSION_NOT_FOUND':
      return 'No active session found. Please login again.';
    case 'PROFILE_FETCH_FAILED':
      return 'We had trouble loading your profile. Try again.';
    case 'SESSION_CREATE_FAILED':
      return 'We couldn’t start a session. Please try again.';
    case 'NETWORK_ERROR':
      return 'Connection issue. Please check your internet and try again.';
    case 'UNAUTHORIZED':
      return 'You are not authorized. Please login again.';
    case 'FORBIDDEN':
      return 'Access denied. Please retry or contact support if this persists.';
    case 'NOT_FOUND':
      return 'Not found. Please retry.';
    case 'SERVER_ERROR':
      return 'Server error. Please try again later.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export type RecoveryAction =
  | { type: 'retry'; label?: string }
  | { type: 'relogin'; label?: string }
  | { type: 'clear-session'; label?: string; url?: string }
  | { type: 'register'; label?: string; url?: string };

export function getRecoveryActions(err: AuthError): RecoveryAction[] {
  switch (err.category) {
    case 'network':
      return [{ type: 'retry', label: 'Retry' }];
    case 'auth':
      if (err.code === 'USER_NOT_FOUND')
        return [{ type: 'register', label: 'Register', url: '/auth/register' }];
      return [{ type: 'relogin', label: 'Login' }];
    case 'session':
      return [
        {
          type: 'clear-session',
          label: 'Clear Session',
          url: '/api/session/clear',
        },
        { type: 'relogin', label: 'Login' },
      ];
    case 'server':
      return [{ type: 'retry', label: 'Try Again' }];
    default:
      return [{ type: 'retry', label: 'Try Again' }];
  }
}

export function logError(
  scope: string,
  err: unknown,
  context?: Record<string, unknown>,
) {
  const base = { scope, ...(context || {}) };
  if (err instanceof AuthError) {
    console.error(`[${scope}]`, {
      code: err.code,
      category: err.category,
      status: err.status,
      message: err.message,
      context: err.context,
      ...base,
    });
  } else {
    const msg = (err as any)?.message || String(err);
    console.error(`[${scope}]`, {
      code: 'UNKNOWN_ERROR',
      message: msg,
      ...base,
    });
  }
}

export function buildBackoff(attempt: number): number {
  // Exponential backoff with jitter: base 500ms, cap 8s
  const base = 500 * Math.pow(2, Math.min(attempt, 4));
  const jitter = Math.floor(Math.random() * 200);
  return Math.min(base + jitter, 8000);
}
