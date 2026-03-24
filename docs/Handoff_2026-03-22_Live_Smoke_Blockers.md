# Handoff 2026-03-22: Live Smoke Blockers

## Scope completed

- Hid General Ledger behind the feature flag so it no longer appears from the main navigation or dashboard quick links when the flag is off.
- Added a production-targeted Playwright smoke spec at `tests/browser/pos-live-full-flow.smoke.spec.ts` for:
  - login with a real account
  - shift open
  - product create and product edit in POS
  - POS sales in real mode
  - shift close reconciliation
- Ran the real smoke flow against `https://fitness-la.vercel.app/` with username `phuwasit`.

## What worked

- Real login succeeded.
- Open-shift UI flow worked.
- POS page loaded in real mode.
- Product create from POS succeeded.
- Product edit from POS succeeded.
- The smoke flow isolated checkout failures by splitting sales into smaller groups automatically.

## What is still blocked

### 1. General Ledger is intentionally hidden for now

- The app-level feature flag is set to disable General Ledger visibility.
- The route already returns a disabled response when the flag is off.
- This is a temporary product choice, not a backend blocker.

### 2. Live POS smoke still cannot reach 100%

- The production checkout flow still fails for SKU `K1514` / `คอร์สเทรนรายเดือนแบบคู่`.
- The failure is reproducible even when selling that product alone.
- The visible POS error is `ไม่สามารถสร้างรายการขายได้`.
- This means the problem is not caused by a large mixed cart anymore.

### 3. Revenue-account repair was not enough

- The live smoke spec repairs invalid `revenue_account_id` mappings against the current COA before checkout.
- That repair did not resolve the `K1514` checkout failure.
- The remaining issue is likely deeper in production data integrity or backend order/journal logic for that product.

### 4. Active-shift API is not fully trustworthy in live reruns

- During live testing, the UI could show an open shift while `/api/v1/shifts/active` did not consistently match that state.
- The smoke spec was adjusted to rely on in-app UI state where possible.
- This inconsistency should still be reviewed separately.

## Most likely next debugging target

1. Check production backend logs for checkout requests involving SKU `K1514`.
2. Inspect the real database row for `K1514` and its related accounting/product metadata.
3. Verify any foreign-key or journal-posting assumptions that are not covered by the current API error mapping.
4. Re-run `tests/browser/pos-live-full-flow.smoke.spec.ts` after fixing `K1514`.

## Files touched for this handoff

- `src/lib/feature-flags.ts`
- `src/components/layout/app-shell.tsx`
- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/reports/general-ledger/page.tsx`
- `src/app/api/v1/reports/gl/route.ts`
- `tests/browser/pos-live-full-flow.smoke.spec.ts`