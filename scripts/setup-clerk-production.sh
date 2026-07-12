#!/usr/bin/env bash
# Configure Clerk for Pixora production domains via Backend API.
# Requires CLERK_SECRET_KEY in the environment (dev or live secret works).
set -euo pipefail

if [[ -z "${CLERK_SECRET_KEY:-}" ]]; then
  echo "Set CLERK_SECRET_KEY before running." >&2
  exit 1
fi

API="https://api.clerk.com/v1"

echo "→ Updating Clerk allowed_origins..."
curl -fsS -X PATCH "${API}/instance" \
  -H "Authorization: Bearer ${CLERK_SECRET_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"allowed_origins":["https://pixora-gallery.online","https://www.pixora-gallery.online","https://pixora-photogallery.vercel.app","http://localhost:5173"]}'

echo ""
echo "→ Ensuring redirect URLs..."
for url in \
  "https://pixora-gallery.online" \
  "https://www.pixora-gallery.online" \
  "https://pixora-photogallery.vercel.app"
do
  if curl -fsS "${API}/redirect_urls" -H "Authorization: Bearer ${CLERK_SECRET_KEY}" | grep -q "\"${url}\""; then
    echo "  ✓ redirect already set: ${url}"
  else
    curl -fsS -X POST "${API}/redirect_urls" \
      -H "Authorization: Bearer ${CLERK_SECRET_KEY}" \
      -H "Content-Type: application/json" \
      -d "{\"url\":\"${url}\"}" >/dev/null
    echo "  ✓ redirect added: ${url}"
  fi
done

echo ""
echo "Clerk instance:"
curl -fsS "${API}/instance" -H "Authorization: Bearer ${CLERK_SECRET_KEY}"

echo ""
echo "Next steps (Clerk Dashboard):"
echo "  1. Create Production instance and copy pk_live_ / sk_live_ / whsec_ keys"
echo "  2. Vercel (pixora):  VITE_CLERK_PUBLISHABLE_KEY=pk_live_..."
echo "  3. Render (backend): CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY, WEBHOOK_SECRET"
echo "  4. Clerk webhook: https://pixora-4nya.onrender.com/clerk/webhook"
