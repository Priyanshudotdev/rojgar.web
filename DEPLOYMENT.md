# Deployment Guide: Twilio SMS for OTP (Convex)

This project uses Convex actions in `convex/auth.ts` to send OTPs via Twilio. In production, Twilio credentials must be configured in the Convex environment or OTP requests will fail with `SERVER_ERROR`.

The `requestOtp` action reads these environment variables:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

If these are missing in production, the action will not send SMS and will throw an error (by design). In development, a safe fallback returns a debug OTP code.

## 1) Twilio Account Setup

1. Create a Twilio account: https://www.twilio.com/
2. From the Twilio Console, note your:
   - Account SID (starts with `AC`)
   - Auth Token
3. Purchase or select a phone number capable of SMS. Copy it in E.164 format, e.g. `+15551234567`.

## 2) Configure Convex Environment Variables

You can configure environment variables via the Convex Dashboard or CLI.

### Dashboard
1. Open your Convex Dashboard for the project.
2. Go to Environment Variables.
3. Add the following keys and values:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_FROM_NUMBER`
4. Deploy or restart as required by your workflow.

### CLI

Prerequisites: Node.js and the Convex CLI (we use `npx convex ...` which works without a global install).

Run the following in the repository root:

```powershell
npx convex env set TWILIO_ACCOUNT_SID "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
npx convex env set TWILIO_AUTH_TOKEN "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
npx convex env set TWILIO_FROM_NUMBER "+15551234567"
```

Verify they are set:

```powershell
npx convex env list
```

You should see the three variables present (values usually hidden/masked).

### Option C: Helper Script

If you prefer an interactive setup, use the helper script:

```bash
chmod +x scripts/setup-twilio.sh
./scripts/setup-twilio.sh
```

This script prompts for your Account SID, Auth Token, and From Number, then runs `npx convex env set` for each and verifies with `npx convex env list`.

Note: On Windows, run this in Git Bash or WSL. Alternatively, copy the `npx convex env set` commands above into PowerShell and run them directly.

## 3) Verify the Setup

Option A: Use the provided helper script:

```powershell
node scripts/test-otp.js "+15551234567"
```

- Requires that your Convex dev server is running locally or your `CONVEX_URL` is configured (see script).
- On success, in production you should not see the OTP code, just an OK response. In development, the action may return `{ dev: true, debugCode: "123456" }`.

Option B: Through the app’s onboarding/login flow that triggers OTP.

## 4) Development vs Production Behavior

- Development: If Twilio env vars are missing or Twilio API fails, `requestOtp` logs and returns `{ ok: true, dev: true, debugCode }` so you can proceed without SMS.
- Production: Missing or failing Twilio configuration results in `SERVER_ERROR`. No debug codes are returned in production for security reasons.

## 5) Troubleshooting

- Error: `SERVER_ERROR` from `requestOtp` in production
  - Ensure all three env vars are set in Convex and not empty.
  - Verify `TWILIO_FROM_NUMBER` matches a number on your Twilio account with SMS capability and correct E.164 formatting.
  - Confirm your environment truly has `NODE_ENV=production` only when credentials are present.
- Twilio API returns 400/401/403
  - Double-check Account SID/Auth Token and number permissions. Review Twilio Console logs.
- Messages not delivered
  - Check Twilio delivery status and whether the destination number supports SMS. Some regions or DND may block messages.
- Local testing
  - Use development mode fallback or run the `scripts/test-otp.js` script to exercise the action without full UI.

## 6) Security Notes

- Never commit real Twilio credentials to version control. Use `.env.example` as documentation only.
- Treat `TWILIO_AUTH_TOKEN` like a password. Rotate immediately if exposed.
- Make sure CI/CD and hosting environments store these values securely (secrets manager).

## References

- Implementation: `convex/auth.ts` (`requestOtp` action)
- Convex Environment Variables: https://docs.convex.dev/production/environment-variables
- Twilio REST API: https://www.twilio.com/docs/sms/api/message-resource#create-a-message-resource
