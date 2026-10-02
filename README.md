# Upay Financial Coach

The application now includes signup/login, persistent sessions, protected dashboard, transactions, savings goals/contributions/pause/resume, analytics, AI coaching/recommendations, simulator/affordability, and profile pages. See [RECOVERY_REPORT.md](RECOVERY_REPORT.md) for recovery findings, verification limits, and the manual end-to-end checklist.

For this already configured workspace, start with `npm.cmd run dev` and open `http://127.0.0.1:3000`. Do not repeat database setup or seed commands to start the existing database. For production, run `npm.cmd run build`, then `npm.cmd run start`.

Email-confirmation signup uses `/auth/callback`. If confirmation is enabled, allow your local callback URL in the existing Supabase Auth redirect configuration. Never put secret/service-role keys in public configuration. The server passes only the validated publishable/anon key to the browser.

Next.js App Router, TypeScript, Prisma 7.10, PostgreSQL/Supabase, and Zod. Implements the core transaction/goal/dashboard APIs, Phase 3 analytics/wellness, Phase 5 Gemini coaching/recommendations, and Phase 6 simulator/affordability. Admin APIs and other unlisted PDF modules are outside this implementation.

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
| GET, PATCH, DELETE | `/api/v1/goals/:id` | Goal details, active/paused-goal updates, archive |
| GET, POST | `/api/v1/goals/:id/contributions` | Contribution history or atomic contribution |
| GET, POST | `/api/v1/transactions` | Filtered list or synthetic creation |
| GET, PATCH, DELETE | `/api/v1/transactions/:id` | Owned transaction details or eligible mutation |
| GET | `/api/v1/dashboard/summary` | Cash flow, savings progress, latest stored insights |
| GET | `/api/v1/analytics/spending` | Category spending, income/expense totals, monthly trends, comparison |
| POST | `/api/v1/analytics/refresh` | Recalculate and persist a spending insight snapshot |
| POST | `/api/v1/goals/:id/savings-plan` | Backend-calculated personalized savings scenario |
| GET | `/api/v1/financial-health` | Live wellness scores or paginated stored history |
| POST | `/api/v1/financial-health/refresh` | Calculate scores and optionally store a snapshot |
| GET, POST | `/api/v1/coach/conversations` | List/create conversations |
| DELETE | `/api/v1/coach/conversations/:id` | Delete owned conversation and messages |
| GET, POST | `/api/v1/coach/conversations/:id/messages` | List messages or generate/persist a coach response |
| GET | `/api/v1/recommendations` | Paginated recommendations with status/priority filters |
| PATCH | `/api/v1/recommendations/:id` | Mark VIEWED, COMPLETED, or DISMISSED |
| POST | `/api/v1/simulator/what-if` | Read-only hypothetical savings projection |
| POST | `/api/v1/affordability/check` | Recorded-data purchase assessment and optional AI explanation |

All implemented API responses use `{ success, message, data, meta? }`. Validation errors are 400, missing/expired auth 401, missing application profile or prohibited mutations 403, missing owned resources 404, unexpected errors 500, successful reads/updates/deletes 200, and new goals/transactions/contributions 201. Profile synchronization is an upsert and returns 200. Errors do not expose credentials or database internals. Unsupported methods on implemented routes return 400 in the envelope, within the PDF's status-code set. HEAD follows HTTP semantics and has no response body.

## Savings goals

```http
POST /api/v1/goals
Authorization: Bearer <access_token>
Content-Type: application/json

{"goalName":"Emergency fund","targetAmount":50000,"currentAmount":5000,"targetDate":"2027-10-01"}
```

The response contains `goalId`, `goalName`, `targetAmount`, `currentAmount`, `remainingAmount`, `targetDate`, `requiredMonthlySaving`, `status`, plus progress and timestamps. Amounts are JSON numbers in BDT, nonnegative, at most two decimal places, and no greater than one trillion. Target amounts must be positive; current amounts cannot exceed the target. Creation deadlines must be future calendar dates in Asia/Dhaka. An already-funded goal starts as COMPLETED.

The PDF does not specify the monthly formula. This implementation computes `months = max(1, ceil(daysUntilTarget / (365.25 / 12)))`, then rounds `remainingAmount / months` upwards to a cent. Overdue unfunded goals return the remaining amount as the required monthly saving and `isOverdue: true`. Calculations use Prisma Decimal before JSON serialization. Goal DELETE archives as CANCELLED and preserves contribution history. Completed goals cannot be archived; PATCH applies to active or paused goals, allowing a paused goal to resume as ACTIVE. Existing contribution history prevents replacing the goal amount directly.

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

Savings-plan deadline feasibility prorates projected monthly saving over the actual remaining days (using 30-day months). This prevents a short deadline from being marked feasible merely because the rounded monthly target fits a full month's surplus.

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

## Phase 5: AI coach and recommendations

Set a valid `GEMINI_API_KEY` in the server's `.env`. Do not use a `NEXT_PUBLIC_` key. `GEMINI_MODEL` is optional and defaults to `gemini-3.5-flash-lite`; choose a model your account can access. The official `@google/genai` SDK is used only in a `server-only` module. [Google SDK configuration](https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html), [available models](https://ai.google.dev/gemini-api/docs/models).

Standard keys and newer `AQ.Ab...` authorization keys both use `apiKey`. The backend explicitly sets `vertexai: false`, overriding Cloud/Vertex environment flags. `GEMINI_API_KEY` takes precedence in this application; `GOOGLE_API_KEY` is a fallback when it is absent. A key associated with project `gen-lang-client-0619208689` (number `400529954359`) already carries its project association: do not pass `project`, `location`, or OAuth credentials to this Gemini API client. No Google Auth library or service-account JSON file is needed for this key flow. Authorization keys are bound to a service account; Google still enforces its permissions, API availability, and key restrictions. [Google key authentication documentation](https://ai.google.dev/gemini-api/docs/api-key).

After changing `.env`, restart the Next.js server. Verify authentication with `node --conditions=react-server --import tsx scripts/verify-gemini.ts`; this sends only invented test context and prints no credentials.

`npm run verify:gemini` runs the same full structured-response check. If Google denies access, `npm run diagnose:gemini` prints only status and allowlisted diagnostic flags; it never prints the raw provider response or key. A 403 permission-denied response must be resolved in the key's Cloud project or by supplying an authorized replacement key. Adding a project number to the client does not grant access.

Both scripts load the root `.env` relative to their file location while preserving existing process environment values. They report whether the selected credential matches `.env` without printing it. Diagnostics and coaching share the official `generativelanguage.googleapis.com/v1beta` endpoint, a 30-second per-attempt timeout, at most two attempts for transient HTTP errors, and a 45-second total deadline. Permission and quota errors are not retried. Diagnostics report attempt status and timing and distinguish HTTP 504 from a local abort or network failure. The SDK uses Node fetch; this code installs no custom proxy. Proxy environment presence is reported without printing proxy addresses.

Create a conversation with POST `/api/v1/coach/conversations`, body `{ "title": "Savings coaching" }` (or `{}`). Use the returned `conversationId`:

```http
POST /api/v1/coach/conversations/<conversation-id>/messages
Authorization: Bearer <access_token>
Content-Type: application/json

{"message":"Amar khoroch kivabe komabo?","language":"banglish","goalId":"<optional-owned-goal-id>"}
```

Only `message` is required (1–2000 characters). Optional language is `bn` (Bengali script), `banglish` (Latin-script Bangla), or `en`; omitted language uses the profile's preferred language. An optional goal must be owned. Gemini gets computed 90-day monthly averages, up to five category summaries, aggregate goal savings, the selected goal's numerical summary, and up to six recent USER/ASSISTANT messages truncated to 2000 characters each. Account IDs, email, phone, goal names, merchant names, transaction descriptions, and transaction histories are excluded from the structured metrics. Chat text is necessarily sent to the provider, so avoid putting credentials or personal identifiers into messages. Category names and chat history are explicitly treated as untrusted data in the system prompt.

The backend computes the financial metrics. Gemini is instructed to explain those values and generate qualitative suggestions rather than perform calculations; it has no tools or database access. Structured model output is validated with Zod. AI text remains generated advice and is not an authoritative calculation; deterministic financial endpoints return the authoritative numbers. Server-side timeouts bound the provider request, and invalid responses, key/model errors, quota errors, or timeouts return sanitized 500 envelopes without logging prompts or credentials.

On success, USER and ASSISTANT messages and zero to three recommendations are saved in one transaction; the response is 201 with `userMessage`, `assistantMessage`, and `recommendations`. Provider calls run outside database transactions. Failed calls leave no orphan messages. An optimistic conversation timestamp guard prevents a stale response from being committed after another turn or deletion. Send one turn at a time; conflicts return 400. Responses are not idempotent: automatic retries after an uncertain network result may create another turn. GET message history is paginated chronologically; DELETE conversation removes its messages but leaves account recommendations.

GET `/api/v1/recommendations?status=NEW&priority=HIGH&page=1&pageSize=20` lists the current user's records (maximum page size 100). PATCH an owned ID with `{ "status": "VIEWED" }`, `COMPLETED`, or `DISMISSED`. Clients cannot set NEW, change recommendation text, set priority, or inject another user ID. Recommendations are generated during successful coach turns.

Recommendation transitions: NEW permits VIEWED/COMPLETED/DISMISSED; VIEWED permits COMPLETED/DISMISSED. COMPLETED and DISMISSED are terminal and display no action buttons. A PATCH requesting the already-stored status returns 200 without writing. Other terminal transitions return 400 without changing the record. Updates compare the expected current status atomically within the existing Serializable transaction; a concurrent loser returns a safe 400 conflict and can refresh/retry (an identical winning action then returns the no-op success). Only status is written; content, priority and history are preserved. No database migration or historical status rewrite is required.

## Phase 6: simulator and purchase affordability

```http
POST /api/v1/simulator/what-if
Authorization: Bearer <access_token>
Content-Type: application/json

{"monthlyIncome":30000,"monthlyExpenses":22000,"monthlySaving":5000,"goalId":"<optional-owned-goal-id>","horizonMonths":12}
```

The three monthly amounts are required, nonnegative BDT numbers with at most two decimals. `goalId` is optional; `horizonMonths` defaults to 12 and ranges from 1 to 120. The PDF does not define how `monthlySaving` relates to cash flow, so this implementation treats it as a requested allocation: `projectedMonthlySaving = min(monthlySaving, max(monthlyIncome - monthlyExpenses, 0))`. The response includes the Section 5.11 fields `projectedMonthlySaving`, `projectedGoalDate`, `monthsToGoal`, and `assumptions`, plus horizon savings and deficits. Goal months round up from remaining amount/projected saving. No capacity yields null date/months; funded goals yield zero months and today's date. Dates use end-of-month contributions and clamp calendar month ends; timelines exceeding 100 years retain the numerical months but have a null projected date. No goal means no goal date/months. Interest, fees, inflation, and other goal commitments are excluded. Only the referenced goal is read; no financial records are mutated.

```http
POST /api/v1/affordability/check
Authorization: Bearer <access_token>
Content-Type: application/json

{"purchaseAmount":5000,"emergencyBufferMonths":3,"explain":false}
```

`purchaseAmount` is required and positive. Optional fields: owned `goalId`, emergency buffer 0–12 months (default 3), `explain` (default false), and `language`. The backend calculates recorded all-time income minus expenses through today's Bangladesh date, recent 90-day monthly income/expenses, noncancelled goal savings treated as reservations, and a recent-expense emergency buffer. `availableForPurchase = max(recordedBalance - goalSavings - emergencyBuffer, 0)`. It returns `AFFORDABLE` only when recent income is present, purchase fits available funds, and monthly net cash flow covers the selected ACTIVE goal's required saving. `CAUTION` means it fits the recorded balance but fails reserves/cash-flow checks; `NOT_AFFORDABLE` means it exceeds that balance; `INSUFFICIENT_DATA` means recorded history/recent income is insufficient. These are explicit illustrative rules, not live wallet balances, credit scores, lending decisions, or formulas prescribed by the PDF. Existing expense records may overlap with goal reservations; response limitations state this.

`explain:true` sends only the calculated assessment to Gemini for a narrative in the chosen/profile language. The backend decision is retained; the LLM never recalculates it. An explanation failure returns a safe 500; retry with `explain:false` for the deterministic assessment. Affordability checks and explanations do not store messages, recommendations, or financial changes. Both Phase 6 endpoints require authentication and enforce ownership of optional goals.

## Verification

```powershell
npm run typecheck
npm test
npm run build
node scripts/smoke.mjs
node --conditions=react-server --import tsx scripts/verify-gemini.ts
```

The tests use mocked Prisma/auth dependencies to verify authentication, validation, ownership predicates, envelopes, financial arithmetic, filters, and transactional mutations. Run the smoke script while the app is running; it checks live unauthenticated routes, unknown paths, and unsupported methods. Live authenticated database tests additionally require a real Supabase user session. `npx tsx scripts/verify-database.ts` checks database setup without exposing records. Dependency overrides patch Prisma's config tooling while retaining the matched Prisma 7 client and CLI. `prisma.config.ts` imports `defineConfig` from `@prisma/config` and uses `DIRECT_URL` (falling back to `DATABASE_URL`) as its single CLI URL: Prisma 7 removed `datasource.directUrl`. Runtime, seed, and verification clients use the PostgreSQL driver adapter with `DATABASE_URL`.

Implementation references: [Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route), [Prisma 7 upgrade guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7), [Supabase server authentication](https://supabase.com/docs/reference/javascript/auth-getuser).
