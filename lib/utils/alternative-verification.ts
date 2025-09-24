export type VerificationMethod = 'sms' | 'whatsapp' | 'email' | 'manual';

export function getAvailableAlternatives(): VerificationMethod[] {
  // Placeholder: In future, check feature flags/config/user email presence, etc.
  return ['sms'];
}

export function preferMethod(method: VerificationMethod) {
  try {
    localStorage.setItem('preferredVerification', method);
  } catch {}
}

export function getPreferredMethod(): VerificationMethod | null {
  try {
    return (
      (localStorage.getItem('preferredVerification') as VerificationMethod) ||
      null
    );
  } catch {
    return null;
  }
}

export function getServiceHealth(): Record<
  VerificationMethod,
  'up' | 'down' | 'unknown'
> {
  // Placeholder: Could be fed by a health endpoint in the future.
  return {
    sms: 'unknown',
    whatsapp: 'unknown',
    email: 'unknown',
    manual: 'unknown',
  };
}

export function describeAlternative(method: VerificationMethod): string {
  switch (method) {
    case 'whatsapp':
      return 'Verify via WhatsApp (coming soon)';
    case 'email':
      return 'Verify via email (coming soon)';
    case 'manual':
      return 'Contact support for manual verification (coming soon)';
    default:
      return 'Verify via SMS';
  }
}
