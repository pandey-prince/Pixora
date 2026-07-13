#!/usr/bin/env bash
# Start script for Render free tier (no pre-deploy). Migrate then serve.
set -euo pipefail
cd "$(dirname "$0")/.."
bash scripts/migrate-deploy.sh
exec bun src/server.ts
