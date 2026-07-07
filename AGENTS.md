# AGENTS.md

## Cursor Cloud specific instructions

Pixora is a two-service app: a Bun/Express/Prisma backend (`backend/`, port `4000`) and a
React/Vite frontend (`frontend/`, port `5173`). It normally relies on three external services:
PostgreSQL (Neon in prod), Clerk (auth), and Cloudinary (image storage). Standard commands live in
`README.md`, `backend/package.json`, and `frontend/package.json` — refer to those; only the
non-obvious cloud caveats are captured below.

### Local service substitutes
- A **local PostgreSQL 16** server replaces Neon. It is created in setup with role/db `pixora`
  (password `pixora`) and the schema is migrated. The connection string is in `backend/.env`
  (`postgresql://pixora:pixora@127.0.0.1:5432/pixora`).
- **Clerk** and **Cloudinary** have no local substitute. `backend/.env` and `frontend/.env`
  contain placeholder keys so both servers boot and the marketing pages render, but real
  auth (sign in/up) and photo upload require real credentials — see "Full flow" below.

### Starting things (do this each session; not handled by the update script)
- Postgres does not auto-start. Start it with: `sudo pg_ctlcluster 16 main start`.
- If the `pixora` DB/role or tables are missing (fresh VM), recreate them:
  `sudo -u postgres psql -c "CREATE USER pixora WITH PASSWORD 'pixora';"` and
  `sudo -u postgres psql -c "CREATE DATABASE pixora OWNER pixora;"`, then from `backend/`
  run `bunx prisma migrate deploy`.
- Backend dev server: from `backend/` run `bun run dev` (needs `bun` on `PATH`; installed at
  `~/.bun/bin`). Hot-reloads on `src/` changes but NOT on `.env` changes — restart after editing
  `.env`.
- Frontend dev server: from `frontend/` run `npm run dev`.

### Non-obvious gotchas
- `backend/.env` is required for the backend to even start: `src/config/env.ts` validates ALL env
  vars with Zod at import time and the process exits if any are missing. `.env` files are
  gitignored and live only on the VM (they persist in the snapshot).
- The frontend throws `Missing VITE_CLERK_PUBLISHABLE_KEY` at boot if that var is unset, and
  Clerk needs a *well-formed* key (`pk_test_<base64>`) or ClerkProvider errors — the placeholder
  in `frontend/.env` is a valid-format fake, which is enough to render public pages.
- Prisma 7 generates its client into `backend/src/generated/prisma` (gitignored). Run
  `bunx prisma generate` in `backend/` if that directory is missing.
- Backend uses Bun; frontend uses npm (`package-lock.json`). Don't cross the package managers.
- `frontend` lint (`npm run lint`) currently reports one pre-existing `react-hooks/set-state-in-effect`
  error in `src/pages/GalleryPage.tsx`; it is unrelated to environment setup.

### Verifying without external credentials
- Health: `curl http://localhost:4000/health` → `{"status":"ok"}`.
- Protected route enforces auth: `curl http://localhost:4000/api/photos` → `401`.
- The Clerk **webhook** path (`POST /clerk/webhook`) can be exercised fully locally by signing a
  payload with the Svix secret in `backend/.env` (`WEBHOOK_SECRET`); it upserts a `User` row into
  Postgres. This is the best end-to-end check that does not need real Clerk/Cloudinary.

### Full flow (real auth + uploads)
Sign-in/sign-up and photo upload require real **Clerk** keys (`CLERK_SECRET_KEY`,
`CLERK_PUBLISHABLE_KEY`, `WEBHOOK_SECRET`, `VITE_CLERK_PUBLISHABLE_KEY`) and **Cloudinary**
credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`). Add them to
`backend/.env` / `frontend/.env` (or as Cursor secrets) to test the complete gallery experience.
