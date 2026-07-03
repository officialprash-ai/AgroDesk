# AgroDesk — Final Steps to Go Live

_Prepared 3 July 2026. Companion to `PRODUCTION-READINESS-2026-07-01.md`. This verifies current code, maps the Ops ↔ main-app connection, and lists the concrete cutover steps._

## 1. Deployment topology (what actually runs in production)

AgroDesk is **five moving parts sharing one database**:

| Service | Code | Host | Start command | Port |
|---|---|---|---|---|
| Main API | `agrodesk/backend` | Railway | `npm start` (`prisma migrate deploy && node dist/index.js`) | 3001 |
| **Agent worker** | `agrodesk/backend` (`worker.ts`) | Railway (**separate service**) | `npm run worker` | — |
| Main frontend | `agrodesk/frontend` | Vercel | static build | — |
| Ops API | `agrodesk Ops/backend` | Railway (separate service) | `npm start` | 3002 |
| Ops frontend | `agrodesk Ops/ops` | Vercel (separate project) | static build | — |
| Postgres + Redis | — | Railway plugins | — | — |

The **worker is the piece that places real calls and sends WhatsApp/SMS**. The API only queues jobs into Redis; the worker drains the queue and calls Exotel/Sarvam/MSG91/Twilio.

## 2. The Ops ↔ main-app connection

They are **not** connected by HTTP. The integration point is the **shared Postgres database** (`DATABASE_URL`):

- `agrodesk Ops/backend/src/lib/prisma.ts` opens a **second, narrow Prisma client** against the same DB. Its schema declares only `Dealer` and `Brand` — it reads/writes a subset of the main app's tables (dealer management, plan limits, brand catalog).
- **Migration ownership is correct as-is:** only the main app runs migrations (`prisma migrate deploy` on boot). The Ops backend's build runs `prisma generate` only, and it has **no `migrations/` folder** — so it can't fight the main app over schema. Keep it this way.
- **Schema-drift risk to watch:** because the Ops `schema.prisma` re-declares `Dealer`/`Brand` independently, if you change those models in the main app you must mirror the change in the Ops schema and re-`generate`, or the Ops client will query columns that don't exist. Treat the main app's `schema.prisma` as the source of truth for those two models.
- **Auth is separate:** Ops uses `VAULT_JWT_SECRET` (distinct from the main app's `JWT_SECRET`). Ops admin sessions and dealer sessions are different trust domains — good.
- **Wiring the two:** for go-live, both Railway backend services must point at the **same** `DATABASE_URL`, and the Ops frontend must know the Ops API URL (set `OPS_FRONTEND_URL` on the Ops backend for CORS, and the Ops frontend's API base to the Ops API domain — verify this is not still hardcoded to `localhost:3002`).

## 3. P0 — hard blockers (must fix before real traffic)

1. **Deploy the worker as its own Railway service.** `railway.toml` only builds/starts the main API — nothing starts `npm run worker` in production. Until this exists, **every call and message silently queues and never sends** (this is the "Railway worker action item" from prior notes). Add a second Railway service from the same repo with start command `npm run worker`, sharing `DATABASE_URL`, `REDIS_URL`, and all provider keys.
2. **Provision Redis and set `REDIS_URL`** on both the API and the worker. Locally you saw `[queue] Redis error (non-fatal)` — in prod that means no queue at all.
3. **Set `EXOTEL_PHONE`** (the Exotel virtual number) — it is currently empty in `.env`, so `placeCall()` throws "credentials not configured" on every call. Also confirm `EXOTEL_API_KEY/TOKEN/SID`.
4. **Webhook signature checks fail *open*.** `backend/src/index.ts` (~lines 121, 159) logs a warning and calls `next()` when `TWILIO_AUTH_TOKEN` / `EXOTEL_WEBHOOK_TOKEN` are unset. In production this must fail **closed**. Set both tokens in Railway **and** add them to the fail-fast `REQUIRED_ENV` list so the app refuses to start without them.
5. **Set Vercel's `$RAILWAY_BACKEND_URL`** — the main frontend's `vercel.json` rewrites `/api/*` to this variable. If unset, the whole frontend can't reach the API.
6. **Verify the deployed backend boots.** The `@sentry` install crash you just fixed must be confirmed gone on Railway (the corrected `package-lock.json` in commit `a8e207b` is what carries the fix — make sure it's pushed and Railway rebuilt from it).

## 4. P1 — fix this week (security/compliance stragglers)

Verified against current code:

- ✅ **Already fixed:** the `dealer_id`-from-client leak in `dashboard.ts` (#1 in the audit) — no `req.query.dealer_id` fallback remains.
- ⚠️ **Still open — `/api/tractors/urgency-refresh`** has no dealer scoping or role check; any authenticated dealer triggers a global recompute. Scope to `req.dealer_id` or gate behind admin.
- ⚠️ **Still open — legal-stage recovery guard.** Bulk recovery excludes `legal` cases, but the single-case `POST /recovery/:id/contact` has no stage check. Add a hard guard so a case under legal hold can't be messaged directly.
- ⚠️ **Ops highest-privilege hardening.** The seeded `superadmin` has `totp_enabled: false`, and Ops admin users + audit log are **in-memory** (`admin.ts`) — a restart wipes admin accounts and the entire audit trail. Make TOTP mandatory for admin/superadmin and move `ADMIN_USERS` + `AUDIT_LOG` to Postgres before Ops gatekeeps real legal/financial actions.
- ⚠️ **Plan-quota enforcement (#7)** still doesn't exist — every dealer is effectively unlimited regardless of billing. Not a safety blocker, but a billing-integrity one; decide if it gates launch.

## 5. Pre-cutover checklist

- [ ] Add CI gate (GitHub Actions: `npm run build` + `npm test` on PR) — currently a bad commit reaches prod instantly.
- [ ] Confirm Railway Postgres automated backups are on; run one restore drill and document it.
- [ ] Smoke-test after deploy: `GET /api/health` (main) and `GET /api/health` (Ops) both return `ok`.
- [ ] End-to-end test on the deployed URL: create a contact → queue one AI call → confirm the worker logs a real Exotel dial and the status webhook updates the job.
- [ ] Confirm document storage (#8): `routes/documents.ts` stores a client-supplied URL with no real upload pipeline (no S3, no OCR). If AI Accountant is in the launch scope, this must be finished; if not, hide/flag it as "coming soon."
- [ ] Update README/compliance docs: WhatsApp ships via **Twilio**, not the BSP named in the docs — the template-approval paperwork must match the deployed vendor.

## 6. Recommended cutover sequence

1. Push commit `a8e207b` (Sentry lockfile fix) and confirm the main API boots clean on Railway.
2. Provision Redis; set `REDIS_URL` on API + worker.
3. Stand up the **worker** Railway service (`npm run worker`) with all provider keys + `EXOTEL_PHONE`.
4. Set webhook tokens (`TWILIO_AUTH_TOKEN`, `EXOTEL_WEBHOOK_TOKEN`) and make them required; redeploy.
5. Deploy the Ops backend + Ops frontend; confirm both point at the shared `DATABASE_URL` and the Ops frontend's API base is the prod Ops URL (not localhost).
6. Run the end-to-end smoke test (contact → call → webhook).
7. Fix the two P1 route guards (`urgency-refresh`, recovery legal) — small diffs.
8. Onboard a single pilot dealer before opening to volume.

---

### Environment variables by service

**Main API + Worker:** `DATABASE_URL`, `JWT_SECRET`, `ANTHROPIC_API_KEY`, `REDIS_URL`, `EXOTEL_API_KEY`, `EXOTEL_API_TOKEN`, `EXOTEL_SID`, `EXOTEL_PHONE`, `EXOTEL_WEBHOOK_TOKEN`, `TWILIO_AUTH_TOKEN` (+ WhatsApp sender), `SARVAM_API_KEY`, `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, `FRONTEND_URL`, `NODE_ENV=production`.

**Ops API:** `DATABASE_URL` (same DB), `VAULT_JWT_SECRET`, `OPS_FRONTEND_URL`, `OPS_PORT`, `NODE_ENV=production`.

**Main frontend (Vercel):** `RAILWAY_BACKEND_URL`. **Ops frontend (Vercel):** Ops API base URL.
