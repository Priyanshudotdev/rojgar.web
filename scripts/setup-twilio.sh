#!/usr/bin/env bash
set -euo pipefail

# Setup Twilio env vars in Convex via CLI
# Usage: ./scripts/setup-twilio.sh

read -r -p "Enter Twilio Account SID (starts with AC): " TWILIO_ACCOUNT_SID
read -r -s -p "Enter Twilio Auth Token (input hidden): " TWILIO_AUTH_TOKEN; echo
read -r -p "Enter Twilio From Number in E.164 format (e.g. +15551234567): " TWILIO_FROM_NUMBER

# Basic validations
if [[ -z "$TWILIO_ACCOUNT_SID" || ! "$TWILIO_ACCOUNT_SID" =~ ^AC[0-9a-fA-F]{32}$ ]]; then
  echo "Error: Account SID must start with 'AC' and be 34 chars total." >&2
  exit 1
fi
if [[ -z "$TWILIO_AUTH_TOKEN" || ${#TWILIO_AUTH_TOKEN} -lt 16 ]]; then
  echo "Error: Auth Token looks too short. Please double-check." >&2
  exit 1
fi
if [[ -z "$TWILIO_FROM_NUMBER" || ! "$TWILIO_FROM_NUMBER" =~ ^\+[1-9][0-9]{7,14}$ ]]; then
  echo "Error: From Number must be in E.164 format, e.g. +15551234567." >&2
  exit 1
fi

cat <<'MSG'
Setting Convex environment variables...
Note: This uses `npx convex env set` and may prompt to install dependencies.
MSG

npx convex env set TWILIO_ACCOUNT_SID "$TWILIO_ACCOUNT_SID"
npx convex env set TWILIO_AUTH_TOKEN "$TWILIO_AUTH_TOKEN"
npx convex env set TWILIO_FROM_NUMBER "$TWILIO_FROM_NUMBER"

echo "\nVerifying configured environment variables:" 
 npx convex env list

echo "\nDone. Keep your credentials private. Rotate your Auth Token if compromised."
