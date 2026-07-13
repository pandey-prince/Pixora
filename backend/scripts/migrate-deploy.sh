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

bunx prisma migrate deploy
