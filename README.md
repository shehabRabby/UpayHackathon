# Upay Financial Coach backend

Next.js App Router, TypeScript, Prisma 7.10, PostgreSQL/Supabase, and Zod. Implements Sections 5.2, 5.3, 5.6, and 5.11, plus profile synchronization, category listing, and Phase 3 spending analytics, deterministic savings plans, and illustrative financial wellness. Gemini narration, admin APIs, and other PDF modules are outside this implementation.

## Setup

Requires a Prisma-supported Node.js version (20.19+, 22.12+, or 24+) and the `.env` values shown in `.env.example`. Both the existing `SUPBASE_*` names and correctly spelled `SUPABASE_*` auth names work. The secret/service-role key is not used by the API.

```powershell
npm install
npx prisma validate
npx prisma db push
npx prisma db execute --file prisma/supplemental-constraints.sql
npx prisma db execute --file prisma/row-level-security.sql
npm run db:seed
npm run dev
```

The schema uses `DATABASE_URL` for runtime queries and `DIRECT_URL` for schema operations. Both credentials stay server-side. `db push` does not create a migration history. If it warns about deleting existing data, inspect the warning before proceeding. Supabase Auth stays outside Prisma management. The SQL scripts add the Auth foreign key, checks, and row-level security; Prisma alone cannot configure them. RLS permits authenticated users to read their own records through the Data API; writes go through the validated Next.js handlers. The privileged Prisma connection bypasses RLS, so every handler explicitly enforces ownership.

## Authentication

Prisma 7 requires `schemas = ["public", "auth"]` and explicit model/enum schema mappings to preserve the existing profile-to-Auth foreign key. The `SupabaseAuthUser` model represents only the referenced ID; `prisma/external-auth.ts` lists Supabase-owned tables/enums as externally managed. Never remove these external declarations or accept a data-loss warning involving Auth tables. If Supabase introduces additional Auth objects, refresh that inventory before syncing. All connection URLs remain in configuration/runtime code, not `schema.prisma`.

Sign in using Supabase Auth. Send `Authorization: Bearer <access_token>` with API calls, or use a Supabase SSR session cookie. The server verifies authentication with `auth.getUser()`; it does not trust a client-supplied UUID. Create the application profile before calling protected routes:

```http
POST /api/v1/auth/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{"fullName":"Demo User","preferredLanguage":"bn-BD"}
```

The UUID and email come from the verified Supabase user. No demo auth bypass is provided.

## Implemented endpoints

| Method | Path | Behavior |
| --- | --- | --- |
| POST | `/api/v1/auth/profile` | Create/sync authenticated profile |
| GET | `/api/v1/categories` | Active categories; optional `type=income` or `expense` |
| GET, POST | `/api/v1/goals` | Paginated goal list or create goal |
| GET, PATCH, DELETE | `/api/v1/goals/:id` | Goal details, active-goal updates, archive |
| GET, POST | `/api/v1/goals/:id/contributions` | Contribution history or atomic contribution |
| GET, POST | `/api/v1/transactions` | Filtered list or synthetic creation |
| GET, PATCH, DELETE | `/api/v1/transactions/:id` | Owned transaction details or eligible mutation |
| GET | `/api/v1/dashboard/summary` | Cash flow, savings progress, latest stored insights |
| GET | `/api/v1/analytics/spending` | Category spending, income/expense totals, monthly trends, comparison |
| POST | `/api/v1/analytics/refresh` | Recalculate and persist a spending insight snapshot |
| POST | `/api/v1/goals/:id/savings-plan` | Backend-calculated personalized savings scenario |
| GET | `/api/v1/financial-health` | Live wellness scores or paginated stored history |
| POST | `/api/v1/financial-health/refresh` | Calculate scores and optionally store a snapshot |

All implemented API responses use `{ success, message, data, meta? }`. Validation errors are 400, missing/expired auth 401, missing application profile or prohibited mutations 403, missing owned resources 404, unexpected errors 500, successful reads/updates/deletes 200, and new goals/transactions/contributions 201. Profile synchronization is an upsert and returns 200. Errors do not expose credentials or database internals. Unsupported methods on implemented routes return 400 in the envelope, within the PDF's status-code set. HEAD follows HTTP semantics and has no response body.

## Savings goals

```http
POST /api/v1/goals
Authorization: Bearer <access_token>
Content-Type: application/json

{"goalName":"Emergency fund","targetAmount":50000,"currentAmount":5000,"targetDate":"2027-10-01"}
```

The response contains `goalId`, `goalName`, `targetAmount`, `currentAmount`, `remainingAmount`, `targetDate`, `requiredMonthlySaving`, `status`, plus progress and timestamps. Amounts are JSON numbers in BDT, nonnegative, at most two decimal places, and no greater than one trillion. Target amounts must be positive; current amounts cannot exceed the target. Creation deadlines must be future calendar dates in Asia/Dhaka. An already-funded goal starts as COMPLETED.

The PDF does not specify the monthly formula. This implementation computes `months = max(1, ceil(daysUntilTarget / (365.25 / 12)))`, then rounds `remainingAmount / months` upwards to a cent. Overdue unfunded goals return the remaining amount as the required monthly saving and `isOverdue: true`. Calculations use Prisma Decimal before JSON serialization. Goal DELETE archives as CANCELLED and preserves contribution history. Completed goals cannot be archived; PATCH applies to active goals. Existing contribution history prevents replacing the goal amount directly.

Goal listing accepts `page`, `pageSize`, and `status`. Contributions accept `{ amount, transactionId?, contributionDate? }`. The source transaction must belong to the same user; its aggregate allocations cannot exceed its amount. Contributions cannot exceed the goal's remaining balance. Serializable transactions update contribution history and goal progress together. Concurrent write conflicts return 400 with a refresh/retry message; the API does not blindly retry a financial write.

## Transactions

First obtain a `categoryId` from GET `/api/v1/categories`.

```http
POST /api/v1/transactions
Authorization: Bearer <access_token>
Content-Type: application/json

{"categoryId":"<income-category-uuid>","transactionType":"CASH_IN","amount":25000,"transactionDate":"2026-10-02T09:00:00+06:00","description":"Demo salary","source":"manual"}
```

The schema's four documented types are CASH_IN, CASH_OUT, MERCHANT_PAY, MOBILE_RECHARGE. CASH_IN requires an income category; the others require an expense category. Category must be active. `source` is `mock` or `manual` (default); clients cannot create or mutate `upay_future` records. Optional fields: `merchantName`, `description`. Date-only values are accepted as UTC midnight; use ISO datetimes with offsets for exact local timestamps.

GET filters: `startDate`, `endDate`, `type`, `category` (UUID), `search` (merchant/description/category), `page` (default 1), `pageSize` (default 20, maximum 100). Example:

```text
/api/v1/transactions?type=MERCHANT_PAY&startDate=2026-10-01&endDate=2026-10-31&page=1&pageSize=20
```

Date-only end filters include the full UTC day. Full datetime end filters are inclusive. `meta` contains `page`, `pageSize`, `total`, and `totalPages`. List ordering uses timestamp and UUID for stable tie-breaking. Unknown body/query fields are rejected. Updates cannot reduce an amount below allocated contributions. Deleting a synthetic transaction preserves contribution history and clears its optional source reference.

## Dashboard

`balance` is all recorded income minus expenses; it is an illustrative cash-flow balance, not an Upay wallet balance. Monthly totals use Bangladesh calendar month boundaries. `totalSaved` sums noncancelled goals, including completed goals. Contributions are allocations to goals and do not create duplicate cash-flow transactions. Dashboard includes at most 20 ACTIVE/PAUSED goals, the latest 5 stored insights, and 5 recent transactions. An empty account returns zero totals and empty lists. No LLM computes financial totals.

## Phase 3 calculations

The PDF specifies these metrics but does not prescribe formulas, thresholds, or date-filter contracts. The choices below are versioned implementation assumptions. Calculations use Prisma Decimal, and queries use verified user IDs in parameterized PostgreSQL aggregation inside repeatable-read transactions. No schema migration is required.

Spending GET accepts `startDate` and `endDate` as `YYYY-MM-DD`; POST refresh accepts the same optional keys in JSON. Send `{}` for defaults. The default range is the last 90 inclusive days through today in Asia/Dhaka. A supplied `endDate` anchors the default start date. Dates cannot be in the future, and ranges are limited to 366 days. Bangladesh midnight boundaries are converted to UTC for the timestamp columns. Historical disabled categories still contribute to analytics. All recorded sources are included.

```http
GET /api/v1/analytics/spending?startDate=2026-09-01&endDate=2026-09-30
Authorization: Bearer <access_token>
```

The response has `period`, `totalIncome`, `totalExpenses`, `netCashFlow`, `transactionCount`, `categorySpending`, `spendingTrends`, `comparison`, and `calculationVersion`. Category percentages use total expenses as the denominator. Monthly trend bins include zero-activity months; boundary months may be partial. Comparison uses the immediately preceding equal-length date window. Percentage changes with a zero previous value are `null`, not fabricated growth percentages. GET always calculates from transactions. POST refresh additionally appends a `spending_summary` insight with these results in metadata and returns `insightId` and `refreshedAt`; it does not mutate transactions or goals. Repeated refresh calls create separate insight snapshots.

```http
POST /api/v1/goals/<goal-id>/savings-plan
Authorization: Bearer <access_token>
Content-Type: application/json

{"lookbackMonths":3,"spendingReductionPercent":10}
```

Both fields are optional with the defaults shown. Lookback is 1–12 rolling periods of 30 days, including today; this averaging assumption differs from the calendar-based goal deadline formula. Expense reduction is a scenario between 0% and 50%. Goal must belong to the user and be ACTIVE. The engine returns the existing goal contract, `averageMonthlyIncome`, `averageMonthlyExpenses`, `monthlyNetCashFlow`, `availableMonthlySaving`, `monthlySavingsGap`, `potentialMonthlySaving`, `projectedMonthlySaving`, `remainingMonthlyGap`, `feasibleByTargetDate`, `projectedMonthsToGoal`, and category budgets with notes/assumptions. Reductions are floored to cents; deficit cash flow must be covered before cuts count as savings. The timeline is a number of 30-day saving periods; zero capacity gives `null`. Overdue deadlines are never marked feasible. No-history accounts get a zero-capacity plan with data limitations. The scenario allocates the available surplus to this goal and excludes commitments to other goals; review essential budgets before applying it. No financial records are mutated and no LLM calculates or generates this Phase 3 plan. Gemini narration belongs to Phase 5.

```http
GET /api/v1/financial-health?mode=current&lookbackMonths=3
Authorization: Bearer <access_token>
```

Current mode is the default and reads fresh transaction/goal metrics without writing. POST `/api/v1/financial-health/refresh` accepts `{ "lookbackMonths": 3, "store": true }`, with both fields optional. With `store:true` it creates a snapshot and returns 201; `store:false` returns 200 without storage. Only server-computed scores are accepted.

`wellness-v1` has four 0–100 components, each weighted 25%:

| Component | Illustrative formula |
| --- | --- |
| Savings | Net cash flow / income, scaled against a 20% savings-rate assumption |
| Spending | `(2 - expenses / income) * 50`; capped to 0–100 |
| Goals | Mean current/target progress across noncancelled goals, capped per goal |
| Emergency | Noncancelled goal savings / average monthly expenses / 3, scaled to 100 |

Zero/missing denominators yield zero component scores and explicit limitations. Missing expense data gives unknown emergency coverage (`null`), not a perfect score. The emergency component uses goal savings as a proxy because the schema has no actual emergency reserve or liquidity field; it does not assert funds are available for emergencies. These indicators are not credit scores or lending assessments. All metrics, assumptions, and limitations accompany current/refresh responses.

```text
/api/v1/financial-health?mode=history&startDate=2026-09-01&endDate=2026-10-02&page=1&pageSize=20
```

History supports inclusive assessment-date filters and pagination (maximum page size 100), scoped to the current user, ordered by date and UUID. It returns the stored scores without recalculating them. The existing health table stores only component/total scores and assessment dates, so historical `calculationVersion` is `null` and original input periods cannot be recovered. Multiple snapshots per day are allowed. The v1 formulas are documented here for current records; they are implementation assumptions rather than claims from the PDF.

## Verification

```powershell
npm run typecheck
npm test
npm run build
node scripts/smoke.mjs
```

The tests use mocked Prisma/auth dependencies to verify authentication, validation, ownership predicates, envelopes, financial arithmetic, filters, and transactional mutations. Run the smoke script while the app is running; it checks live unauthenticated routes, unknown paths, and unsupported methods. Live authenticated database tests additionally require a real Supabase user session. `npx tsx scripts/verify-database.ts` checks database setup without exposing records. Dependency overrides patch Prisma's config tooling while retaining the matched Prisma 7 client and CLI. `prisma.config.ts` imports `defineConfig` from `@prisma/config` and uses `DIRECT_URL` (falling back to `DATABASE_URL`) as its single CLI URL: Prisma 7 removed `datasource.directUrl`. Runtime, seed, and verification clients use the PostgreSQL driver adapter with `DATABASE_URL`.

Implementation references: [Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route), [Prisma 7 upgrade guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7), [Supabase server authentication](https://supabase.com/docs/reference/javascript/auth-getuser).
