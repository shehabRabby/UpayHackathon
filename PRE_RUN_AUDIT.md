# Pre-run audit — 2026-10-02 (Asia/Dhaka)

> Historical backend audit. The frontend limitations below have been superseded by [RECOVERY_REPORT.md](RECOVERY_REPORT.md), which records the recovered application and current regression results.

## Overall status

**READY TO RUN locally: implemented backend and minimal status page.** This repository does not contain a complete financial-coach frontend. There is no login UI, dashboard UI, or transaction/goal/chat UI. Signed-in end-to-end workflows still require manual testing with a Supabase test-user session. This is a limitation of the current implementation, not a verified full-product launch.

VERIFIED means a check was actually executed. STATICALLY CHECKED means code/configuration was inspected without a live successful user workflow. NOT TESTED means no such verification was performed.

## Issues found and fixes

| Actual issue | Fix |
| --- | --- |
| Supabase Auth requests had no explicit network deadline. Service/network errors were treated as expired sessions. | `lib/auth.ts`: shared 10-second abort signal for Auth fetches; service failures return a sanitized 500, invalid sessions remain 401. |
| Goal PATCH could set PAUSED but could never resume that goal. | `app/api/v1/goals/[id]/route.ts`: allow owned ACTIVE/PAUSED goals to update; COMPLETED/CANCELLED stay protected. Regression test added. |
| Analytics diagnostic could print a raw database exception on failure. | `scripts/verify-phase3.ts`: sanitized failure message and nonzero exit status, retaining disconnect in finally. |
| Existing database diagnostic checked RLS flags but did not check policies. | `scripts/verify-database.ts`: verify ten expected read policies and absence of direct Data API write policies. |
| Missing reusable audit/Auth/startup commands; Windows tsx CLI launcher failed during this audit. | Added Node `--import tsx` diagnostic commands, read-only Auth checks, and isolated production startup verification. |
| Environment example omitted explanations for supported aliases and unused legacy fields. | `.env.example` documents optional alternatives and defaults; actual `.env` untouched. |

`tests/auth.test.ts` and `tests/routes.test.ts` cover the behavior fixes. `scripts/smoke.mjs` now covers all implemented resource mutation methods without authenticating or writing data. README updated. No dependencies upgraded. Working Gemini modules and verification scripts were not changed during this audit.

## Repository structure and contracts

One application/package: Next.js 16.3.8 App Router with React 19, TypeScript, Prisma 7.10, PostgreSQL, Supabase Auth, Zod, and server-side `@google/genai`.

- Frontend: `app/page.tsx`, `app/layout.tsx`; static API status page only.
- Backend: 22 route files under `app/api/v1/`, including root/catch-all error routes. The implemented endpoint contracts are listed in README.
- Middleware: `proxy.ts` handles unsupported methods with the documented response envelope/status.
- Database: `lib/prisma.ts`, `prisma/schema.prisma`, Prisma root config, seed and supplemental SQL files.
- Services: Supabase Auth and Gemini; no live Upay wallet API, payment service, or additional external API.
- Configuration: root package/lock, TypeScript, Vitest, environment files; default Next build configuration is sufficient.

VERIFIED: no unresolved/undeclared imports, path-case mismatches, or import cycles in the automated source inventory. Production build resolves all application routes. There is no lint configuration or lint command, so lint is NOT TESTED/configured.

STATICALLY CHECKED: strict Zod body/query validation, parameterized analytics SQL, UUID validation, per-user ownership filters, transaction isolation, Decimal calculations and serialization, safe API errors, standard response envelopes, Node runtimes, dynamic API responses, no-store caching, and awaited service/database calls. Coach network calls occur outside database transactions and failed calls do not store partial messages. Recommendation updates are owner-scoped.

Frontend/backend contract comparison: the current frontend makes no API requests and contains no forms or authentication state. There is no existing frontend contract mismatch to fix. The routes support verified Supabase Bearer tokens or SSR cookies. Cross-origin browser clients are not enabled by a permissive CORS policy; no separate browser frontend exists in this repository.

## Environment audit

No values or credentials are included here. No duplicate variable names were found. Required URL structures passed validation.

| Variable | Status | Use |
| --- | --- | --- |
| DATABASE_URL | PRESENT | Prisma runtime transaction-pooler connection |
| DIRECT_URL | PRESENT | Prisma CLI session-pooler connection |
| SUPBASE_URL | PRESENT | Supabase Auth |
| SUPBASE_PUBLISHABLE_KEY | PRESENT | Supabase Auth |
| GEMINI_API_KEY | PRESENT | Server-only Gemini |
| GEMINI_MODEL | MISSING | Optional; validated default is used |
| GOOGLE_API_KEY | MISSING | Optional Gemini fallback; not required |
| SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY | MISSING | Optional correctly spelled alternatives; existing aliases work |
| GOOGLE_GEMINI_BASE_URL | MISSING | Diagnostic-only detection; Gemini pins official endpoint |
| SMOKE_BASE_URL | MISSING | Optional; default local address |
| NODE_ENV | MISSING in .env | Next sets it at runtime |
| SUPBASE_SECRET_KEY | PRESENT | Unused by application |
| SUPBASE_CONNECTION_STRING | PRESENT | Unused; runtime uses DATABASE_URL |
| SUPBASE_JWK_URL | PRESENT | Unused; Auth verifies with getUser |
| SUPBASE_DB_HOST / SUPBASE_DB_PORT / SUPBASE_DATABASE / SUPBASE_USER | PRESENT | Unused legacy split connection fields |

No required variable is missing. No backend credentials are sent by the status page. Optional variables do not need to be added for first run.

## Database

VERIFIED: PostgreSQL connectivity using PrismaPg. Schema validation passes. A read-only Prisma diff against the configured database reports **No difference detected**. All ten application tables, expected indexes/enums/relationships, Auth foreign key, seven supplemental constraints, ten RLS read-only policies, and six active categories are present. Real PostgreSQL aggregation checks pass for timestamps, Dhaka boundaries, Decimal/bigint conversion, and empty trends.

Runtime pool has a ten-second connection timeout and maximum five connections. Development uses a global client singleton; diagnostic scripts disconnect. Supabase Auth tables are declared externally managed and must not be altered by this application.

Migrations: no `prisma/migrations` directory; current setup uses db push plus supplemental SQL and seed. This is not a pending migration error. No push, seed, schema change, reset, or record mutation was performed during the audit. **No database setup action is needed for the currently configured database.** For a different empty database, follow README setup rather than applying these commands to an existing production database blindly.

## External service results

| Service | Configuration | Live verification | Status |
| --- | --- | --- | --- |
| Supabase PostgreSQL | VERIFIED | Read-only connectivity/schema/RLS/analytics checks | PASS this audit |
| Supabase Auth | VERIFIED | Settings HTTP 200; invalid token rejected; production API returned 401 envelope | PASS this audit |
| Gemini | STATICALLY CHECKED for app integration; unchanged | Diagnose HTTP 200 and structured verify passed in the preceding audit | Previously VERIFIED; deliberately not called again |
| Upay wallet | Not implemented | NOT TESTED | Transactions/balances are illustrative recorded data |

Gemini has bounded retries/deadlines, validated structured output, minimized context, safe 403/429/timeout errors, and backend-only credentials. Supabase Auth has no custom retry loop; underlying SDK session refresh behavior is bounded by the shared deadline. A service failure is handled per request rather than terminating the application.

## Tests, build, and startup

- TypeScript: VERIFIED PASS.
- Tests: VERIFIED **100 passed / 0 failed / 0 skipped**, nine files.
- Frontend production build: VERIFIED PASS, home page and not-found page generated.
- Backend production build: VERIFIED PASS, all API routes and proxy registered in the same Next build.
- Startup: VERIFIED production server on isolated port 3117 served `/` with HTTP 200.
- HTTP tests: VERIFIED 38 smoke cases covering protected endpoints, unsupported methods, and missing routes; additional live invalid-Bearer test returned 401.
- Cleanup: temporary server process and its children stopped in finally.
- Dependencies: installed required packages present and compatible with successful checks; npm audit reports **zero vulnerabilities**. Two unused optional-platform packages are marked extraneous in node_modules; no missing dependency/build failure was found and no unnecessary prune was performed.

NOT TESTED live: successful user login/signup, cookie session refresh, profile upsert, authenticated reads, CRUD/contribution persistence, snapshot writes, persisted coach conversations/recommendations, and isolation between two real users. Unit tests cover mocked versions of these behaviors. No authenticated test session was supplied, and no real records were modified.

## Security

VERIFIED: `.env` ignored and untracked; no secret-like values found in application files or the two available Git-history commits. No debug endpoint or client-side credential exposure found. This is a targeted pattern scan, not a proof that every possible secret format is absent.

Supabase secret and database credentials were previously shared in this conversation. Rotate those if they remain active, then update `.env`. They were not printed, changed, or reused in logs by this audit. No secret-service-role key is needed for application authentication.

## First local run

Dependencies and database are already configured in this workspace. PowerShell commands use npm.cmd to avoid this machine's npm.ps1 execution-policy restriction.

```powershell
cd D:\Hackathon
npm.cmd run verify:database
npm.cmd run verify:auth
npm.cmd run dev
```

Open `http://127.0.0.1:3000`. If that port is occupied, use `npm.cmd run dev -- --port 3003` and open port 3003.

For a production run, use `npm.cmd run build`, then `npm.cmd run start` instead of dev. Do not run db push/reset/seed merely to start the already verified database.

## First-run manual checklist

1. Browser: confirm the API status page renders and the browser console has no errors. There are no financial forms or login UI to exercise.
2. API client: confirm `/api/v1/goals` without a session returns a 401 envelope.
3. Sign in with a Supabase test user and call POST `/api/v1/auth/profile` using that user's access token and the README body.
4. With the same token, list categories, create a synthetic transaction and future-dated goal, add a contribution, and verify dashboard/analytics values. Use test records you intend to retain or remove manually.
5. Pause and resume the test goal; confirm another test user's token cannot access it.
6. Exercise financial-health refresh/history, simulator, and affordability. Check invalid requests return the documented envelopes.
7. Create a conversation, send one coach message, verify persistence and recommendation updates. Do not repeatedly call Gemini just to test connectivity.

Remaining manual actions: obtain a signed-in test-user session/profile and perform the authenticated checklist; rotate previously shared credentials if still active. No billing or service configuration changes are required by verified first-run checks.
