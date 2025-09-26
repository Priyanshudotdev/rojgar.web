'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Diamond, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import Logo from '@/components/ui/logo';
import { useAction, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import TopNav from '@/components/ui/top-nav';
import { getDashboardPathByRole } from '@/lib/auth/clientRedirect';
import { toast } from '@/hooks/use-toast';
import { OtpErrorAlert } from '@/components/ui/otp-error-alert';
import { mapErrorToFormField, showOtpErrorToast, withRetry, getServiceStatus, getDebugOtp, storeDebugOtp, createAutoFillHandler, isFakeOtpResponse } from '@/lib/utils/otp-error-handler';
import { FakeOtpDisplay } from '@/components/ui/fake-otp-display';
import { categorizeError, getUserFriendlyMessage } from '@/lib/utils/errors';
import { getAvailableAlternatives, describeAlternative } from '@/lib/utils/alternative-verification';

export default function OTPVerification() {
  const [otp, setOTP] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [serviceDown, setServiceDown] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const verifyOtp = useAction(api.auth.verifyOtp);
  const requestOtp = useAction(api.auth.requestOtp);
  const createSession = useMutation(api.auth.createSession);
  const router = useRouter();

  useEffect(() => {
    const phone = localStorage.getItem('phoneNumber');
    if (phone) setPhoneNumber(phone);
    try {
      const dbg = getDebugOtp();
      if (dbg) setDebugOtp(dbg);
    } catch {}
    return () => {
      // Optional: clear debug OTP when leaving the screen if not verified yet
      // localStorage.removeItem('debugOtp');
    };
  }, []);

  // Resend OTP with cooldown
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (!phoneNumber) { setError('Please re-enter your mobile number.'); return; }
    if (resending || cooldown > 0) return;
    setError('');
    setResending(true);
    setServiceDown(false);
    try {
      const flow = (localStorage.getItem('authFlow') || 'login') as 'login' | 'register';
      const res = await withRetry(() => requestOtp({ phone: phoneNumber, purpose: flow }), 3);
      if (isFakeOtpResponse(res)) {
        setDebugOtp((res as any).debugCode);
        storeDebugOtp((res as any).debugCode);
      }
      setServiceDown(false);
      setCooldown(30);
    } catch (e: any) {
      const field = mapErrorToFormField(e);
      if (field) setError(getUserFriendlyMessage(categorizeError(e)));
      const status = getServiceStatus(e);
      setServiceDown(Boolean(status?.unavailable));
      showOtpErrorToast(e, { onRetry: handleResend });
    } finally {
      setResending(false);
    }
  };

  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6 || verifying) return;
    if (!phoneNumber) {
      setError('Session expired. Please start again.');
      return;
    }
    try {
      setError('');
      setVerifying(true);
      setServiceDown(false);

      const onboardingData = JSON.parse(localStorage.getItem('onboardingData') || 'null');
      const roleFromStorage = localStorage.getItem('userRole') as 'job-seeker' | 'company' | null;
      const role = roleFromStorage ?? undefined;

  const result = await withRetry(() => verifyOtp({ phone: phoneNumber, code: otp, role, onboardingData }), 3);

      if (result.userId) {
        localStorage.setItem('verifiedUserId', result.userId as unknown as string);
        if (result.newlyCreated) {
          try { localStorage.setItem('newUser', '1'); } catch {}
        }
        try { localStorage.removeItem('debugOtp'); } catch {}
        try { localStorage.setItem('passwordMode', 'set'); } catch {}
        router.replace(`/auth/register/password?isNew=${result.newlyCreated ? 'true' : 'false'}`);
      } else {
        setError('Failed to verify OTP. Please try again.');
      }
    } catch (e: any) {
      const field = mapErrorToFormField(e);
      if (field) setError(getUserFriendlyMessage(categorizeError(e)));
      const status = getServiceStatus(e);
      setServiceDown(Boolean(status?.unavailable));
      showOtpErrorToast(e, { onRetry: handleVerify });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="h-screen flex flex-col text-white">
      <TopNav title="Verify" />
      <div className="px-6 pt-6 flex items-center gap-x-2 mb-6">
        <Logo />
        <h1 className="text-2xl font-bold">Rojgar</h1>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Enter OTP</h2>
          <p className="text-white/80">
            We&apos;ve sent a 6-digit code to +91 {phoneNumber}
          </p>
        </div>

        <div className="mb-8 space-y-4">
          <InputOTP maxLength={6} value={otp} onChange={(val) => { setOTP((val || '').slice(0, 6)); setServiceDown(false); setError(''); }}>
            <InputOTPGroup>
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot key={i} index={i} className="bg-white/10 border border-white/20 text-white" />
              ))}
            </InputOTPGroup>
          </InputOTP>
          {debugOtp && (
            <FakeOtpDisplay
              code={debugOtp}
              onAutofill={createAutoFillHandler((val) => setOTP(val))}
            />
          )}
        </div>

        <Button
          onClick={handleVerify}
          disabled={otp.length !== 6 || verifying}
          className="w-full bg-white text-green-600 hover:bg-gray-100 font-semibold py-3 mb-6 flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {verifying && <Loader2 className="animate-spin w-5 h-5" />}
          {verifying ? 'Verifying...' : 'Verify OTP'}
        </Button>

        <div className="text-center">
          <p className="text-sm opacity-75 mb-2">Didn&apos;t receive the code?</p>
          <Button
            variant="link"
            className="text-white underline p-0 flex items-center gap-2 disabled:opacity-70"
            onClick={handleResend}
            disabled={resending || cooldown > 0 || verifying}
          >
            {resending && <Loader2 className="w-4 h-4 animate-spin" />}
            {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Sending...' : 'Resend OTP'}
          </Button>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          {serviceDown && (
            <div className="mt-4">
              <OtpErrorAlert
                onRetry={handleResend}
                onDismiss={() => setServiceDown(false)}
                alternatives={getAvailableAlternatives()
                  .filter((m) => m !== 'sms')
                  .map((m) => ({ label: describeAlternative(m), onClick: () => {} }))}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}