# AgroDesk — Pre-Launch & Client Handover Checklist

_Assessment date: 14 June 2026 · Based on a direct review of the `agrodesk` and `agrodesk Ops` codebases._

This is a prioritized list of what to change before you put AgroDesk in front of paying dealers and hand it to a client. Items are grouped by severity. **P0 must be done before any real (non-demo) dealer touches the system.** Each item points to the actual file involved.

---

## TL;DR — the three things that matter most

1. **The product doesn't place real calls/messages yet.** Agent jobs are written to a database table, but there is **no worker consuming them**, and none of the providers (Exotel, Sarvam, WhatsApp, MSG91) are wired up. Today the app is effectively a polished demo. Decide whether you're launching the *full* product or a *narrower* first slice (see P1).
2. **There are real security holes that allow one dealer to read another dealer's data, and an auth bypass.** These are cheap to fix but must be fixed before onboarding anyone (see P0).
3. **The India compliance controls described in the README are not enforced in code** (quiet hours, consent, DLT templates). Contacting real farmers without these is a legal/regulatory risk (see P2).

---

## P0 — Launch blockers (security & tenant isolation)

These are exploitable today and must be closed before a single real dealer logs in.

### 0.1 — Remove the "empty password" auth bypass
`backend/src/routes/auth.ts` accepts **any password** when a dealer's `password_hash` is empty:
```ts
const valid = dealer.password_hash === '' ? true : await bcrypt.compare(...)
```
Any account seeded without a hash can be logged into with anything. Remove this shortcut and require a real hash for every account.

### 0.2 — Stop trusting `dealer_id` from the client (cross-tenant data leak)
Routes read `dealer_id` from the query string / body instead of from the authenticated token. Example in `backend/src/routes/dashboard.ts` and `routes/recovery.ts`:
```ts
const { dealer_id } = req.query;   // attacker can pass ANY dealer's id
```
`authMiddleware` already puts the verified `dealer_id` on `req.dealer_id` — but the routes ignore it. **Effect: an authenticated Dealer A can read/modify Dealer B's contacts, recovery cases, debts, and documents** just by changing the parameter. Fix: derive `dealer_id` from `req.dealer_id` only, and ignore any client-supplied value. This applies to every domain route.

### 0.3 — Protect and scope `/api/jobs`
In `backend/src/index.ts`, both `POST /api/jobs` and `GET /api/jobs` are registered **with no `authMiddleware`**. Anyone on the internet can enumerate jobs for any `dealer_id` and queue new ones. Put them behind auth and scope to the token's dealer.

### 0.4 — Require a strong `JWT_SECRET` (no hardcoded fallback)
Three places fall back to a hardcoded secret if the env var is missing:
- `backend/src/middleware/auth.ts` → `'agrodesk-dev-secret-change-in-prod'`
- `backend/src/routes/auth.ts` → same string
- `agrodesk Ops/backend/src/middleware/adminAuth.ts` → `'dev-secret-change-in-production-!!'`

If the env var is ever unset in production, tokens can be forged. Make the app **fail to boot** if `JWT_SECRET` / `VAULT_JWT_SECRET` is missing, and generate fresh 64-char secrets for production.

### 0.5 — Verify webhook signatures
`/webhooks/exotel/call-status` and `/webhooks/whatsapp` in `index.ts` accept any POST and update job state from it. Without signature validation, anyone can spoof "call completed" events. Validate the provider signature before trusting the payload.

### 0.6 — Add rate limiting
There is no rate limiting anywhere (confirmed — no `express-rate-limit`). Login, register, and the AI endpoints (which cost real Anthropic tokens) are open to brute-force and cost-abuse. Add `express-rate-limit`, stricter on `/api/auth/*`.

---

## P1 — Core functionality gaps (is it actually "launchable"?)

The README advertises 6 AI agent modules that place calls and send messages. In the current code those outbound paths are not implemented.

- **No queue worker.** `bullmq`/`ioredis`/`bull` are dependencies and jobs are created in the `AgentJob` table, but nothing processes them. There is no worker file. Calls/messages never actually go out.
- **No provider integrations.** Exotel (voice), Sarvam (Marathi STT/TTS), WhatsApp BSP (AiSensy/Interakt), MSG91 (SMS), AWS S3, OCR, and Tally sync are referenced in docs/env but not called anywhere in `src/`.
- **WhatsApp inbound is a stub.** `/webhooks/whatsapp` is literally `// TODO: implement inbound routing`, so Module E (AI Salesman inbound) won't respond.

**Decision to make:** either (a) build the worker + at least one real channel end-to-end before launch, or (b) launch a deliberately scoped v1 (e.g. CRM + AI script/listing generation, which *do* work) and clearly mark calling/messaging as "coming soon." Selling all 6 modules as live today would be over-promising.

---

## P2 — India compliance (legally required before contacting real people)

The README promises these controls; none are enforced in code yet. Contacting farmers without them risks TRAI/DLT penalties and DPDP liability.

- **TRAI quiet hours (9 AM–9 PM).** No time check before outbound. Gate every call/SMS/WhatsApp send by recipient local time.
- **DLT template enforcement.** SMS must send only DLT-registered template IDs (TRAI TCCCPR). No template-ID validation exists.
- **Consent enforcement.** Contacts carry `opt_in_whatsapp / opt_in_sms / opt_in_call` flags, but nothing checks them before reaching out. Block any channel where opt-in is false, and log the consent basis per message.
- **Legal-stage human approval gate.** Bulk recovery correctly excludes the `legal` stage, but there is no explicit approval workflow + audit trail for escalating a case to legal. Add one.
- **DPDP Act 2023.** You need: a data-subject export/erase path, a documented retention policy, a breach-notification process (72 hr), a privacy policy, and a named contact. Note real erasure is currently disabled (demo guard) — production needs genuine delete-on-request.

---

## P3 — Reliability, observability & correctness

- **Zero automated tests.** Add at minimum: an auth test, a **tenant-isolation** test (proves Dealer A can't read Dealer B), and a health-check smoke test. These directly cover your biggest risks.
- **No error monitoring / structured logging.** Only `console.log`. Add Sentry (or similar) and a request logger.
- **Confirm the global error handler exists.** `index.ts` ends right at the `// ERROR HANDLER` comment in the copy I reviewed — make sure an actual `app.use((err,req,res,next)=>...)` is present so unhandled errors don't leak stack traces.
- **Validate env at boot.** Fail fast with a clear message if `DATABASE_URL`, `ANTHROPIC_API_KEY`, or `JWT_SECRET` are missing, rather than failing at first request.
- **Re-enable Helmet CSP.** It's currently disabled (`contentSecurityPolicy: false`). Set a real policy for your frontend origin.
- **Database backups + restore drill.** Confirm automated Postgres backups on your host (Railway) and actually test a restore once.
- **Plan-quota enforcement.** Pricing tiers (Starter/Growth/Pro) and the Ops `Limits.tsx` screen exist, but verify the backend actually enforces call/WhatsApp quotas per plan so usage can't exceed what's paid for.

---

## P4 — Client handover essentials

- **Replace the hardcoded frontend origin.** CORS in `index.ts` hardcodes `https://frontend-sepia-five-70.vercel.app`. Move all origins to env and set the client's real production domain.
- **Lock down demo mode for production tenants.** `is_demo` accounts reset their data on every login and simulate outbound. Make sure no real client account can be flagged demo, and that the reset path can never touch real data.
- **Ops/admin console security.** `adminAuth.ts` has a `totp_enabled` flag and roles — verify TOTP is actually enforced on admin login (not just stored), and that the admin secret is a strong production value.
- **Secrets hygiene.** Good news: `.env` files are **not** committed (only `.env.example`). Before handover, rotate every key that's ever been shared, and confirm production secrets live only in the host's env settings.
- **Handover documentation.** Provide: a deploy/runbook (how to deploy, rotate keys, restore a backup), an API reference, an admin guide for the Ops console, the data model, and an incident-response contact. The README is a good start but is user-facing, not operational.

---

## Suggested sequence

1. **Week 1 — P0 security.** Close 0.1–0.6. Add the tenant-isolation test alongside (P3) so the fix is provable.
2. **Decide scope (P1).** Full outbound vs. scoped v1. This determines everything downstream.
3. **If launching outbound — P2 compliance + the worker/integrations**, built together (the compliance checks belong *inside* the send path).
4. **P3 reliability + P4 handover docs** in parallel, before the client sign-off.

---

### What's already solid (so you know the baseline)
Clean modular structure, TypeScript throughout, Prisma schema with proper models, Zod validation on inputs, bcrypt for passwords, Helmet present, a working health check with a DB probe, a sensible demo-mode design, a separate Ops/admin app with roles, and a thought-through compliance *design* in the README. The bones are good — the gaps are about hardening, completeness, and enforcement, not a rewrite.
