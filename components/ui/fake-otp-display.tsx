"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Smartphone, Copy, Wand2 } from 'lucide-react';

export type FakeOtpDisplayProps = {
  code: string;
  onAutofill?: (code: string) => void;
  title?: string;
  description?: string;
  className?: string;
};

export function FakeOtpDisplay({
  code,
  onAutofill,
  title = 'Temporary Verification Method',
  description =
    'SMS is currently unavailable. Use this one-time code to verify your phone number. This is a temporary fallback and may be disabled at any time.',
  className,
}: FakeOtpDisplayProps) {
  const [copied, setCopied] = React.useState(false);
  const codeStr = String(code || '').slice(0, 6);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <Card
      role="status"
      aria-live="polite"
      className={
        'border-2 border-amber-500/60 bg-amber-50/60 dark:bg-amber-950/20 shadow-sm ' +
        (className || '')
      }
    >
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        </div>
        <CardDescription className="text-amber-800/80 dark:text-amber-200/80">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Smartphone className="h-6 w-6 text-amber-700 dark:text-amber-300" aria-hidden="true" />
            <div className="font-mono tracking-widest text-2xl sm:text-3xl text-amber-900 dark:text-amber-100" aria-label="One-time code">
              {codeStr.split('').map((c, idx) => (
                <span key={idx} className="inline-block w-6 sm:w-7 text-center">
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onAutofill && (
              <Button
                type="button"
                variant="secondary"
                className="border-amber-300/70 bg-white/70 hover:bg-amber-100"
                onClick={() => onAutofill?.(codeStr)}
                aria-label="Auto-fill OTP"
              >
                <Wand2 className="h-4 w-4 mr-1" /> Auto-fill
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="border-amber-300/70"
              onClick={handleCopy}
              aria-label="Copy OTP to clipboard"
            >
              <Copy className="h-4 w-4 mr-1" /> {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default FakeOtpDisplay;
