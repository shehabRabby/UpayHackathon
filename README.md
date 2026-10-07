# Upay AI Financial Coach

**Plan your savings. Check your purchase.**

An AI-assisted financial decision-support prototype for customers, focused on goal-based savings planning and purchase affordability using recorded financial activity.

**[Explore the live application](https://upay-ai-hackathon.vercel.app/)** · [Local setup](#local-development-setup) · [API reference](#api--backend-endpoints) · [Deployment guide](DEPLOYMENT.md)

> **Prototype disclosure:** This hackathon/educational project is inspired by the Upay financial ecosystem. It is **not an official Upay product**, is not endorsed by Upay, and **does not connect to a live Upay wallet**. The application uses manually recorded or synthetic/demo financial data. AI guidance is informational, not professional financial advice.

## Overview

**Target persona: Customer only.** Public pages introduce the two decision journeys; authentication opens the customer's recorded financial context. Signing in does not establish verified Upay customer status.

The core outcomes are:

1. **Goal-Based Savings Planning:** review remaining savings and required monthly pace, generate a Goal Details Savings Plan from recorded activity, and review the monthly gap, spending budgets, projected monthly saving and deadline feasibility. A separate hypothetical What-if Simulator provides scenario savings and completion estimates where possible.
2. **Purchase Affordability Assessment:** assess a planned amount against recorded cash flow, saved goal funds and an emergency-buffer assumption. Saved amounts in all non-cancelled goals are always reserved; optionally selecting an ACTIVE goal adds its required monthly saving-pace check.

Recorded transactions, dashboard and spending analytics, authenticated account access, and optional multilingual AI coaching support these outcomes. Illustrative financial wellness and profile housekeeping remain secondary utilities. Backend deterministic calculations are authoritative; the coach receives selected, precomputed context for qualitative guidance, and optional purchase explanations describe an already calculated assessment.

The prototype is designed for an MFS-oriented customer context: BDT, Asia/Dhaka dates, manually recorded cash in, cash out, merchant payments and recharge, and English, Bangla and Banglish coaching. Recording an activity does not execute it, synchronize a wallet or verify available wallet funds.

The design hypothesis is that clearer saving-pace and purchase context can support these decisions. There are currently no verified customer interviews or validated demand findings, and no claim of superiority over generic budgeting tools.

## Key features

| Area | Implemented functionality |
| --- | --- |
| Authentication | Email/password signup/login, session restoration and refresh, local sign-out, and an email-confirmation callback when required by Supabase settings. |
| Protected workspace | Auth-aware navigation, application profile synchronization, and independent server-side API authentication/ownership checks. |
| Dashboard | Recorded cash-flow balance, monthly income/expenses, goal savings, recent transactions, stored insights, spending visuals, and recommendations. |
| Transactions | Create, edit, delete, and paginate manual/mock records; search merchant, description, or category; filter by transaction type. The API also supports category/date filters. |
| Savings goals | Create/edit goals; review saved/target/remaining amounts, progress, deadlines, and monthly requirements; pause, resume, and archive eligible goals. |
| Contributions | Contribution history, optional source-transaction allocation, remaining-amount validation, and atomic balance/status updates. |
| Analytics | Income/expense/net totals, category spending, monthly trends, period comparison, custom date ranges, and saved spending-insight snapshots. |
| Financial wellness | Illustrative savings, spending, goal, and emergency components, with current assessments and saved history. |
| AI coach | Create/delete conversations, load paginated history, select a language/optional goal, receive structured coaching, and persist recommendations. |
| Recommendations | Priority/status display and backend-enforced mark-read, complete, or dismiss transitions. |
| Savings planning | Goal-specific spending-reduction plans and a hypothetical what-if savings simulator. |
| Affordability | Recorded-data purchase assessment, emergency-buffer assumptions, saved-fund reserves for all non-cancelled goals, an optional selected ACTIVE-goal monthly saving-pace check, and optional AI explanation. |
| Profile | Update full name, phone, and preferred language; email comes from Supabase Auth. |
| Presentation | Responsive public pages/workspace, custom financial visuals, accessible password visibility controls, and reduced-motion-aware effects. |

Contributions are recorded allocations, not money transfers. Simulator/affordability calculations do not create transactions or change goal balances.

## AI capabilities

### Provider and configuration

| Setting | Source-defined configuration |
| --- | --- |
| Provider / SDK | Google Gemini Developer API through `@google/genai`. |
| Default model | `gemini-3.5-flash-lite`, defined in `lib/gemini-client.ts`. |
| Override | Optional `GEMINI_MODEL`; no automatic model fallback. |
| API | `v1beta`, pinned to `https://generativelanguage.googleapis.com`; Vertex AI disabled. |
| Output | JSON `message` and up to three `recommendations`, followed by strict Zod validation. |
| Generation | Temperature `0.3`; maximum output tokens `2500`. |
| Time bounds | 30-second SDK HTTP timeout and 45-second overall abort deadline. |
| Retries | At most two SDK attempts for HTTP `408`, `500`, `502`, `503`, or `504`; no retry for HTTP `429`. |

The API key remains server-side. Public pages use static previews and make no Gemini requests.

### Coaching flow

1. Verify the authenticated user, conversation ownership, optional goal ownership, and request schema.
2. Prepare backend metrics for a three-month/90-day lookback, selected-goal figures, and up to six recent user/assistant messages, each limited to 2,000 characters.
3. Send precomputed context, history, and the submitted message to Gemini. Instructions prohibit invented balances, recalculation, transaction execution, and requests for credentials.
4. Parse JSON and validate the response. Each recommendation contains a type, text, and priority.
5. For Banglish, check both the main message and recommendation text for Bengali Unicode characters. Reject leakage locally before persistence without an extra regeneration request.
6. Commit the user message, assistant message, recommendations, and conversation update together in a serializable transaction. Provider calls run outside that transaction.

The UI sends a UUID `requestId`. Repeating an already committed request returns the stored turn; reusing the ID with a different payload is rejected. Conversation-version checking protects concurrent sends, and failed recommendation persistence rolls back the entire turn. This protects database state; concurrent requests before either commits can still consume provider quota.

| API language | Expected behavior |
| --- | --- |
| `en` | English coaching. |
| `bn` | Bangla in Bengali script. |
| `banglish` | Bangla transliterated into Latin script; English words, amounts, dates, and punctuation allowed. Bengali-block characters are rejected. |

AI generates coaching/recommendations and optional affordability explanations. Analytics, wellness scores, savings plans, simulator projections, and affordability decisions are calculated by application code.

Quotas and availability depend on the configured Google project; no fixed free-tier allowance is assumed. Sanitized diagnostics distinguish upstream HTTP failures, rate limits, timeouts, parsing/schema errors, script validation, and persistence stages. See [COACH_DIAGNOSTICS.md](COACH_DIAGNOSTICS.md).

**Privacy boundary:** Coaching sends the submitted message, limited history, and minimized financial context to Google. Avoid passwords, payment credentials, and unnecessary sensitive details. AI output may be inaccurate and is not guaranteed financial, lending, or investment advice.

## System architecture

```text
Browser
  ├── Next.js public pages + React financial workspace
  ├── AuthProvider / Supabase browser client ──────── Supabase Auth
  └── Typed API client / Bearer session token
                         |
                Next.js /api/v1 route handlers (Node.js)
                         |
             Verified identity + profile + Zod validation
                         |
           User-scoped services and financial calculations
             ├── Prisma 7 + PostgreSQL adapter ── Supabase PostgreSQL
             |                                   ├── public financial tables
             |                                   └── auth.users reference
             └── Server-only Gemini client ───── Google Gemini API
                         |
               JSON response envelope → React UI

Conditional email confirmation:
Supabase → /auth/callback → SSR code exchange/cookies → /dashboard
```

Next.js App Router provides pages and HTTP handlers in one repository. The root layout passes validated public Supabase configuration to the auth provider. The shared workspace shell manages authenticated navigation; API handlers independently verify identity with Supabase `auth.getUser()` and scope queries to that identity.

Prisma connects directly to PostgreSQL with a server-side connection string. Application profiles reference Supabase Auth UUIDs. RLS SQL restricts direct Data API reads; privileged Prisma queries enforce ownership in application code. There is no separate Express server or implemented server-action API.

## Technology stack

Versions below are declarations in `package.json`; `package-lock.json` resolves exact installed versions.

| Layer | Technology | Role |
| --- | --- | --- |
| Frontend | Next.js `16.3.8`, React/React DOM `^19.2.0` | App Router pages, layouts, interactive workspace. |
| Language | TypeScript `^5.9.3` | Strict typing across UI, APIs, and services. |
| Styling | `app/globals.css` | Custom blue/yellow design system and responsive/focus/motion styles. |
| UI / charts | Local React components, inline SVG, native progress elements, CSS visuals | No external component, icon, or charting library. |
| Animation | CSS and `IntersectionObserver` | Lightweight effects; no animation dependency. |
| Backend | Next.js Node.js route handlers | `/api/v1` endpoints and auth callback. |
| Validation | Zod `4.6.5` | Strict requests and structured AI responses. |
| Financial logic | Prisma Decimal and local `lib/` modules | Money arithmetic, analytics, wellness, projections, planning. |
| Database / ORM | Supabase PostgreSQL, Prisma/client/config/PG adapter `7.10.0` | Relational persistence and access. |
| Authentication | `@supabase/supabase-js` `2.117.2`, `@supabase/ssr` `0.12.7` | Auth, browser sessions, callback cookie exchange. |
| AI | `@google/genai` `^2.26.0`; default `gemini-3.5-flash-lite` | Coaching and optional explanations. |
| Environment / boundaries | `dotenv` `^17.2.3`, `server-only` | Script environment loading and server-only auth configuration/AI modules. |
| Unit / integration | Vitest `^4.1.11` | Mocked route, service, calculation, and component regressions. |
| Browser testing | Playwright `^1.63.0` | Installed Chrome; desktop and mobile-emulated projects. |
| Quality | ESLint `^9.39.5`, `eslint-config-next` `^16.3.8`, TypeScript | Static checking. |
| Developer tools | npm/package lock, Prisma CLI, `tsx` `^4.20.6`, Git | Installation, client generation, scripts, version control. |
| Deployment | Vercel and Supabase | Hosted Next.js, authentication, PostgreSQL. |

## Application routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Landing page and auth-aware calls to action. |
| `/about` | Public | Purpose, approach, responsible AI, prototype scope. |
| `/features` | Public | Eight product capabilities and static previews. |
| `/how-it-works` | Public | Nine-step application workflow. |
| `/security` | Public | Record isolation, AI boundaries, limitations. |
| `/login` | Public | Password login; signed-in users move to dashboard. |
| `/signup` | Public | Account creation and conditional confirmation status. |
| `/auth/callback` | Public callback | GET code-exchange handler, not a content page. |
| `/dashboard` | Authenticated | Financial overview and insights. |
| `/transactions` | Authenticated | Creation, filters, history, edit/delete. |
| `/goals` | Authenticated | Goal creation, status filters, progress. |
| `/goals/[id]` | Authenticated; owned goal | Detail, contributions, edit/status controls, savings plan. |
| `/analytics` | Authenticated | Spending analysis and wellness/history. |
| `/coach` | Authenticated | Conversations, multilingual coach, recommendations. |
| `/planning` | Authenticated | Simulator and affordability. |
| `/profile` | Authenticated | Profile and language preference. |

Workspace protection lives in `components/app-shell.tsx`: restore session, then redirect unauthenticated users to `/login`. APIs independently enforce server authentication; an HTTP page-shell response does not authorize financial data access. `app/error.tsx` supplies an error boundary.

## API / backend endpoints

All application APIs are under `/api/v1`. **Auth** means a verified Supabase Bearer token or SSR cookie. **Profile** means an application profile must also exist. The frontend normally uses Bearer tokens through `AuthProvider` and `lib/frontend/api-client.ts`.

Mutations accept JSON; GET inputs are query parameters. `[id]` is a validated UUID. Outputs below describe the envelope's `data` field.

| Method | Endpoint | Authentication | Purpose / caller | Main input | Main output |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/auth/profile` | Auth | Auth provider / profile page | None | ID, name, auth-controlled email, phone, language. |
| POST | `/api/v1/auth/profile` | Auth | Create/sync/update profile | `fullName`; optional `phone`, `preferredLanguage` | Upserted profile; ID/email derived from Auth. |
| GET | `/api/v1/categories` | Auth + Profile | Transaction category choices | Optional `type=income` or `expense` | Active categories. |
| GET | `/api/v1/transactions` | Auth + Profile | History/filtering | Pagination; optional `type`, `category`, `search`, `startDate`, `endDate` | Transactions/category details; pagination. |
| POST | `/api/v1/transactions` | Auth + Profile | Record transaction | `categoryId`, `transactionType`, `amount`, `transactionDate`; optional `merchantName`, `description`, `source` | Created manual/mock transaction. |
| GET | `/api/v1/transactions/[id]` | Auth + Profile | Retrieve owned transaction | Transaction UUID | Transaction/category details. |
| PATCH | `/api/v1/transactions/[id]` | Auth + Profile | Edit eligible transaction | Nonempty partial create fields except `source` | Updated transaction. |
| DELETE | `/api/v1/transactions/[id]` | Auth + Profile | Delete eligible transaction | Transaction UUID | Deleted ID; contribution history retained. |
| GET | `/api/v1/goals` | Auth + Profile | Goals / selectors | Pagination; optional `status` | Goals/calculated progress; pagination. |
| POST | `/api/v1/goals` | Auth + Profile | Create goal | `goalName`, `targetAmount`, `currentAmount`, `targetDate` | Created goal/progress. |
| GET | `/api/v1/goals/[id]` | Auth + Profile | Goal detail | Goal UUID | Goal, remaining, progress, monthly requirement. |
| PATCH | `/api/v1/goals/[id]` | Auth + Profile | Edit/pause/resume | Nonempty subset of goal fields / `status` | Updated goal. |
| DELETE | `/api/v1/goals/[id]` | Auth + Profile | Archive eligible goal | Goal UUID | `CANCELLED` goal; no physical deletion. |
| GET | `/api/v1/goals/[id]/contributions` | Auth + Profile | Contribution history | Goal UUID; pagination | Contributions; pagination. |
| POST | `/api/v1/goals/[id]/contributions` | Auth + Profile | Record contribution | `amount`; optional `transactionId`, `contributionDate` | Contribution and updated goal. |
| POST | `/api/v1/goals/[id]/savings-plan` | Auth + Profile | Goal savings scenario | Optional `lookbackMonths`, `spendingReductionPercent` | Budgets, gaps, feasibility, assumptions, notes. |
| GET | `/api/v1/dashboard/summary` | Auth + Profile | Dashboard | None | Cash-flow/monthly totals, savings/goals, recent transactions/insights. |
| GET | `/api/v1/analytics/spending` | Auth + Profile | Analytics / dashboard | Optional `startDate`, `endDate` | Totals, categories, trends, comparison, period. |
| POST | `/api/v1/analytics/refresh` | Auth + Profile | Refresh/save insight | Optional `startDate`, `endDate` | Summary, persisted `insightId`, timestamp. |
| GET | `/api/v1/financial-health` | Auth + Profile | Wellness or history | Current: `mode`, `lookbackMonths`; history: `mode=history`, pagination, optional dates | Current scores/metrics or saved score history. |
| POST | `/api/v1/financial-health/refresh` | Auth + Profile | Calculate/save assessment | Optional `lookbackMonths`, `store` | Scores, storage status, optional `healthId`. |
| GET | `/api/v1/coach/conversations` | Auth + Profile | Coach sidebar | Pagination | Owned conversations; pagination. |
| POST | `/api/v1/coach/conversations` | Auth + Profile | Start conversation | Optional `title` | Conversation; no Gemini request. |
| DELETE | `/api/v1/coach/conversations/[id]` | Auth + Profile | Delete conversation | Conversation UUID | Deleted ID; messages cascade-delete. |
| GET | `/api/v1/coach/conversations/[id]/messages` | Auth + Profile | History | Conversation UUID; pagination | Chronological messages; pagination. |
| POST | `/api/v1/coach/conversations/[id]/messages` | Auth + Profile | Send to coach | `message`; optional `language`, `goalId`, `requestId` | User/assistant messages, recommendations; retry replay. |
| GET | `/api/v1/recommendations` | Auth + Profile | Recommendation cards | Pagination; optional `status`, `priority` | Recommendations; pagination. |
| PATCH | `/api/v1/recommendations/[id]` | Auth + Profile | Read/complete/dismiss | `status=VIEWED`, `COMPLETED`, or `DISMISSED` | Updated recommendation or same-status no-op. |
| POST | `/api/v1/simulator/what-if` | Auth + Profile | Planning simulator | `monthlyIncome`, `monthlyExpenses`, `monthlySaving`; optional `horizonMonths`, `goalId` | Projections/timeline, assumptions, limitations. |
| POST | `/api/v1/affordability/check` | Auth + Profile | Purchase assessment | `purchaseAmount`; optional `goalId`, `explain`, `emergencyBufferMonths`, `language` | Decision/reserves, assumptions, optional explanation. |

### Response and validation contract

```json
{
  "success": true,
  "message": "Human-readable result",
  "data": {},
  "meta": { "page": 1, "pageSize": 20, "total": 0, "totalPages": 0 }
}
```

`meta` is optional. Errors use `success: false`, `data: null`, and a safe message; validation can include `meta.issues` with field paths/messages. Responses use `Cache-Control: no-store`. Reads/updates/deletes and profile upserts normally return `200`; new records/coach turns return `201`; replayed turns return `200`. Stored wellness assessments return `201`, or `200` with `store=false`.

| Status | Meaning |
| --- | --- |
| `400` | Invalid input, prohibited transition, stale/conflicting update, or unsupported method on a registered endpoint. |
| `401` | Missing/malformed/expired/invalid authentication. |
| `403` | Missing profile or prohibited authenticated operation. |
| `404` | Missing owned resource or unknown endpoint. |
| `500` | Sanitized database, auth-service, configuration, or AI failure. Upstream Gemini `429` is classified in diagnostics and currently maps to an application `500` quota message. |

Important validation/business rules:

- Pagination defaults to page `1`, size `20`; size is bounded to `1–100`.
- Money is finite, at most `1,000,000,000,000`, with at most two decimal places. Transactions, targets, contributions, and purchases must be positive; simulator amounts and initial savings may be zero.
- Transaction type must match an active category. Only `manual`/`mock` records can be created/edited/deleted through these endpoints.
- New/changed goal dates must be after today in Asia/Dhaka. Saved amount cannot exceed target. Contributions require an active goal and cannot exceed remaining savings or a linked transaction's unallocated amount.
- Goals with contribution history cannot have saved amounts overwritten directly. Only active/paused goals can be edited; completed goals cannot be archived.
- Analytics dates cannot be in the future; start cannot exceed end. Default period: 90 days; custom periods: at most 366 days.
- Lookback: `1–12` months; spending reduction: `0–50%`; simulator horizon: `1–120` months; emergency buffer: `0–12` months.
- Names/titles are trimmed and bounded to 200 characters; merchant to 200; transaction description/coach input to 2,000. AI message output is bounded to 8,000, recommendation text to 1,000, and recommendation count to three.
- Recommendations: `NEW → VIEWED / COMPLETED / DISMISSED`; `VIEWED → COMPLETED / DISMISSED`. `COMPLETED` and `DISMISSED` are terminal. Repeating the same status is a no-op; conditional updates in a serializable transaction prevent stale transitions.

`proxy.ts` enforces supported methods; eligible GET routes also permit HEAD with bodyless HTTP semantics. `/api/v1` and `/api/v1/[...path]` return fallback `404` envelopes, not additional product APIs. Signup/login/logout use the Supabase SDK directly; there are no application endpoints or server actions for them.

## Database design

Ten application models live in `public`, alongside a minimal externally managed Auth reference.

```text
auth.users (Supabase-managed)
  └── public.users (same UUID; profile)
        ├── transactions ───────────── categories (shared catalog)
        |     └── goal_contributions ─ savings_goals
        ├── savings_goals
        |     └── goal_contributions (optional transaction link)
        ├── financial_health
        ├── financial_insights
        ├── ai_conversations
        |     └── ai_messages
        └── recommendations
```

| Model | Purpose / relationships |
| --- | --- |
| `users` | Profile keyed by `auth.users.id`; owns financial records/conversations. |
| `categories` | Shared income/expense catalog with active flag. |
| `transactions` | Owned category/type/Decimal amount/date/source record with merchant/description. |
| `savings_goals` | Owned target/current amounts, deadline, status. |
| `goal_contributions` | Goal allocation with optional transaction link; ownership follows goal. |
| `financial_health` | Saved illustrative component scores and assessment date. |
| `financial_insights` | Insight title/description/type and optional JSONB metadata. |
| `ai_conversations` | Owned title and timestamps. |
| `ai_messages` | Conversation role and Unicode text. |
| `recommendations` | Owned type/text/priority/status; no conversation foreign key. |
| `SupabaseAuthUser` | Minimal Prisma reference to Supabase-managed `auth.users`. |

Money uses PostgreSQL `Decimal(18,2)`; wellness scores use `Decimal(5,2)`.

| Enum | Values |
| --- | --- |
| `TransactionType` | `CASH_IN`, `CASH_OUT`, `MERCHANT_PAY`, `MOBILE_RECHARGE` |
| `GoalStatus` | `ACTIVE`, `COMPLETED`, `PAUSED`, `CANCELLED` |
| `MessageRole` | `USER`, `ASSISTANT`, `SYSTEM` |
| `RecommendationPriority` | `LOW`, `MEDIUM`, `HIGH` |
| `RecommendationStatus` | `NEW`, `VIEWED`, `COMPLETED`, `DISMISSED` |

Deleting a conversation cascades messages but retains independent recommendations. Deleting a transaction nulls linked contribution references while preserving history. Archiving retains the goal/contributions.

Definitions: [schema](prisma/schema.prisma), [supplemental constraints](prisma/supplemental-constraints.sql), [RLS policies](prisma/row-level-security.sql). [Seed](prisma/seed.ts) adds missing default categories. **No Prisma migration history is checked in.** Supabase-owned objects are declared external in [external-auth.ts](prisma/external-auth.ts).

## Authentication flow

```text
Signup/password login → Supabase Auth → browser session
  → AuthProvider restores/synchronizes profile
  → protected workspace → authenticated user-scoped APIs
```

- Signup supplies name metadata and derives the email redirect from the browser origin plus `/auth/callback`.
- If Supabase returns a session, the user enters the workspace. Otherwise the UI shows confirmation instructions. Email confirmation/password policy are externally configured Supabase settings.
- Callback code exchange creates an SSR session and redirects to `/dashboard`; missing/invalid codes go to `/login?confirmation=failed`. Destinations are fixed local paths.
- Profile sync reads the existing profile and creates it only if missing. UUID/email come from the verified Auth user.
- APIs verify tokens/cookies through `auth.getUser()`, not a client-supplied UUID.
- Session expiry triggers bounded refresh/retry. Sign-out uses Supabase `scope: "local"`, clearing the current session rather than all devices.

## Environment variables

Configure an ignored `.env` locally and deployment variables privately in Vercel. **Never commit real values.** Names below are source-verified; examples contain placeholders only.

| Variable | Requirement / precedence | Exposure |
| --- | --- | --- |
| `DATABASE_URL` | Required for runtime Prisma and CLI configuration/client generation. | Server-only secret connection string. |
| `DIRECT_URL` | Optional CLI/schema connection; falls back to `DATABASE_URL`; not used by runtime queries. | Server-only secret connection string. |
| `SUPBASE_URL` | Primary project URL; one URL name required for auth. | Public configuration, server-read and passed to browser. |
| `SUPABASE_URL` | Fallback when `SUPBASE_URL` absent/blank. | Public configuration. |
| `SUPBASE_PUBLISHABLE_KEY` | Primary publishable/anon key; one key name required. | Public configuration, validated before exposure. |
| `SUPABASE_PUBLISHABLE_KEY` | Fallback when primary absent/blank. | Public configuration. |
| `GEMINI_API_KEY` | Primary AI credential; required for AI unless fallback set. | Server-only secret. |
| `GOOGLE_API_KEY` | Fallback when `GEMINI_API_KEY` absent/blank. | Server-only secret. |
| `GEMINI_MODEL` | Optional override; default `gemini-3.5-flash-lite`. | Server-side nonsecret setting. |
| `SMOKE_BASE_URL` | Optional standalone smoke target; command-line URL takes precedence. | Tool-only setting. |
| `NODE_ENV` | Framework-managed; no manual setting needed for normal scripts. | Framework configuration. |

The `SUPBASE_*` spelling is intentional; `SUPABASE_*` alternatives work. Prefer one consistent pair. Only a publishable or legacy `anon` key is allowed in public configuration, **never a secret/service-role key**. No service-role credential is required.

```dotenv
# Privately replace these placeholders; never commit real values.
DATABASE_URL="your_database_connection_string"
SUPBASE_URL="your_supabase_project_url"
SUPBASE_PUBLISHABLE_KEY="your_supabase_publishable_key"
GEMINI_API_KEY="your_gemini_api_key"

# Optional CLI/schema connection:
# DIRECT_URL="your_direct_or_session_database_connection_string"
# Optional override; normally retain the source default:
# GEMINI_MODEL="your_intended_gemini_model_id"
```

See [.env.example](.env.example). Connection strings must be valid PostgreSQL URLs. Prisma CLI loads `.env` through `dotenv`; client generation requires `DATABASE_URL` even if the build makes no database query.

No `NEXT_PUBLIC_*`, `NEXT_PUBLIC_SITE_URL`, Vercel-specific variable, split database field, `SUPBASE_SECRET_KEY`, or JWK URL is required by application code. Signup derives the current origin; callback redirects derive the incoming request origin. Database/Gemini secrets must never be public variables.

Diagnostic helpers report only the presence of `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, `NODE_USE_ENV_PROXY`, and `GOOGLE_GEMINI_BASE_URL`. These are not application requirements or supported Gemini endpoint overrides; the endpoint is pinned. Do not configure diagnostic overrides as production setup.

Set runtime requirements in Vercel **Production** and **Preview** if previews need those features. Configure preview auth allowlists separately and prefer isolated test data.

## Local development setup

### Prerequisites

- Node.js **24 LTS recommended**, consistent with [DEPLOYMENT.md](DEPLOYMENT.md). Prisma supports `^20.19`, `^22.12`, or `>=24.0`; use a version compatible with all installed packages.
- npm, Git, and an accessible Supabase project with Auth/PostgreSQL configured.
- Gemini credentials only for manual AI use; mocked tests make no live provider request.
- Installed Google Chrome for the current Playwright configuration.

### Install and run

```sh
git clone <repository-url> upay-ai-financial-coach
cd upay-ai-financial-coach
```

Replace `<repository-url>` with this repository's GitHub clone URL. Copy the example and privately configure values **before installation**, because `postinstall` generates Prisma's client.

```sh
# macOS/Linux
cp .env.example .env
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```sh
npm ci
npx prisma validate
npm run dev
```

Open **http://127.0.0.1:3000**. On Windows, use `npm.cmd`/`npx.cmd` if execution policy blocks `.ps1` shims. Installation generates the client; explicit regeneration is `npx prisma generate`.

### Database preparation

**Existing database:** Do not reset, push, or seed merely to start the application. Configure the connection and run the server. `npm run verify:database` is an optional read-only schema/RLS/constraint/category check.

**Fresh development database only:** Provision Supabase-managed Auth first. Review the schema, external Auth inventory, supplemental constraints, and RLS with the database owner, then use:

```sh
npm run db:push
npx prisma db execute --file prisma/supplemental-constraints.sql
npx prisma db execute --file prisma/row-level-security.sql
npm run db:seed
npm run verify:database
```

These commands **change the database**. Never run blindly against production or accept data-loss warnings. Prisma must not create/alter/delete Supabase Auth tables. `db:push` creates no migration history; fresh databases also need the SQL constraints/RLS. Seed creates missing categories, not demo users or financial records.

## Available scripts

| Command | Purpose / side effects |
| --- | --- |
| `npm run dev` | Development server at `127.0.0.1:3000`. |
| `npm run build` | Prisma client generation and production build; no schema push/seed. |
| `npm start` | Serve production build at `127.0.0.1:3000`. |
| `npm run typecheck` | TypeScript without JS output. |
| `npm run lint` | ESLint/Next rules; no automatic formatting. |
| `npm test` | Vitest with mocks/fixtures. |
| `npm run test:browser` | Playwright; requires production build/Chrome; starts port `3118`. |
| `npm run audit:project` | Read-only local environment-name/import/casing/heuristic secret-history audit; expects `.env`; reports names/locations, not secret values. |
| `npm run verify:database` | Live read-only table/policy/constraint/category verification. |
| `npm run verify:analytics` | Read-only PostgreSQL analytics/Decimal/date checks with a nonexistent synthetic identity. |
| `npm run verify:auth` | Read-only Supabase settings/invalid-token rejection; no account/session creation. |
| `npm run verify:startup` | Temporary production server on `3117`, shell/callback/API/runtime checks, cleanup; contacts Auth for invalid-token verification. |
| `npm run verify:coach-unicode` | Unicode round trip in a temporary PostgreSQL table dropped at commit; no application record changes. |
| `npm run verify:gemini` | **Live, quota-consuming** synthetic structured coaching with bounded SDK retries. |
| `npm run verify:coach-languages` | **Live, quota-consuming** synthetic language/structure checks; one HTTP attempt/language, stops on failure. Select one with `-- en`, `-- bn`, or `-- banglish`. |
| `npm run diagnose:gemini` | **Live, quota-consuming** connectivity diagnostics with bounded retry policy. |
| `npm run db:push` | Schema synchronization; changes database structure; reviewed development setup only. |
| `npm run db:seed` | Writes missing default categories. |
| `npm run postinstall` | Prisma client generation; runs automatically after dependency installation. |

Standalone smoke runner: `node scripts/smoke.mjs http://127.0.0.1:3000`. It checks unauthenticated rejection, unsupported methods, unknown paths, and envelopes without authorized coach requests. It does not replace authenticated manual E2E.

## Production deployment

Published demo: **https://upay-ai-hackathon.vercel.app/**. Intended deployment flow:

```text
Reviewed GitHub main → connected Vercel Next.js project
  → production deployment → Supabase Auth/PostgreSQL + server-side Gemini
```

The local branch is `main`. The connected repository, production branch, and promotion settings are external configuration, not verifiable from source alone. No GitHub Actions workflow or Vercel configuration file is checked in.

1. Use Vercel's Next.js preset, `npm ci`, `npm run build`, and a compatible Node.js version.
2. Configure Production/Preview variables privately before building.
3. Confirm pooled PostgreSQL connectivity. Keep database/AI route handlers on Node.js, not Edge.
4. In Supabase Auth URL Configuration, set the production Site URL to the HTTPS origin and allow **`https://upay-ai-hackathon.vercel.app/auth/callback`**. Add exact custom-domain/preview callbacks when needed.
5. Allow development callback **`http://127.0.0.1:3000/auth/callback`**; explicitly allow `localhost` too if using that origin.
6. Confirm hosting supports the AI deadline plus persistence. Coach-send and affordability handlers declare `maxDuration = 60`; actual hosting limits require separate verification.
7. Run release checks and review schema compatibility. Ordinary deployment does not reset/push/migrate/seed data.
8. Manually verify login/logout and owned workspace data after deployment. Never use live AI scripts as routine health checks.

Local production rehearsal:

```sh
npm run build
npm run verify:startup
npm start
```

`npm start` binds to loopback. A host requiring external binding can use `node node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port 3000`. Vercel uses its Next.js runtime instead. Do not run dev/build concurrently against `.next`. See [DEPLOYMENT.md](DEPLOYMENT.md).

## Application workflow

Create an account/sign in and confirm email if the Supabase project requires it. Manually record financial activity in Transactions; Dashboard and Analytics provide supporting context, not a live wallet balance.

### Journey A — Plan a savings goal

1. Create or select a goal, record saved amounts/contributions, and review remaining savings and the required monthly saving pace.
2. In Goal Details, generate the **recorded-data Savings Plan** with a lookback and spending-reduction assumption.
3. Review the monthly savings gap, category budgets, projected monthly saving and feasibility by the goal's target date. These results depend on the recorded activity and selected assumptions.
4. Optionally use the separate **hypothetical What-if Simulator** with scenario income, expenses, desired savings and a horizon; selecting a goal enables completion time/date estimates where possible. This is a separate calculation and does not change records.
5. Optionally ask the multilingual coach about recorded spending and selected goal context. Coaching does not calculate or replace the Savings Plan.

### Journey B — Check a purchase

1. Review recorded income, expenses and goal contributions, then enter the planned purchase amount.
2. Choose an emergency-buffer horizon. Saved funds in **all non-cancelled goals**, including paused/completed goals, are reserved even without selecting a goal.
3. Optionally select an **ACTIVE goal** to also check its required monthly saving pace.
4. Review the deterministic verdict, reserved goal savings, emergency buffer, available amount and recorded-data limitations. The assessment is not a guarantee or a payment instruction.
5. Optionally request an English, Bangla or Banglish explanation of the calculated assessment; explanation is off by default and does not change the verdict.

Both journeys work without AI. When coaching is useful, intentionally submit a question, review the guidance, and mark recommendations read/completed/dismissed as appropriate. Analytics insights, illustrative wellness history and profile preferences remain available as supporting or secondary utilities.

## Security & privacy

- APIs verify Supabase identity/profile and scope records by verified user ID or owned parent relation.
- Prisma uses a server-side connection. Gemini credentials stay in server-only AI modules; neither credential is passed to the browser.
- Only validated public project URL/publishable or anon key is deliberately shared for browser auth; no service-role key is needed.
- Zod validates strict shapes, UUIDs, dates, bounded text/money, and structured AI responses. Backend rules remain authoritative.
- RLS is enabled by supplied SQL on all ten application tables, with owner-read/active-category policies and no supplied Data API write policies. Privileged Prisma access still requires explicit ownership checks.
- Multi-record writes use transactions; recommendations use expected-status conditions; coach persistence uses request IDs/version guards.
- Errors avoid raw stacks/database internals. Diagnostics omit prompts, financial records, credentials, and auth headers. Callback targets are fixed local paths.
- User/AI text renders through React escaping, not raw HTML injection.
- `.env`/`.env.*` are ignored except the placeholder `.env.example`. Keep logs, credentials, and private screenshots out of Git.

These controls are not security certifications. Operational access, retention, external-provider data handling, and monitoring need separate production review. The prototype cannot access wallets, transfer funds, or execute purchases.

## Testing & quality assurance

Tests live in `tests/` and `e2e/application.spec.ts`. No historical pass count or unverified CI badge is asserted; run checks against the checkout being evaluated.

| Check | Coverage / behavior |
| --- | --- |
| Vitest | Financial arithmetic, schemas, auth/profile, owned routes, API client, Gemini transport/output mocks, languages, coach retry/rollback, recommendation transitions/UI. |
| Playwright | Public auth-aware navigation, route scroll/history, protected workspace, fixture-backed CRUD/planning/profile, reset/error/stale-result behavior, recommendation actions, responsiveness. |
| Responsive fixtures | Widths from 320 through 1440 pixels; long English/Bengali Unicode/Banglish coach messages. |
| TypeScript / ESLint | Strict typing and Next/Core Web Vitals rules; existing effect-state lint rule is a warning. |
| Build / startup | Production build, temporary startup, page shells, safe callback, API rejection envelopes, sampled runtime diagnostics. |
| Service checks | Separate read-only Auth/database checks, temporary-table Unicode test, explicitly opt-in AI tools. |

Unit/browser AI tests use mocks/fixtures. Browser Auth/API traffic is intercepted with synthetic data. Projects use desktop Chrome and iPhone 13-sized Chromium emulation, not real-device Safari coverage.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:browser
npm run verify:startup
```

Install Chrome and free ports `3117`/`3118`. Startup verification makes no Gemini call or application-record changes, but needs configured/reachable Supabase Auth for invalid-token verification. Optional read-only remote checks:

```sh
npm run verify:database
npm run verify:analytics
npm run verify:auth
```

Never put `verify:gemini`, `verify:coach-languages`, or `diagnose:gemini` in automatic deployment/CI loops; they consume quota. Fixture success does not verify current live credentials, provider availability, or remote RLS.

## Project structure

```text
app/
  page.tsx                          # Home
  about/ features/ how-it-works/ security/
  login/ signup/ auth/callback/     # Public auth UI/code exchange
  (workspace)/                     # Dashboard, transactions, goals, analytics,
                                   # coach, planning, profile; shared layout
  api/v1/                          # Authenticated handlers and 404 fallbacks
  layout.tsx globals.css error.tsx
components/                        # Auth, shells, forms, financial visuals,
                                   # public previews, recommendations, motion
lib/
  frontend/                        # API client, hooks, forms, profile sync
  auth.ts prisma.ts api.ts         # Identity/database/response handling
  *validation.ts                   # Request/AI response schemas
  analytics.ts financial-health.ts savings-plan.ts projections.ts
  gemini*.ts coach-*.ts recommendation-status.ts
prisma/
  schema.prisma external-auth.ts   # App models/external Auth inventory
  supplemental-constraints.sql row-level-security.sql seed.ts
tests/                             # Vitest and server-only test shim
e2e/application.spec.ts            # Playwright fixtures/regressions
scripts/                           # Audit/smoke/service verification
public/upay-logo.png               # Existing brand asset, not a screenshot
prisma.config.ts proxy.ts          # CLI config/API method policy
playwright.config.ts vitest.config.ts eslint.config.mjs tsconfig.json
.env.example package.json package-lock.json
DEPLOYMENT.md COACH_DIAGNOSTICS.md README.md
```

`PRE_RUN_AUDIT.md` and `RECOVERY_REPORT.md` retain historical context; current source takes precedence. Promotional files are not used as README screenshots or evidence of partnership.

## Current limitations

- Hackathon prototype: no official Upay integration, live balance, transfers, purchases, or transaction sync. Reserved `upay_future` source is not an implemented integration.
- Recorded cash flow is not verified available cash. Goal balances may overlap recorded expenses and do not prove liquid emergency reserves.
- Wellness is illustrative, not a credit score. History stores scores/dates, not original inputs or formula versions.
- Simulations exclude interest/fees/inflation and other goals; goal plans omit unrecorded obligations and do not guarantee outcomes.
- AI is quota-dependent; no dedicated per-user quota-management layer or automatic model fallback. Strict Banglish rejection can require deliberate later retry.
- AI receives selected context/messages. Prompt/schema controls cannot guarantee correctness or eliminate prompt-injection risk.
- Coach `requestId` and same-status recommendation no-ops do not provide general deduplication for all create endpoints.
- Fresh databases require reviewed Prisma/SQL setup; no versioned migration history. Browser tests use Chrome/mobile emulation and fixtures.
- Password reset/social OAuth UI are not implemented. Confirmation/email delivery depend on Supabase settings.

## Future improvements

Potential next steps, **not current features**:

- Per-user AI budgets, quota visibility, production-aware rate limiting.
- Privacy-aware monitoring, retention/export controls, observability.
- Versioned database migrations and isolated preview environments.
- Custom SMTP, password recovery, broader account management.
- Financial-provider integration only with official authorization and consent.
- Richer analytics and expanded real-device/browser/accessibility testing.

## Disclaimer

This educational/hackathon prototype is not an official Upay product, partnership, or endorsement. It has no live Upay wallet connection and executes no financial transactions. AI guidance and recorded-data projections are informational and should be assessed independently before making financial decisions.

## Contributions & license

No `LICENSE` file is included; this README does not assert an open-source license or reuse permission. Clarify licensing with the repository owner before redistribution.

Open an issue or submit a focused PR describing the problem, change, and relevant verification. Preserve authentication/ownership, deterministic financial logic, and prototype disclosures. Use synthetic fixtures, never commit credentials/private financial data, and avoid live AI requests unless explicitly authorized.
