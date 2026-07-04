# AgroDesk CI/CD & Testing

This document describes the continuous-integration pipeline, the test setup, and
how deployment is gated. It reflects the workflows in `.github/workflows/`.

## Overview

| Concern            | Backend (`/backend`)                          | Frontend (`/frontend`)                  |
| ------------------ | --------------------------------------------- | --------------------------------------- |
| Language / build   | TypeScript → `tsc`, Prisma                    | TypeScript → `tsc -b` + Vite            |
| Test runner        | Vitest + supertest                            | Vitest + Testing Library (jsdom)        |
| Deploy target      | Railway (API service + separate worker)       | Vercel                                  |

Two workflows run on GitHub Actions:

1. **`ci.yml`** — build, typecheck, lint, and test both apps on every pull
   request and every push to `main`.
2. **`security.yml`** — `npm audit` on dependency changes, plus a weekly sweep.

## The CI pipeline (`ci.yml`)

Runs on `pull_request` and `push` to `main`. Superseded runs on the same branch
are auto-cancelled to save minutes.

### `backend` job

Spins up **Postgres 16** and **Redis 7** as service containers, then:

1. `npm ci`
2. `npx prisma generate`
3. `npm run typecheck` (`tsc --noEmit`)
4. `npx prisma migrate deploy` — validates every migration against a real DB
5. `npm run build`
6. `npm run test:coverage`
7. Uploads the coverage report as a build artifact

### `frontend` job

1. `npm ci`
2. `npm run lint` — **report-only for now** (see note below)
3. `npm run typecheck` (`tsc -b --noEmit`)
4. `npm run test:coverage`
5. `npm run build`
6. Uploads the coverage report as a build artifact

### `ci-success` job

An aggregate gate that only passes when **both** the `backend` and `frontend`
jobs succeed. Make this the single required status check in branch protection
(see below) so you don't have to update settings when individual steps change.

> **Note on frontend lint:** the existing app code carries pre-existing lint
> debt (mostly `@typescript-eslint/no-explicit-any`). The lint step is therefore
> `continue-on-error: true` — it surfaces issues without blocking merges. Once
> the existing errors are driven to zero, remove `continue-on-error` in
> `ci.yml` to make lint a hard gate.

## The security pipeline (`security.yml`)

Runs when any `package.json` / `package-lock.json` changes, weekly on Mondays,
and on manual dispatch. For each workspace it:

- Fails the build on **critical** advisories in production dependencies
  (`npm audit --omit=dev --audit-level=critical`).
- Prints a full high-severity report as **informational** (non-blocking).

## Deployment model

Deployment is **unchanged** — Railway and Vercel continue to auto-deploy on push
to `main`:

- **Railway** builds the API from `railway.toml` and the worker from
  `railway.worker.toml`.
- **Vercel** builds the frontend per `vercel.json`.

CI does not trigger deploys; it **gates** them. With branch protection enabled,
broken code is caught on the pull request before it can reach `main` (and
therefore before Railway/Vercel deploy it).

### Enable branch protection (one-time, GitHub UI)

1. Repo → **Settings → Branches → Add branch ruleset** (or *Branch protection
   rules*) for `main`.
2. Enable **Require a pull request before merging**.
3. Enable **Require status checks to pass before merging** and select
   **`CI success`** (and optionally **`npm audit (backend)`** /
   **`npm audit (frontend)`**).
4. Enable **Require branches to be up to date before merging**.

## Running everything locally

Backend:

```bash
cd backend
npm ci
npm run typecheck
npm test              # or: npm run test:coverage
npm run build
```

Backend tests are offline (DB/Redis are mocked), so no local Postgres is needed
to run `npm test`. The Postgres/Redis containers in CI exist to validate Prisma
migrations and to support future integration tests.

Frontend:

```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm test              # or: npm run test:coverage
npm run build
```

## What's tested today (starter suite)

- **Backend** — auth (empty-password bypass regression, JWT structure), tenant
  isolation (dealer_id from token, not request body), input validation (zod
  schemas), and the `/api/health` contract.
- **Frontend** — `utils` helpers (`formatCurrency`, `formatRelative`, `cn`,
  status/urgency colors) and the `Button` component (render, variants, click,
  disabled).

Test files live in `backend/src/tests/` and `frontend/src/tests/`. Frontend
tests are excluded from the production `tsc` build via `tsconfig.app.json`, so
they never affect the deployed bundle.

## Recommended next steps

- Add **Dependabot** (`.github/dependabot.yml`) for automated dependency PRs.
- Drive frontend lint errors to zero, then make lint blocking.
- Add integration tests that hit the CI Postgres/Redis services.
- Add an end-to-end smoke test (e.g. Playwright) against a preview deploy.
- Set a coverage threshold in the Vitest configs once coverage stabilises.
