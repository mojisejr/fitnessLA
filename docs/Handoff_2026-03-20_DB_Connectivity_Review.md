# Handoff 2026-03-20: DB Connectivity Review

## Scope

Review current real-mode grounding and write down what is confirmed, what is still unresolved, and what the next person should check if the app still appears unable to connect to the database.

## Executive Summary

As of 2026-03-20, database connectivity is confirmed from the workspace environment through Prisma and the configured environment variables. The current codebase is wired for real mode, and live business data exists in the connected PostgreSQL/Supabase database.

What is not yet reproduced from the CLI is a hard database connectivity failure. The user-reported symptom "ยังเชื่อมต่อ database ไม่ได้" is therefore likely to be an application-level runtime issue, a session/auth flow issue, or an environment mismatch between the shell and the actual app process, rather than a simple lack of database reachability.

## Confirmed Facts

### 1. Real mode is configured

- `.env` contains `NEXT_PUBLIC_APP_ADAPTER="real"`.
- Frontend adapter selection in `src/features/adapters/adapter-provider.tsx` switches to `realAppAdapter` when `NEXT_PUBLIC_APP_ADAPTER === "real"`.

### 2. Prisma migrations are applied on the connected DB

- `npx prisma migrate status` reported:
  - schema loaded from `prisma/schema.prisma`
  - datasource connected to Supabase/PostgreSQL
  - 7 migrations found
  - database schema is up to date

### 3. Database reachability is confirmed from the workspace

The following probes succeeded from the current workspace:

- `DATABASE_URL: OK`
- `DIRECT_URL: OK`
- current runtime-like Prisma client path using `DATABASE_URL` only: `OK`
- fallback Prisma path using `DIRECT_URL ?? DATABASE_URL`: `OK`

This means the workspace can reach the configured database using both connection strings.

### 4. Real business data exists in the connected DB

Observed from live Prisma queries:

- `products = 59`
- `orders = 9`
- `shifts = 10`
- `journals = 27`
- `members = 0`
- document sequences exist for `ORDER` and `INVOICE`

This confirms the app is not pointing to an empty mock-only database.

## Code Review Findings

### A. Members route was previously returning generic fetch failures

`GET /api/v1/members` had no defensive `try/catch`, so backend failures could surface as generic frontend `Request failed` errors.

Status:

- fixed in `src/app/api/v1/members/route.ts`
- covered by backend test `tests/backend/members-routes.test.ts`

### B. Product routes were not consistently returning JSON on unexpected failures

`GET /api/v1/products` and some product mutation paths could leak less useful failure behavior to the frontend.

Status:

- hardened in `src/app/api/v1/products/route.ts`
- hardened in `src/app/api/v1/products/[productId]/route.ts`
- covered by backend test `tests/backend/product-routes.test.ts`

### C. Membership revenue fallback was misclassified

When a membership product had no explicit `revenueAccountId`, the sale posting logic could fall back to service revenue instead of membership revenue.

Status:

- fixed in `src/features/operations/services.ts`
- covered by backend test `tests/backend/operations-services.test.ts`

Impact:

- POS checkout accounting becomes more accurate
- summary/profit reports are less likely to look "mock" or wrong because of misclassified revenue

## Important Runtime Observations

### Open shifts currently exist in the live DB

At review time, open shifts were present for seeded owner/admin users.

Why this matters:

- order creation requires the logged-in user to create the order inside their own open shift
- if the UI is logged in as a different user than the current shift owner, checkout can fail even though DB connectivity is fine

This is an application/authorization/state issue, not a raw DB connectivity issue.

### Members table is currently empty

The database query returned `members = 0`.

Why this matters:

- members page should still load successfully and show empty state
- if the page still shows a failure, the bug is in API/session/runtime behavior, not in the absence of member rows itself

## Most Likely Causes If The App Still "Cannot Connect"

The symptom is probably one of these rather than a literal DB network failure:

1. The app process is not using the same env file/shell context as the successful CLI probes.
2. Better Auth session/cookie state is missing or stale, causing API routes to fail as unauthenticated.
3. The logged-in user is not the owner of the currently open shift, causing POS actions to fail even though the DB is reachable.
4. Frontend is receiving API errors that are interpreted as connectivity issues by the user.
5. The app is running against a different deployment environment than the local shell that was probed.

## Recommended Next Steps For The Next Person

### Step 1: Reproduce from the app process, not just the shell

- Start the app in the same workspace that contains the working `.env`.
- Confirm the app process is reading the same `DATABASE_URL`, `DIRECT_URL`, and `NEXT_PUBLIC_APP_ADAPTER` values.
- Capture browser Network responses for:
  - `/api/v1/products`
  - `/api/v1/orders`
  - `/api/v1/members`
  - `/api/v1/reports/daily-summary`

### Step 2: Check auth/session before blaming DB

- Validate login using the real auth flow.
- Confirm `/api/auth/session` returns an authenticated user.
- Confirm protected API routes are failing or succeeding with a clear JSON response.

### Step 3: Check shift ownership for POS failures

- Verify the logged-in user has an open shift.
- Verify that shift belongs to the same user creating the order.
- If checkout fails, inspect whether the route returns `SHIFT_OWNER_MISMATCH` or `SHIFT_NOT_OPEN`.

### Step 4: Verify the exact runtime environment

- If local shell succeeds but deployed app fails, compare env vars between local and deployment.
- If Vercel or another deployment target is used, check that `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`, and `NEXT_PUBLIC_APP_ADAPTER` are all present there.

## Files Touched In This Review Cycle

- `src/app/api/v1/members/route.ts`
- `src/app/api/v1/products/route.ts`
- `src/app/api/v1/products/[productId]/route.ts`
- `src/features/operations/services.ts`
- `tests/backend/members-routes.test.ts`
- `tests/backend/product-routes.test.ts`
- `tests/backend/operations-services.test.ts`

## Validation Completed

- targeted backend tests passed:
  - `tests/backend/members-routes.test.ts`
  - `tests/backend/product-routes.test.ts`
  - `tests/backend/operations-services.test.ts`

## Bottom Line

The repository is already wired to the real database, and the current workspace can reach that database successfully. The unresolved issue is more likely app runtime/session/shift state or environment mismatch at execution time, not absence of database connectivity itself.