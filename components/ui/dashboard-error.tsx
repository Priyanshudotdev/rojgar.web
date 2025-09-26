"use client";
import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { Button } from './button';
import { inspectSessionCookie } from '@/lib/utils/session-debug';

export type RecoveryAction = { type: string; label?: string; url?: string };

type AutoRetryConfig = {
  enabled: boolean;
  maxAttempts?: number; // default 3
  baseDelayMs?: number; // default 800
};

type DashboardErrorProps = {
  message: string | null | undefined;
  code?: string | null;
  recovery?: RecoveryAction[];
  onRetry?: () => void;
  className?: string;
  variant?: 'default' | 'company';
  autoRetry?: AutoRetryConfig;
};

export const DashboardError: React.FC<DashboardErrorProps> = ({
  message,
  code,
  recovery,
  onRetry,
  className,
  variant = 'default',
  autoRetry,
}) => {
  const acts = (recovery && recovery.length > 0 ? recovery : [{ type: 'retry', label: 'Try Again' }]) as RecoveryAction[];
  const [ts] = useState(() => new Date().toISOString());
  const [debug, setDebug] = useState<any | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [nextIn, setNextIn] = useState<number | null>(null);
  const stopRef = React.useRef(false);

  useEffect(() => { stopRef.current = false; return () => { stopRef.current = true; }; }, []);

  useEffect(() => {
    if (!autoRetry?.enabled) return;
    if (!(code === 'NETWORK_ERROR' || code === 'SERVER_ERROR' || code === 'TIMEOUT')) return;
    const max = autoRetry.maxAttempts ?? 3;
    if (attempt >= max) return;
    const base = autoRetry.baseDelayMs ?? 800;
    const delay = Math.round(base * Math.pow(1.8, attempt) * (0.8 + Math.random() * 0.4));
    setNextIn(Math.floor(delay / 1000));
    let remaining = Math.floor(delay / 1000);
    const tick = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(tick);
      }
      setNextIn(remaining > 0 ? remaining : 0);
    }, 1000);
    const t = setTimeout(() => {
      if (stopRef.current) return;
      setAttempt(a => a + 1);
      onRetry?.();
    }, delay);
    return () => { clearInterval(tick); clearTimeout(t); };
  }, [attempt, autoRetry, code, onRetry]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      try { setDebug(inspectSessionCookie()); } catch {}
    }
  }, []);

  const containerClasses = variant === 'company'
    ? 'w-full max-w-md h-full bg-white relative overflow-hidden'
    : 'w-full max-w-md bg-white rounded-xl p-6 text-black shadow';

  return (
    <div className={variant === 'company' ? 'h-screen bg-gray-100 flex justify-center items-center' : 'min-h-screen grid place-items-center px-4 text-center'}>
      <div className={containerClasses}>
        <div className={variant === 'company' ? 'p-6 space-y-4' : 'space-y-4'}>
          <Alert variant="default" className="text-left">
            <AlertTitle>{code === 'NETWORK_ERROR' || code === 'TIMEOUT' ? 'Loading...' : 'Dashboard Loading...'}</AlertTitle>
            {/* <AlertDescription>
              <span className="block text-sm font-medium mb-1">{message || (code === 'NETWORK_ERROR' ? 'We’re having trouble reaching the server.' : 'An unexpected error occurred.')}</span>
              {code && <span className="text-xs text-gray-600">Code: {code}</span>}
            </AlertDescription> */}
          </Alert>
          <div className="flex gap-2 flex-wrap justify-center pt-1">
            {autoRetry?.enabled && nextIn !== null && attempt < (autoRetry.maxAttempts ?? 3) && (
              <span className="text-[10px] text-gray-500 px-2 py-1 border rounded">Auto retry in {nextIn}s (#{attempt + 1}/{autoRetry.maxAttempts ?? 3})</span>
            )}
            {acts.map((act, idx) => {
              const label = act.label || (act.type === 'retry' ? 'Try Again' : act.type === 'relogin' ? 'Login' : act.type === 'clear-session' ? 'Clear Session' : act.type === 'register' ? 'Register' : 'Action');
              if (act.type === 'retry') return <Button key={idx} onClick={() => onRetry?.()}>{label}</Button>;
              if (act.type === 'relogin') return <Button key={idx} variant="outline" onClick={() => (window.location.href = '/auth/login')}>{label}</Button>;
              if (act.type === 'clear-session') return <Button key={idx} variant="outline" onClick={async () => { try { await fetch('/api/session/clear', { method: 'POST' }); } catch {}; window.location.href = '/auth/login'; }}>{label}</Button>;
              if (act.type === 'register') return <Button key={idx} variant="outline" onClick={() => (window.location.href = act.url || '/auth/register')}>{label}</Button>;
              return null;
            })}
            {process.env.NODE_ENV !== 'production' && (
              <Button
                variant="ghost"
                onClick={() => {
                  const subject = encodeURIComponent('Rojgar: Dashboard Error Report');
                  const body = encodeURIComponent(`Code: ${code || 'UNKNOWN'}\nTime: ${ts}\nCookie: ${(debug && debug.masked) || 'none'}`);
                  window.location.href = `mailto:support@traycer.ai?subject=${subject}&body=${body}`;
                }}
              >Report issue</Button>
            )}
          </div>
          {process.env.NODE_ENV !== 'production' && (
            <details className="text-xs text-gray-500 pt-2"><summary className="cursor-pointer select-none">Technical details</summary>
              <div className="pt-2 space-y-1">
                <div>Timestamp: {ts}</div>
                <div>Cookie: {(debug && debug.masked) || 'none'}</div>
                <div>Present: {String(debug?.present)}</div>
                <div>TokenLen: {debug?.length || 0}</div>
                {autoRetry?.enabled && <div>AutoRetry attempt={attempt}</div>}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardError;
