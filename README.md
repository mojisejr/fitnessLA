# fitnessLA

Gym management system focused on accounting integrity first: strict shift control, POS flow, and audit-friendly financial data.

## Current State

- Real mode auth migrated to Better-Auth cookie sessions
- Core protected app routes are guarded by middleware
- Real adapter is wired for products, shifts, orders, expenses, daily summary, and admin user creation
- General Ledger CSV export and product revenue account mapping are now wired on the frontend
- Latest verification passed: build + lint + tests (93/93)

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Useful Scripts

```bash
npm run build
npm run lint
npm run test
npm run db:migrate
npm run db:seed
npm run db:seed:users
npm run db:seed:real-mode
```

## Docs Map

- `project_map.md`
- `docs/main.md`
- `docs/Status_2026-03-13_Agent-B_End_Of_Day.md`
- `docs/Handoff_2026-03-13_Frontend_to_Backend_Next.md`
- `docs/Plan_2026-03-13_Frontend_Next_Real_Mode.md`
- `docs/Handoff_2026-03-11_Agent-B_Real-Mode.md`
- `docs/Local_Real_Mode_Runbook.md`
- `docs/Vercel_Real_Auth_Checklist.md`
- `docs/API_Contract.md`

## Immediate Next Steps

- Prepare real `.env` and seed data, then run `docs/Phase_G_Smoke_Checklist.md`
- Validate POS, COA, and GL against real data with `NEXT_PUBLIC_APP_ADAPTER=real`
- Hand backend the follow-up list in `docs/Handoff_2026-03-13_Frontend_to_Backend_Next.md`
