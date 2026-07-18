# AgroDesk — Support Intake Module

Captures every service / repair / enquiry request that arrives by phone or
WhatsApp as a ticket, shows it on the dashboard and in two panels, and forwards
the caller to the right person.

**The one rule this module exists to enforce:** the ticket is written to the
database *before* any call transfer or notification. If the transfer fails, the
notify fails, or the AI is down, the request still exists.

## Overview

| Concern | Where |
| --- | --- |
| Schema | `backend/prisma/schema.prisma` — `Machine`, `SupportRequest`, `SupportRouting` |
| Migration | `backend/prisma/migrations/20260717000000_add_support_intake/` |
| Triage (AI) | `backend/src/services/support/triage.ts` |
| Routing rules | `backend/src/services/support/router.ts` |
| Orchestrator | `backend/src/services/support/intake.ts` |
| Staff notify | `backend/src/services/support/notify.ts` + `worker.ts` (`support_notify`) |
| Voice IVR | `backend/src/services/support/voiceIntake.ts` |
| REST API | `backend/src/routes/support.ts` → `/api/support/*` |
| WhatsApp webhook | `backend/src/routes/webhooks.ts` → `POST /api/webhooks/whatsapp-support` |
| Frontend | `frontend/src/pages/support/Support.tsx`, `components/shared/SupportTile.tsx`, `store/support.ts` |
| Tests | `backend/src/tests/support-{triage,router,intake}.spec.ts` |

## Scope (deliberately narrow)

The AI **classifies and logs**. It does not diagnose, quote a price, or promise
a date. The only commitment made to a customer is *"आमचा माणूस फोन करेल."*

Four buckets: `SERVICE`, `REPAIR`, `OTHER`, `UNSURE`. Guessing wrong is worse
than `UNSURE` — an unsure ticket routes to the dealer, who decides.

Explicitly **out of scope in v1**: severity scoring, category taxonomies, SLA
timers, analytics.

## How a request flows

1. **Identity** — match `Contact` by phone within the dealer; load their machines.
2. **Triage** — bucket + a one-line Marathi note. Wrapped in try/catch; any
   failure yields `UNSURE` rather than throwing.
3. **Route** — `resolveRoute()` picks the target. The fallback chain always
   terminates at the dealer.
4. **Persist** — the `SupportRequest` row is written with `transferred: false`.
   **This step is never skipped.**
5. **Hand off** — transfer (voice) or notify (WhatsApp) happens *after* step 4.

### Routing table

| Bucket | Target | Falls back to |
| --- | --- | --- |
| `SERVICE`, `REPAIR` | Mechanic | dealer phone |
| `OTHER` | Technician | dealer phone |
| `UNSURE` | Dealer | — |

If `dealer_phone` is also unset, the ticket is still created with
`routed_to_phone: null` and surfaces on the dashboard. Nothing is dropped.

## Channels

### WhatsApp (primary)

Point the dealer's **support** WhatsApp number at:

```
POST https://<backend>/api/webhooks/whatsapp-support
```

Kept separate from `/api/webhooks/whatsapp`, which runs the AI Salesman. Both
sit behind Twilio signature validation.

- Voice notes → transcribed with Sarvam STT (`mr-IN`) and used as the request text.
- Photos → uploaded to S3 (`ap-south-1`) when configured, else the Twilio URL is kept.
- The customer receives an inline TwiML reply: `नोंद झाली. आमचा माणूस फोन करेल.`
- Idempotent on Twilio's `MessageSid` (stored as `external_call_id`, unique).

### Voice (Plivo IVR — second pass)

Set the support number's Answer URL to:

```
POST https://<backend>/api/support/voice/answer?token=<SUPPORT_VOICE_TOKEN>
```

Flow: recording-consent announcement (TRAI, non-negotiable) → greeting →
single-turn `<Record>` → Sarvam transcription → **ticket saved** → note repeated
back → `<Dial>` to the routed staff member → `transferred: true` only if the
dial actually connects.

**Outside office hours** (`SupportRouting.office_hours_*`, IST) the transfer is
skipped entirely — capture politely and close. Same for demo dealers and for
tickets with no routing target.

## Configuration

Per dealer, via **Support → सेटिंग्ज** (or `PUT /api/support/routing`): mechanic
phone, technician phone, dealer phone, office-hours start/end. Without a
`SupportRouting` row everything falls to `dealer_phone`.

Environment (see `backend/.env.example`):

| Var | Purpose |
| --- | --- |
| `SUPPORT_VOICE_TOKEN` | Shared secret on the voice IVR webhooks. Required in production, else the routes return 503. |
| `WHATSAPP_TPL_SUPPORT_NOTIFY` | Twilio Content SID (`HX…`) of the Meta-approved staff-alert template. |
| `DLT_TPL_SUPPORT_NOTIFY` | MSG91 DLT template ID for the SMS fallback. |

Reused: `TWILIO_*`, `WHATSAPP_PHONE_ID`, `SARVAM_API_KEY`, `AWS_*`,
`FRONTEND_URL` (deep link in the staff alert), `PLIVO_*`.

### Staff notification delivery chain

A staff alert is **business-initiated**, so free-form WhatsApp only works if
that staff member messaged the business number in the last 24 hours. The worker
therefore tries, in order:

1. Approved WhatsApp template (`WHATSAPP_TPL_SUPPORT_NOTIFY`) — works any time.
2. Free-form WhatsApp — dev/sandbox only; logs a warning.
3. DLT SMS (`support_notify`) — last resort.

Create the template in the Twilio Content Template Builder with five variables:

```
New {{1}} request from {{2}} ({{3}}). Details: {{4}}. View: {{5}}
```

> **Terminology:** WhatsApp templates are approved by **Meta**. India's **DLT**
> registration (TRAI) is a separate regime covering SMS and voice headers.

## API

All endpoints derive `dealer_id` from the verified JWT — never from the body or
query — and verify ownership before mutating.

```
GET   /api/support/requests?status=NEW&type=SERVICE&page=1
GET   /api/support/requests/:id
PATCH /api/support/requests/:id      { status, machineId, type }
POST  /api/support/requests          manual entry by the dealer
GET   /api/support/summary           { newCount, untransferredCount, oldestNewAt }
GET   /api/support/routing
PUT   /api/support/routing
```

`PATCH` to `SEEN` stamps `seen_at`; to `DONE` stamps `closed_at`. Changing
`type` re-runs routing.

## Demo dealers

For `dealers.is_demo = true`: the ticket is created normally, but **no outbound
send happens** — no customer acknowledgement, no staff notify enqueued, no call
transfer. Triage uses the deterministic `MockTriageProvider`, so demos cost
nothing and never vary.

## Frontend

- **Dashboard tile** — one big number (`{newCount} नवीन विनंत्या`), red border
  when the oldest untouched request is >24h old, and a red second line when
  calls failed to connect. Polls `/api/support/summary` every 30s.
- **Panels** — one component, different filter prop. Service = `SERVICE|REPAIR`;
  Other = `OTHER|UNSURE` (unsure tickets need dealer eyes, so they're visible).
- Row: customer (or phone) · tractor · note · relative time · channel icon · red
  dot when a call never connected. Two actions: Call back (`tel:`, sets `SEEN`)
  and Done. Newest first.

No kanban, no calendar, no charts — a dealer on the workshop floor must read it
in two seconds.

## Implementation notes (deviations from the original spec)

The module spec was written against an idealised schema. It was adapted to this
codebase's actual conventions:

| Spec said | Built as | Why |
| --- | --- | --- |
| `Customer` model | `Contact` | No `Customer` table exists; `Contact` is the customer entity. |
| camelCase fields | snake_case + `@@map` | Matches every existing model. |
| Prisma `enum`s | `TEXT` + TS unions | The DB uses plain `TEXT` everywhere (cf. `conversations.status`). |
| RLS policies per `dealer_id` | Application-level scoping | There is **no** Postgres RLS in this project; isolation is JWT `dealer_id` + per-query filters, covered by `tenant-isolation.test.ts`. |
| Claude `claude-sonnet-4-6` | Gemini via `geminiText` | `lib/llm.ts` replaced Anthropic across the app. Still swappable behind `TriageProvider`. |
| BullMQ queue `support-intake` | Bull, existing `agentQueue` | The repo uses `bull`; reusing `AgentJob` gets idempotency via the unique `idempotency_key`. |
| Thin receiver: enqueue triage | Ticket created inline, notify enqueued | Guarantees the ticket exists even if Redis/worker is down — the module's core promise. Mirrors the existing inline `labelMessage` pattern. |

## Tests

```bash
cd backend && npm test
```

- `support-triage.spec.ts` — 20 Marathi/Hinglish utterances across all four buckets.
- `support-intake.spec.ts` — **the important one**: triage throws → the row is
  still created as `UNSURE`. Plus routing fallback and `external_call_id` idempotency.
- `support-router.spec.ts` — every fallback path, including all-phones-null.

## Known gaps

- The WhatsApp staff-alert template must be created and Meta-approved before
  real dealers rely on it (see above).
- Voice intake has not been exercised against a live Plivo number.
- Panels page the first 20 rows per status filter; no "load more" yet.
- No demo seed data for the support panels.
