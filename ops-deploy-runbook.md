# AgroDesk Sovereign Vault (ops) — Deploy Runbook

Repo: `officialprash-ai/AgroDesk-ops` · Deploy branch: `main`
Backend → **Railway** (always-on) · Frontend → **Vercel** · DB → existing Supabase (`ap-south-1`, project `sqqggknuaemdchdigjiy`)

> Ops panel runs on its own subdomain, independent of the main dealer app.

---

## 1. Railway — backend (Express + Prisma), connected to `main`

1. railway.app → **New Project → Deploy from GitHub repo** → authorize the GitHub app for `officialprash-ai` → pick **AgroDesk-ops**.
2. In the service **Settings**:
   - **Root Directory**: set to the backend folder (e.g. `backend/` or `server/` — whatever the repo uses).
   - **Branch**: `main`. Enable **Auto Deploy** (deploys on every push to main).
   - **Build**: `npm ci && npx prisma generate && npm run build`
   - **Start**: `npx prisma migrate deploy && npm run start` (migrate uses the DIRECT url).
3. **Variables** (Railway → Variables):
   - `DATABASE_URL` = Supabase **pooled** conn, port `6543`, append `?pgbouncer=true` (used by the API).
   - `DIRECT_URL` = Supabase **direct** conn, port `5432` (migrations only).
   - `NODE_ENV=production`, plus JWT secret, provider/API keys, S3, etc.
   - `CORS_ORIGIN` = the ops Vercel URL (see §2) — backend must explicitly allow it.
4. Deploy → confirm health check green → note the Railway URL (e.g. `agrodesk-ops-production.up.railway.app`).

## 2. Vercel — frontend (React 19 + Vite), connected to `main`

1. vercel.com → **Add New → Project** → import **AgroDesk-ops** (authorize GitHub if prompted).
2. Config:
   - **Root Directory**: the frontend folder (e.g. `frontend/`).
   - **Framework**: Vite. **Build**: `npm run build`. **Output**: `dist`.
   - **Production Branch**: `main` (Settings → Git). Every push to main → prod deploy; other branches → previews.
3. **Environment Variables**:
   - `VITE_API_URL` = the Railway backend URL from §1.
4. Deploy → note the Vercel URL, then go back and set Railway `CORS_ORIGIN` to it. Redeploy backend.

## 3. Subdomain + finish

- Point the ops subdomain (e.g. `vault.agrodesk.app`) at the Vercel project (Vercel → Domains), and update `CORS_ORIGIN` to the final subdomain.
- Verify: load the ops URL → login → confirm API calls succeed (no CORS errors in console).

## Gotchas (from AgroDesk notes)
- **Backend must be Railway, not Vercel serverless** — webhooks / streaming need always-on.
- **Two Prisma URLs are mandatory**: pooled (6543, pgbouncer) for the app, direct (5432) for migrations.
- **CORS**: the Express backend must allow the exact ops Vercel/subdomain origin or logins fail.
- Never hardcode keys — all via env vars.
