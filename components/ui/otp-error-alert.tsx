"use client";

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type Alternative = { label: string; onClick: () => void };

export function OtpErrorAlert({
  visible = true,
  title = 'OTP Service Unavailable',
  message = 'We are having trouble sending codes right now. You can retry or choose an alternative verification method.',
  onRetry,
  onDismiss,
  alternatives = [],
}: {
  visible?: boolean;
  title?: string;
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  alternatives?: Alternative[];
}) {
  if (!visible) return null;
  return (
    <Alert variant="destructive" className="mt-3">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <div className="space-y-3">
          <p>{message}</p>
          <div className="flex flex-wrap gap-2">
            {onRetry && (
              <Button size="sm" onClick={onRetry} className="bg-white text-red-600 hover:bg-gray-100">
                Retry
              </Button>
            )}
            {alternatives.map((alt, idx) => (
              <Button key={idx} variant="outline" size="sm" onClick={alt.onClick}>
                {alt.label}
              </Button>
            ))}
            {onDismiss && (
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
