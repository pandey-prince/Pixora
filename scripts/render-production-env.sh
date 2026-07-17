#!/usr/bin/env bash
# Print Render production env values from Clerk production keys.
# Paste these into Render Dashboard → pixora backend → Environment → Save & Deploy
set -euo pipefail

ENV_FILE="${1:-.env.local}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — run: npx clerk@latest env pull --instance prod" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

cat <<EOF
Update these on Render (https://dashboard.render.com):

CLERK_SECRET_KEY=${CLERK_SECRET_KEY}
CLERK_PUBLISHABLE_KEY=${CLERK_PUBLISHABLE_KEY}
FRONTEND_URL=https://pixora-gallery.online

WEBHOOK_SECRET=<from Clerk Production → Webhooks → pixora-2a39.onrender.com/clerk/webhook>

Clerk production webhook URL:
  https://pixora-2a39.onrender.com/clerk/webhook
  Events: user.created, user.updated, user.deleted
EOF
