
"use client";
import { ReactNode } from 'react';
import { useMe } from '@/components/providers/me-provider';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isOnboarding = pathname.startsWith('/onboarding');
  const { me, loading, redirecting, refresh, error, errorCode, recovery } = useMe();

  if (!isOnboarding && !error && (loading || redirecting)) {
    return (
      <div className="min-h-screen grid place-items-center px-4 text-center">
        <div className="w-full max-w-md bg-white rounded-xl p-6 text-black shadow">
          <div className="font-semibold">Loading your dashboard…</div>
        </div>
      </div>
    );
  }

  if (!isOnboarding && !loading && error) {
    return (
      <div className="min-h-screen grid place-items-center px-4 text-center">
        <div className="w-full max-w-md bg-white rounded-xl p-6 text-black shadow space-y-3">
          <div role="alert" className="text-sm text-red-600 font-medium">{typeof error === 'string' ? error : String(error)}</div>
          {process.env.NODE_ENV !== 'production' && (
            <div className="text-xs text-gray-500">{errorCode ? `Code: ${errorCode}` : null}</div>
          )}
          <div className="flex gap-2 justify-center flex-wrap">
            {(recovery && recovery.length > 0 ? recovery : [{ type: 'retry', label: 'Try Again' }]).map((act, idx) => {
              const label = act.label || (act.type === 'retry' ? 'Try Again' : act.type === 'relogin' ? 'Login' : act.type === 'clear-session' ? 'Clear Session' : act.type === 'register' ? 'Register' : 'Action');
              if (act.type === 'retry') {
                return <Button key={idx} onClick={() => refresh()}>{label}</Button>;
              } else if (act.type === 'relogin') {
                return <Button key={idx} variant="outline" onClick={() => (window.location.href = '/auth/login')}>{label}</Button>;
              } else if (act.type === 'clear-session') {
                return <Button key={idx} variant="outline" onClick={async () => { try { await fetch('/api/session/clear', { method: 'POST' }); } catch {}; window.location.href = '/auth/login'; }}>{label}</Button>;
              } else if (act.type === 'register') {
                return <Button key={idx} variant="outline" onClick={() => (window.location.href = act.url || '/auth/register')}>{label}</Button>;
              }
              return null;
            })}
            {process.env.NODE_ENV !== 'production' && (
              <Button
                variant="ghost"
                onClick={() => {
                  const ts = new Date().toISOString();
                  const subject = encodeURIComponent('Rojgar: Dashboard Error Report');
                  const body = encodeURIComponent(`Path: ${pathname}\nCode: ${errorCode || 'UNKNOWN'}\nTime: ${ts}`);
                  window.location.href = `mailto:support@traycer.ai?subject=${subject}&body=${body}`;
                }}
              >
                Report issue
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!isOnboarding && !loading && !me?.user) {
    return (
      <div className="min-h-screen grid place-items-center px-4 text-center">
        <div className="w-full max-w-md bg-white rounded-xl p-6 text-black shadow">
          <div>Still waiting? Try <a href="/auth/login" className="underline">logging in</a> again.</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
