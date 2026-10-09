# Application recovery — 2026-10-02, Asia/Dhaka

## Recovery inventory

Git status/diff and existing source files were inspected before implementation. All existing changes were retained. Git alone cannot identify which uncommitted backend files came from which earlier session; no invented attribution is made.

COMPLETE implementation survived: authentication provider/forms, session persistence, protected workspace shell, landing/login/signup/callback, dashboard, transactions with create/edit/delete/filter/pagination, goals with contributions/edit/archive/pause/resume/savings plans, analytics and wellness history, conversations/messages/recommendations, simulator/affordability, profile, shared API client/forms/types/loading/error/empty components, responsive CSS, and frontend regression fixtures.

PARTIALLY COMPLETE: browser regression suite and completion documentation. The old PRE_RUN_AUDIT.md described the backend-only application.

BROKEN/INCONSISTENT: dropdown labels included option text; tests confused loading statuses with success notices and Next's route announcement with form alerts; the cross-origin Auth fixture omitted the exposed API-version header; deleting a conversation could select stale list data; failed email confirmation/Auth restoration lacked visible feedback; the import auditor treated CSS as an unresolved TypeScript module.

NOT STARTED within required feature scope: none identified. No partially written/truncated files or missing application imports were found. Working Gemini modules were preserved.

## Work completed during recovery

Fixed explicit form-label associations, Auth error/confirmation feedback, stale conversation selection, CSS import auditing, and accurate browser fixtures/locators. Added browser checks for deletion, empty records, backend failure and Retry recovery. Updated startup documentation and this report. No database reset, schema mutation, record deletion, billing configuration, or real wallet integration was performed.

## Pages and backend compatibility

| Frontend route | Existing integration |
| --- | --- |
| `/`, `/login`, `/signup`, `/auth/callback` | Supabase Auth signUp/signInWithPassword/signOut, PKCE callback |
| `/dashboard` | dashboard summary, spending, recommendations |
| `/transactions` | categories, paginated transactions, POST/PATCH/DELETE |
| `/goals`, `/goals/[id]` | list/detail/create/edit/archive, contributions, pause/resume, savings-plan |
| `/analytics` | spending/refresh, financial-health current/history/refresh |
| `/coach` | conversations/list/create/delete, message history/send, recommendation status |
| `/planning` | simulator/what-if, affordability/check, optional AI explanation |
| `/profile` | owner-verified profile GET and upsert POST |

Payloads/types were compared against existing handlers, serializers, validation, calculations, and Prisma schema. Backend authentication/ownership remains authoritative; protected frontend content waits for session/profile synchronization. Browser requests use same-origin API URLs, current Bearer sessions, bounded deadlines and sanitized errors. Financial/network writes are not automatically retried after uncertain transport failures. A definitive 401 can refresh the session and retry. Public config rejects secret/service-role keys. Upay balances remain illustrative recorded cash flow.

## Regression results

- TypeScript: PASS.
- Vitest: 128 passed, 0 failed, 0 skipped across 12 files (previous baseline was 100).
- Production build: PASS, all frontend/backend routes registered.
- Browser regression: 6 passed, 0 failed, 0 skipped on desktop/mobile. Supabase/API/Gemini responses are intercepted, and mutation bodies use backend Zod validation. These are browser integration checks, not live authenticated database tests.
- Database: PASS, read-only verification of 10 tables with RLS, 10 read-only policies, seven constraints, six active categories.
- PostgreSQL analytics: PASS, actual aggregation/date/comparison/empty-month checks.
- Auth service: PASS, live settings HTTP 200 and invalid Bearer rejection. Successful live signup/login and two-user isolation still require manual testing with real test accounts.
- Temporary production startup: PASS, home HTTP 200, 39 API smoke checks and additional invalid-Bearer 401. Server stopped afterward.
- Source/environment/security audit: PASS, no missing imports/assets, casing mismatches, cycles, duplicate environment variables, detected secret patterns, tracked env files, or historical secret matches in two commits. Required existing environment aliases work; absent variables are optional defaults/alternatives. No credentials printed.
- Gemini: existing unit coverage passes; live authentication diagnostic succeeded after a transient 503 then HTTP 200. Structured coaching verification failed twice with sanitized service-unavailable responses. No integration rewrite or test weakening was performed. Live coaching remains a service-verification limitation.

The Windows sandbox initially blocked tsx's user lookup and test-process cleanup. The same checks ran with approved external execution. Initial browser failures were investigated and fixed; no assertions were removed to hide failures.

## Remaining limits and user actions

Required frontend features are implemented. The application is ready for manual E2E testing, with live Gemini availability unresolved. No official Upay API is present. Successful live authenticated CRUD, confirmation/session refresh, persisted coaching, and isolation between two real users are not claimed as verified. Browser fixtures cannot prove production service behavior.

Use test accounts and synthetic records for manual testing. Confirm the Supabase redirect allowlist includes `http://127.0.0.1:3000/auth/callback` if email confirmation is enabled. No new paid service or database setup is required. No credentials need to be shared in chat.

## Exact startup command

```powershell
# Run from the cloned repository directory.
npm.cmd run dev
```

Open `http://127.0.0.1:3000`. Production: `npm.cmd run build`, then `npm.cmd run start`.

## Exact manual E2E order

1. Signed out: open `/dashboard`, `/transactions`, `/goals`, `/analytics`, `/coach`, `/planning`, `/profile`; verify login redirect.
2. Signup with a test email; confirm the email if required; login. Check incorrect-password feedback separately.
3. Check empty dashboard, then reload to verify session persistence and automatic profile creation.
4. Add synthetic CASH_IN and expense transactions using matching categories; filter, edit, paginate as needed; check dashboard totals.
5. Create a future-dated goal, open it, edit its name/target, add a contribution, and confirm updated progress/history.
6. Pause the goal; verify contribution/plan controls are disabled. Resume, add another contribution, and calculate its savings plan.
7. Open analytics, apply dates, save an insight and wellness assessment; verify dashboard insight and wellness history.
8. Run simulator with/without a goal and a saving request above cash-flow capacity. Check capped savings and goal timeline.
9. Run affordability without AI first, then optional explanation; verify reserves, limitations and decision. No wallet transfer occurs.
10. Create a coach conversation, send one message, reload history, update any recommendation status. If Gemini is unavailable, verify visible error and no partial stored message before retrying.
11. Edit profile/name/phone/language, reload, and confirm preferences persist.
12. Check mobile navigation and forms; check browser console/network for errors.
13. Sign out, revisit protected routes, sign in again, and confirm persistence.
14. Use a second test account; verify the first account's goal, transaction, conversation and recommendation IDs cannot be read or mutated.
15. Delete only your synthetic transaction/conversation and archive only your synthetic goal; verify retained contribution history. Confirm completing a fully funded goal works.
