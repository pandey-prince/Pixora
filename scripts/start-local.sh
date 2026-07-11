#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

log() { printf '==> %s\n' "$*"; }

ensure_postgres() {
  if ! sudo service postgresql status >/dev/null 2>&1; then
    log "Starting PostgreSQL"
    sudo service postgresql start
  fi

  if ! PGPASSWORD=pixora psql -h 127.0.0.1 -U pixora -d pixora -c "SELECT 1" >/dev/null 2>&1; then
    log "Creating local pixora database user/database"
    sudo -u postgres psql -c "CREATE USER pixora WITH PASSWORD 'pixora' CREATEDB;" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE DATABASE pixora OWNER pixora;" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE pixora TO pixora;" 2>/dev/null || true
  fi
}

write_backend_env() {
  if [[ -f "$ROOT/backend/.env" ]]; then
    return
  fi

  log "Creating backend/.env from example"
  cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
  sed -i 's|postgresql://user:password@host/database?sslmode=require|postgresql://pixora:pixora@127.0.0.1:5432/pixora|' "$ROOT/backend/.env"
}

write_frontend_env() {
  if [[ -f "$ROOT/frontend/.env" ]]; then
    return
  fi

  log "Creating frontend/.env from example"
  cp "$ROOT/frontend/.env.example" "$ROOT/frontend/.env"
}

install_deps() {
  log "Installing backend dependencies"
  (cd "$ROOT/backend" && bun install)

  log "Installing frontend dependencies"
  (cd "$ROOT/frontend" && npm install)
}

migrate_db() {
  log "Applying database migrations"
  (cd "$ROOT/backend" && bunx prisma generate && bunx prisma migrate deploy)
}

start_tmux_session() {
  local session="$1"
  local dir="$2"
  local cmd="$3"

  if tmux -f /exec-daemon/tmux.portal.conf has-session -t "=$session" 2>/dev/null; then
    log "Restarting tmux session: $session"
    tmux -f /exec-daemon/tmux.portal.conf kill-session -t "$session"
  fi

  tmux -f /exec-daemon/tmux.portal.conf new-session -d -s "$session" -c "$dir" -- "${SHELL:-bash}" -l
  tmux -f /exec-daemon/tmux.portal.conf send-keys -t "$session:0.0" "$cmd" C-m
}

main() {
  ensure_postgres
  write_backend_env
  write_frontend_env
  install_deps
  migrate_db

  start_tmux_session "pixora-backend-dev" "$ROOT/backend" "bun run dev"
  start_tmux_session "pixora-frontend-dev" "$ROOT/frontend" "npm run dev"

  log "Backend:  http://localhost:4000/health"
  log "Frontend: http://localhost:5173"
  log "Open the gallery at http://localhost:5173/gallery"
}

main "$@"
