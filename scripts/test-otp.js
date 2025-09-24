#!/usr/bin/env node
/*
  Test the Convex OTP flow end-to-end without full UI.
  - Verifies Twilio env vars presence by calling the Convex action.
  - In development mode, expect { ok: true, dev: true, debugCode }.
  - In production, expect { ok: true, dev: false } when Twilio is configured.

  Usage:
    node scripts/test-otp.js "+15551234567"

  Requirements:
    - Convex backend running (locally via `npx convex dev` or deployed).
    - Provide CONVEX_URL env var if not using the default project URL.
*/

// Use dynamic import to load ESM-only convex client in CJS context
let ConvexHttpClient;
async function getConvexClient() {
  if (!ConvexHttpClient) {
    ({ ConvexHttpClient } = await import('convex/browser'));
  }
  return ConvexHttpClient;
}

async function main() {
  const phone = process.argv[2];
  if (!phone) {
    console.error("Usage: node scripts/test-otp.js '+15551234567'");
    process.exit(1);
  }

  const url = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    console.error(
      'Error: Set CONVEX_URL or NEXT_PUBLIC_CONVEX_URL to your Convex deployment URL.',
    );
    process.exit(1);
  }

  const ClientCtor = await getConvexClient();
  const client = new ClientCtor(url);

  // Minimal E.164 sanity check
  if (!/^\+[1-9][0-9]{7,14}$/.test(phone)) {
    console.error('Error: Phone must be in E.164 format, e.g. +15551234567');
    process.exit(1);
  }

  console.log('Requesting OTP via Convex action...', {
    url,
    phoneMasked: phone.replace(/\d(?=\d{2})/g, '*'),
  });
  try {
    const res = await client.action('auth:requestOtp', {
      phone,
      purpose: 'diagnostic',
    });
    console.log('Response:', res);
    if (res?.dev && res?.debugCode) {
      console.log('Development mode: debug OTP:', res.debugCode);
    } else if (res?.ok) {
      console.log('OTP request succeeded.');
    } else {
      console.log('Unexpected response shape.');
    }
  } catch (err) {
    console.error('Action failed:', err?.responseJSON || err?.message || err);
    process.exit(1);
  }
}

main();
