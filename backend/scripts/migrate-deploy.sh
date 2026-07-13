#!/usr/bin/env bash
# Prisma Migrate needs a direct Postgres connection (session advisory locks).
# Neon's pooler (-pooler hostname) cannot acquire pg_advisory_lock, causing P1002.
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -n "${DIRECT_URL:-}" ]]; then
  export DATABASE_URL="$DIRECT_URL"
elif [[ "${DATABASE_URL:-}" == *"-pooler"* ]]; then
  export DATABASE_URL="${DATABASE_URL//-pooler/}"
  echo "migrate-deploy: using direct Neon URL (removed -pooler from DATABASE_URL)"
fi

# Pre-deploy runs once per Render release (paid plans only). On Render free tier,
# migrations run from scripts/start-render.sh at container start instead.
export PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK="${PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK:-1}"

max_attempts=3
for attempt in $(seq 1 "$max_attempts"); do
  if bunx prisma migrate deploy; then
    exit 0
  fi
  if [[ "$attempt" -lt "$max_attempts" ]]; then
    echo "migrate-deploy: attempt $attempt failed, retrying in 5s..."
    sleep 5
  fi
done

echo "migrate-deploy: failed after $max_attempts attempts" >&2
exit 1
