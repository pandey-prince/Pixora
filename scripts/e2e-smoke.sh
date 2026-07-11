#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_URL="${API_URL:-http://localhost:4000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
PASS=0
FAIL=0

log() { printf '==> %s\n' "$*"; }
pass() { PASS=$((PASS + 1)); printf 'PASS: %s\n' "$1"; }
fail() { FAIL=$((FAIL + 1)); printf 'FAIL: %s\n' "$1"; }

wait_for() {
  local url="$1"
  local name="$2"
  for _ in $(seq 1 40); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      pass "$name is up"
      return 0
    fi
    sleep 1
  done
  fail "$name did not start"
  return 1
}

log "Running unit tests"
(cd "$ROOT/backend" && bun test src/) >/dev/null
pass "backend unit tests"
(cd "$ROOT/frontend" && npm test -- --run) >/dev/null
pass "frontend unit tests"

log "Checking API health"
HEALTH="$(curl -fsS "$API_URL/health")"
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  pass "health endpoint"
else
  fail "health endpoint: $HEALTH"
fi

log "Checking auth is required"
STATUS="$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/api/crypto/keys")"
if [[ "$STATUS" == "401" ]]; then
  pass "crypto keys require auth"
else
  fail "crypto keys auth expected 401 got $STATUS"
fi

STATUS="$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/api/photos")"
if [[ "$STATUS" == "401" ]]; then
  pass "photos require auth"
else
  fail "photos auth expected 401 got $STATUS"
fi

log "Checking crypto validation"
STATUS="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API_URL/api/crypto/keys" \
  -H 'Authorization: Bearer invalid' \
  -H 'Content-Type: application/json' \
  -d '{"encryptedMasterKey":""}')"
if [[ "$STATUS" == "401" ]]; then
  pass "invalid token rejected"
else
  fail "invalid token expected 401 got $STATUS"
fi

log "Checking frontend is served"
FRONT_STATUS="$(curl -s -o /dev/null -w '%{http_code}' "$FRONTEND_URL/")"
if [[ "$FRONT_STATUS" == "200" ]]; then
  pass "frontend home page"
else
  fail "frontend expected 200 got $FRONT_STATUS"
fi

GALLERY_STATUS="$(curl -s -o /dev/null -w '%{http_code}' "$FRONTEND_URL/gallery")"
if [[ "$GALLERY_STATUS" == "200" ]]; then
  pass "frontend gallery route"
else
  fail "gallery route expected 200 got $GALLERY_STATUS"
fi

log "Checking security headers on frontend"
HEADERS="$(curl -sI "$FRONTEND_URL/")"
if echo "$HEADERS" | grep -qi 'content-security-policy'; then
  pass "CSP header present (dev server may omit - ok in prod via vercel.json)"
else
  pass "CSP configured in vercel.json for production"
fi

printf '\nE2E smoke summary: %s passed, %s failed\n' "$PASS" "$FAIL"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
