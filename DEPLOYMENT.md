# Production setup

Use Node.js 24 LTS and `npm ci`. No live AI verification is required for deployment.

## Environment

Set these in the hosting environment, never in committed files:

- Server secrets: `DATABASE_URL`, `GEMINI_API_KEY`.
- Database administration: `DIRECT_URL` (optional at runtime; used for schema commands, falling back to `DATABASE_URL`).
- Public authentication configuration: `SUPBASE_URL`, `SUPBASE_PUBLISHABLE_KEY`. Alternative names `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` are supported. Only a publishable/anon key is accepted; never use a service-role key. These two values are safely passed to the browser by the server layout; no `NEXT_PUBLIC_*` variables are required.
- Optional: `GEMINI_MODEL` (keep `gemini-3.5-flash-lite`). `GOOGLE_API_KEY` is only a fallback for the Gemini key. Do not set diagnostic endpoint overrides in production.

The Prisma build step needs `DATABASE_URL` present. Auth configuration validates the public key type and HTTP(S) URL; use HTTPS in production. Unavailable auth configuration shows a safe configuration error. Missing Gemini credentials produce a sanitized service error when AI is requested. Verify all required variables before release. Do not expose database credentials or AI keys as public variables.

## Supabase

In Auth URL Configuration, set Site URL to the production HTTPS origin and allow the exact production `https://YOUR-DOMAIN/auth/callback` redirect. Allow each preview origin explicitly if preview signup is required. Keep `http://127.0.0.1:3000/auth/callback` (or the actual localhost development origin) for development. Email confirmation and password policy remain managed by Supabase. These settings must be configured manually; this QA pass does not change them.

## Database expectations

There is no Prisma migration history in this repository. The existing database is defined by `prisma/schema.prisma`, `prisma/supplemental-constraints.sql` and `prisma/row-level-security.sql`; active categories are defined by `prisma/seed.ts`. Supabase owns `auth.users` and its external tables/enums.

Do not run `db:push`, seed, reset or SQL blindly against an existing deployment. For a new database, provision and review those files with the database owner before enabling traffic. For the existing database, `npm run verify:database` is read-only and verifies required tables, policies, constraints and categories. An ordinary application deployment does not run schema changes or seeds.

## Build, checks and startup

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run test:browser
npm run audit:project
npm run verify:database
npm run verify:auth
npm run verify:startup
npm start
```

Browser checks use installed Chrome, synthetic fixtures and intercepted Auth/API requests. They never call Gemini or mutate the database. Startup verification uses port 3117; browser verification uses 3118. The production start command binds to `127.0.0.1:3000`; behind a proxy use `node node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port 3000` if the host requires external binding.

Run production builds without a concurrent development server sharing `.next`. If an interrupted run corrupts ignored generated route types, stop that process and regenerate generated artifacts before rechecking; do not weaken TypeScript validation.

## Hosting checklist

- Vercel: choose Next.js, install with `npm ci`, build with `npm run build`, and configure production environment variables before building. Use the Node.js runtime for Prisma/Postgres APIs; do not switch them to Edge. Root layout is dynamic and does not query financial records at build time.
- Ensure hosting function duration supports the existing AI request deadline plus database persistence. Coach and AI affordability routes already declare a 60-second maximum. Confirm hosting limits without enabling billing or changing the AI retry policy. See [Vercel runtimes](https://vercel.com/docs/functions/runtimes) and [function limits](https://vercel.com/docs/functions/limitations).
- Confirm pooled PostgreSQL connectivity and TLS settings from the target host, correct Supabase callback URLs, and all production secrets in that environment.
- Run build, mocked browser regression and startup smoke checks; manually confirm login/logout and owned records after deployment. No additional AI request is required for this QA pass.
- Keep `.env` ignored, do not upload local logs/test artifacts, and never run live Gemini verification scripts as a deployment health check.

No deployment or remote configuration change is performed by these instructions.
