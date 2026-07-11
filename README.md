# Pixora

A full-stack, private photo gallery built with React, TypeScript, Vite, Tailwind CSS, Bun, Express, Prisma 7, PostgreSQL, Clerk, and Cloudinary.

**Live demo:** [pixora-photogallery.vercel.app](https://pixora-photogallery.vercel.app/)



## Structure

```text
pixora/
├── backend/
│   ├── prisma/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── lib/
│       ├── middleware/
│       ├── routes/
│       ├── services/
│       ├── types/
│       └── utils/
└── frontend/
    └── src/
        ├── components/
        ├── hooks/
        ├── pages/
        ├── services/
        └── types/
```

## Prerequisites

- [Bun](https://bun.sh/) for the backend
- Node.js 20+ and npm for the frontend
- A Neon PostgreSQL database
- Clerk and Cloudinary accounts

## Local Setup

1. Install dependencies.

```bash
cd backend
bun install

cd ../frontend
npm install
```

2. Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env`.

3. In Clerk, create an application and add the frontend publishable key and backend secret key to the environment files.

4. In Clerk Dashboard, create a webhook endpoint pointing to:

```text
https://YOUR_BACKEND_DOMAIN/clerk/webhook
```

Subscribe it to `user.created`, `user.updated`, and `user.deleted`, then put its signing secret in `WEBHOOK_SECRET`. For local testing, expose port `4000` with a tunnel such as Cloudflare Tunnel or ngrok.

5. Add your Neon connection string to `DATABASE_URL`. Use a direct PostgreSQL connection string compatible with `pg`, with `sslmode=require`.

6. Generate Prisma Client and apply migrations.

```bash
cd backend
bunx prisma generate
bunx prisma migrate deploy
```

7. Start both applications in separate terminals.

```bash
cd backend
bun run dev
```

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:4000`.

## Environment Variables

Backend:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Clerk backend secret |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key (required by Clerk middleware) |
| `WEBHOOK_SECRET` | Clerk/Svix webhook signing secret |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `FRONTEND_URL` | Allowed browser origin |
| `PORT` | Express server port |

Frontend:

| Variable | Purpose |
| --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk browser publishable key |
| `VITE_API_URL` | Public backend URL |

## API

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/clerk/webhook` | Sync Clerk users, verified with Svix |
| `GET` | `/api/crypto/keys` | Fetch the caller's wrapped master key material |
| `POST` | `/api/crypto/keys` | Store the wrapped master key during first-time setup |
| `PUT` | `/api/crypto/keys` | Rotate the passphrase by re-wrapping the master key |
| `POST` | `/api/photos/upload` | Upload one encrypted photo (`image`, optional `thumbnail`, and JSON `metadata` fields) |
| `GET` | `/api/photos?page=1&limit=24` | List the authenticated user's photos |
| `DELETE` | `/api/photos/:id` | Delete an owned photo |
| `GET` | `/health` | Health check |

All `/api/photos` and `/api/crypto` routes require a Clerk bearer token.

## End-to-end encryption

Photos are encrypted in the browser before upload and only decrypted in the
browser, so the backend, database, and Cloudinary only ever store ciphertext.

- A user passphrase (never sent to the server) is stretched with Argon2id into a
  key-encryption key (KEK).
- A random per-user master key is wrapped by the KEK and stored on the server.
  Rotating the passphrase only re-wraps the master key; photos are untouched.
- Each photo gets a random AES-256-GCM data key that encrypts the image bytes,
  thumbnail, and file name; the data key is wrapped by the master key.
- Encrypted blobs are stored in Cloudinary as `raw` assets. Because the data is
  opaque, Cloudinary transformations do not apply and thumbnails are generated
  and encrypted on the client instead.
- An optional recovery code wraps a second copy of the master key. Use it on the
  unlock screen if you forget your passphrase. Losing both the passphrase and the
  recovery code makes the photos unrecoverable by design.

Run `bunx prisma migrate deploy` to apply the encryption schema before using the
updated app.

## Production Deployment

### Backend

Deploy `backend/` to a Bun-compatible host such as Railway, Render, Fly.io, or a container platform. Configure all backend environment variables, set the start command to `bun run start`, and run migrations during release:

```bash
bun install --frozen-lockfile
bunx prisma generate
bunx prisma migrate deploy
bun run start
```

Set `FRONTEND_URL` to the production frontend origin and update the Clerk webhook endpoint to the deployed backend URL.

### Frontend

Deploy `frontend/` to Vercel, Netlify, or Cloudflare Pages:

```bash
npm ci
npm run build
```

Publish `frontend/dist`, configure both frontend environment variables, and add the production frontend domain to Clerk's allowed origins and redirect URLs. Configure the host to rewrite unknown routes to `/index.html`.

## Operational Notes

- Each upload request carries one encrypted photo (the image plus an optional
  encrypted thumbnail), held in memory and limited to 15 MB per file.
- Cloudinary assets are cleaned up if database creation fails.
- Deleting a Clerk user removes database rows first, then attempts Cloudinary cleanup.
- The Prisma client uses the required Prisma 7 `PrismaPg` driver adapter.
