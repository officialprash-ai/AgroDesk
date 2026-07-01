# AgroDesk — Production Readiness Re-Audit & Upgrade Roadmap

_Assessment date: 1 July 2026 · Follow-up to `PRE-LAUNCH-CHECKLIST.md` and `UI-REVIEW.md` (both dated 14 June 2026). This document verifies current code against those findings and adds a forward-looking feature roadmap._

## TL;DR

The team has moved fast in ~2.5 weeks: **8 of 11 security/compliance issues and 8 of 17 UX issues from the last audit are now genuinely fixed**, including the auth bypass, tenant-isolation leaks, rate limiting, TRAI quiet hours, DLT enforcement, consent gating, and a real outbound worker that actually places calls and sends messages. This is no longer "a polished demo" — Exotel, Sarvam, MSG91, and Twilio WhatsApp are wired to real APIs. What's left is a shorter, more specific list: three security gaps, one compliance gap, a handful of reliability/completeness items, and UX polish. Below is what's still open, followed by a product roadmap for making AgroDesk more valuable once the foundation is solid.

---

## Part 1 — What's still open (fix before real dealers scale up)

### Security

1. **`dealer_id` still trusted from the client on 3 endpoints.** `backend/src/routes/dashboard.ts` — `GET /activity` reads `dealer_id` from `req.query` directly; `/charts` and `DELETE /activity` use `req.dealer_id ?? req.query.dealer_id`, so a client value can still override the authenticated one. Every other route file was already fixed the same week — this is the last stray copy-paste. Fix: delete the `req.query.dealer_id` fallback in all three.
2. **Webhook signature checks silently no-op if env vars are unset.** `index.ts` implements real HMAC verification for Twilio/Exotel webhooks, but if `TWILIO_AUTH_TOKEN` / `EXOTEL_WEBHOOK_TOKEN` are missing it logs a warning and calls `next()` anyway — i.e., it fails open, not closed. Confirm these are actually set in the Railway production environment (they are unset in `.env.local`), and consider making the app refuse to start without them in production the same way `JWT_SECRET` does.
3. **`/api/tractors/urgency-refresh` has no dealer scoping or role check.** Any authenticated dealer can trigger a global bulk recompute across every dealer's tractor inventory. Low severity (no data leak, but a noisy-neighbor / cost issue), easy fix: scope to `req.dealer_id` or require an admin role.
4. **Ops console admin: TOTP is enforced when enabled, but not mandatory.** The seeded `superadmin` account has `totp_enabled: false`, so the single highest-privilege account can still log in with password alone. Also, `agrodesk Ops--backend` has no visible server entrypoint (`index.ts`/`app.listen`) — its CORS/rate-limit posture couldn't be verified from the code that exists. Recommend making TOTP mandatory for any `admin`/`superadmin` role, and confirming the Ops backend's own hardening once its entrypoint is located.
5. **Ops admin users and audit log are in-memory, not persisted.** `admin.ts` keeps `ADMIN_USERS` and `AUDIT_LOG` as process variables — a restart silently wipes admin accounts and the entire audit trail. For a system that gatekeeps legal/financial actions, the audit log needs to survive restarts (move both to Postgres).

### Compliance

6. **Legal-stage recovery cases can still be contacted directly.** Bulk recovery correctly excludes `legal`-stage cases, but the single-case `POST /recovery/:id/contact` endpoint has no stage check — an operator can still directly message a case that's supposed to be under legal hold. There's also no approval/audit field on the `RecoveryCase` model. Add a stage guard plus an explicit approval-with-reason workflow before this ships to real recovery operations.

### Reliability / completeness

7. **No plan-quota enforcement anywhere.** Starter/Growth/Pro plan limits exist as data (`dealer.plan`, Ops `Limits.tsx`) but nothing — not the worker, not `/api/jobs`, not any route — checks usage against the plan before allowing another call/WhatsApp send. `Limits.tsx`'s save button doesn't even call an API; it just flips local UI state for 2 seconds. Until this exists, every dealer is effectively unlimited regardless of what they're billed for.
8. **Document storage and OCR are still unimplemented.** `routes/documents.ts` stores a client-supplied `file_url` string with no actual upload pipeline — no S3 (or equivalent) integration exists. OCR (for bill/invoice scanning in AI Accountant) is entirely absent. Tally sync is a boolean flag with no sync logic behind it. These are the three provider gaps still open from the original module promises.
9. **WhatsApp is wired through Twilio, not the BSP named in your docs (AiSensy/Interakt).** Functionally fine, but update README/PRE-LAUNCH-CHECKLIST and any client-facing material so the documented vendor matches the deployed one — this affects WhatsApp Business API compliance paperwork and template-approval ownership.
10. **Test coverage is thin and somewhat disconnected from real code.** The 3 existing test files (`auth.test.ts`, `tenant-isolation.test.ts`, `setup.ts`) test against re-implemented mock logic rather than the actual Express routes/Prisma calls — they prove the *pattern* is right but won't catch a regression in the real route file (exactly how issue #1 above slipped through). No health-check smoke test exists. Recommend converting at least the tenant-isolation test to a real supertest-against-the-actual-app integration test.
11. **No CI/CD gate.** No GitHub Actions/GitLab CI exists; Railway/Vercel auto-deploy directly from git push with no automated test/lint/build check in between. A single bad commit reaches production immediately. Add a minimal workflow that runs `npm run build` + `npm test` on every PR before either host deploys it.
12. **No database backup automation in-repo.** Backups (if any) exist purely as a Railway hosting setting, undocumented and unverified. Confirm Railway's Postgres backup schedule and actually run a restore drill once; document the recovery steps.
13. **Structured logging is still just `console.log`.** Sentry is properly initialized in both the API server and worker (good), but there's no request-level structured logger (pino/winston) for tracing an issue across a request lifecycle — worth adding once traffic grows past what Sentry alone can make sense of.

### UX / accessibility

14. **Ops console still forces re-login on every page refresh** (`user` isn't rehydrated from the stored token) and is **still branded "Sovereign Vault / OPS CONSOLE"** with inline styles and local-state page-switching instead of routes (no deep links, no browser back button). Both flagged 14 June, both still open.
15. **The shared `Card` component doesn't forward `role`/`tabIndex` when given an `onClick`.** This is a systemic risk: any future developer who makes a `Card` clickable (as `AIAccountant.tsx` already does) silently reintroduces the keyboard-inaccessibility bug that was otherwise fixed everywhere else. Fix once at the `Card` primitive level rather than per-usage.
16. **`<html lang="en">` is still static in `index.html`**; `Header.tsx` only patches it post-mount via `useEffect`, so first paint and screen readers still see English regardless of the dealer's actual language. Move the lang attribute update earlier (e.g., set it from stored preference before React hydrates) or set it server-side if you ever add SSR.
17. **No mobile navigation; `h-screen` instead of `min-h-dvh`; header search hidden below `md`.** If dealers are expected to use this on phones in the field (likely, given the product), this needs a real mobile nav pattern, not just a docked sidebar that disappears.
18. **Mock data still exists outside Dashboard** — `SalesEngine.tsx` has hardcoded `MOCK_TEMPLATES`. The Dashboard fix wasn't applied consistently across the app; sweep for any other remaining hardcoded arrays before demoing to a client.
19. **`UsedTractor.tsx` images still lack `width`/`height`/`onError`**, causing layout shift and unhandled broken-image states on the highest-visual-content page in the app.
20. **Modal has no real focus trap** (Escape/scroll-lock are fixed, but Tab can still escape the dialog into background content) — minor but worth closing out the accessibility item fully.

---

## Part 2 — Product upgrade roadmap (making it more useful, not just correct)

Organized by how soon each is worth tackling. These assume Part 1's P0/P1 items are closed first — shipping growth features on top of the `dealer_id` leak or missing quota enforcement would be building on sand.

### Near-term (highest leverage, moderate effort)

- **Enforce plan quotas with in-app usage visibility.** Turn item #7 above into a feature: a real-time "X of Y calls used this month" widget on the dealer dashboard, with a graceful upgrade prompt when a dealer hits their limit instead of a hard failure. This is both a production-readiness fix and a monetization lever.
- **Bulk CSV import for contacts.** Most dealers switching to AgroDesk have an existing contact list in Excel/a competitor tool. A CSV import with column-mapping and dedupe-by-phone would remove the single biggest onboarding friction point.
- **Follow-up reminders / task queue for the dealer.** Cold-calling and recovery modules currently only track contact-side state; add a simple "call back in 3 days" / "payment due" reminder surface so the dealer's own workflow is supported, not just the AI's outreach.
- **Finish document storage (S3) + OCR for AI Accountant.** This module can't do its core job (scan a bill, extract line items) without it — it's the highest-impact incomplete feature versus the effort to close it, since S3 wiring is a well-trodden pattern.
- **Mobile-responsive layout / PWA.** Given the field-sales nature of the product, a installable PWA with a real mobile nav (not just responsive text reflow) would likely be used more than a desktop-only tool by a dealer walking a farm.

### Mid-term (bigger bets)

- **Multi-user accounts per dealership.** Right now the model appears to be one login per dealer. Real dealerships have sales staff and an accountant — add roles/sub-users scoped to one `dealer_id`, so a dealer can delegate cold-calling to staff without sharing a single password.
- **Offline-first data entry.** Rural connectivity is unreliable; a service-worker-backed local queue (create contact, log a payment, add a tractor listing offline, sync when back online) would materially reduce lost work in the field.
- **Real analytics/reporting with export.** Beyond the dashboard charts, give dealers a monthly PDF/Excel report (leads converted, recovery collected, tractor sales) — useful for the dealer's own bookkeeping and for justifying the subscription to themselves.
- **Tally sync, for real.** The flag exists; dealers who already use Tally for accounting will get much higher retention if AI Accountant actually pushes entries there instead of living in a separate silo.
- **WhatsApp catalog / rich media for the Used Tractor sales engine.** Photos, short videos, and shareable WhatsApp catalog cards for listings would likely outperform text-only outreach for a visual product like a tractor.

### Longer-term (differentiators)

- **Government scheme / subsidy tracking.** A genuinely India-agriculture-specific feature: surface applicable state/central tractor subsidy schemes per contact's district and track application status. Hard to build, but hard for a generic CRM competitor to copy.
- **Financing/EMI calculator with NBFC lead handoff.** Many tractor sales hinge on financing; an EMI calculator plus a lead-referral integration to a partner NBFC/bank could become a revenue-share feature, not just a cost center.
- **Predictive lead scoring.** The current `score` field looks rule-based; once there's enough real conversation/outcome data (a few months post-launch), a model trained on actual won/lost outcomes would improve targeting meaningfully over a static score.
- **Farmer self-service via WhatsApp.** The inbound WhatsApp webhook already exists — extend it so a farmer can check their own service-request or installment status conversationally, reducing inbound call volume to the dealer.
- **Expand beyond Marathi.** The product is Marathi-first for Maharashtra; if there's appetite to sell into other states, Hindi/Telugu/Kannada/Gujarati language packs (both AI script generation and UI) are the natural next markets — the `LANGUAGES` list and Sarvam's multilingual support suggest the groundwork is already partly there.

---

## Suggested sequence

1. **This week:** close items #1–#3 (security stragglers) and #6 (legal-stage guard) — all are small, targeted diffs.
2. **Next 1-2 weeks:** plan-quota enforcement (#7) and document storage/OCR (#8) — these block both billing integrity and a whole module's usefulness.
3. **Before onboarding real dealers at volume:** CI/CD gate (#11), integration-style tests replacing the mocked ones (#10), and a verified backup/restore drill (#12).
4. **In parallel, product:** pick 2-3 near-term roadmap items (CSV import and mobile PWA are probably the highest dealer-perceived value for the least engineering risk) to run alongside the hardening work above.
