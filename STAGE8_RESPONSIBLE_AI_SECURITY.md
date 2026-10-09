# Stage 8 — Responsible AI & Security

Source-grounded prototype review, 8 October 2026. Stage 6/7 changes are preserved. Initial worktree: `main` at `05d68ad`, matching recorded `origin/main`, eight modified tracked files and five untracked files; nothing staged. Status/full/summary/name-only/cached diffs and the latest 15 commits were inspected; no unexpected change was found. Initial diff is retained in ignored `coverage/stage8/initial.diff`. No AGENTS.md was found. `install.cmd` was not executed or edited. Stage 7's 321 tests/28 files and 60 browser passes are historical until fresh checks below.

## Threat and responsibility model

| Risk | Control classification | Actual control / remaining responsibility |
| --- | --- | --- |
| Unauthenticated or cross-user access | IMPLEMENTED | Supabase `getUser`, owned profile, scoped queries/parent checks; mocked route tests. Deployed Auth/DB roles and RLS isolation still need verification. |
| Malformed financial input / unsafe writes | IMPLEMENTED | Strict Zod money/date/UUID/text bounds, deterministic modules, Serializable write guards; no general create deduplication. |
| Secret exposure / untrusted rendering | IMPLEMENTED | Gemini/public-config server-only modules, validated public key, React escaping, sanitized failures. Prisma/Auth are server-used modules without an explicit `server-only` import; source audit found no browser path. No penetration test. |
| Injection and instruction-like user/category/history text | PARTIALLY IMPLEMENTED | Separate SDK system instruction and untrusted JSON content; no model tools. Offline construction is tested, not live attack resistance. |
| Numerical hallucination / contradictory advice | PARTIALLY IMPLEMENTED | Backend owns calculated values and verdicts; response schemas reject extra fields but accept false prose. Users/reviewers must compare explanations with calculated facts. |
| Excess AI calls | PARTIALLY IMPLEMENTED | Six attempts/verified user/rolling minute per process; no shared quota/spend budget or comprehensive abuse protection. |
| Oversharing to provider | PARTIALLY IMPLEMENTED | Minimized financial summaries, bounded history and optional submission; free text/category labels can contain sensitive data, with no automatic redaction. |
| Provider failure | IMPLEMENTED | Bounded timeouts/retries, safe errors and no partial coach persistence; explanation failure requires explicit calculation-only retry. |
| Financial overconfidence / emergency liquidity | PARTIALLY IMPLEMENTED | Relevant recorded-data, illustrative-score, proxy and verdict disclosures; not a financial safety guarantee or semantic validator. |
| Consent / retention / deletion expectations | DOCUMENTED / PROCEDURAL | Submission disclosure, optional unchecked explanation, deletion inventory below; no consent ledger, TTL, account-wide deletion or audited provider erasure. |
| Future authorized MFS access | NOT IMPLEMENTED | No connector/wallet access. Stage 7 design requires official authorization, consent, scoped credentials and reconciliation. |

Trust boundaries: browser public Auth configuration → Supabase verified identity → `/api/v1` ownership/validation → privileged Prisma connection → PostgreSQL. Optional AI crosses a provider boundary using summarized facts/text, then structured validation → bounded conversation/recommendation writes. AI does not receive a DB connection or tools. Developers/operators remain responsible for configured secrets, roles, provider settings, logs/backups and deployment review. Users should avoid unnecessary sensitive text and verify important decisions. No certification or GDPR/PCI/ISO compliance claim is made.

## Exact AI data boundary

`lib/coach-context.ts` uses parameterized `spendingRows` SQL filtered by verified user and rolling 90-day range. It sends currency; period/start/end/days/time zone; 30-day averaging assumption; monthly income/expenses/net/available saving; transaction/goal counts; total noncancelled goal savings; top five category names (each capped at 100 characters) with monthly spending; and, if selected/owned, goal target/current/remaining amounts, required monthly saving, target date, overdue flag and status. It includes recorded-data/no-liquid-reserve limitations.

It does **not** send raw transaction rows, merchant names, descriptions, user/category/goal IDs, goal name, email, full name, phone or the profile record. Preferred language selects instructions. Chat adds the current message (maximum 2,000 characters) and at most six recent USER/ASSISTANT messages, each sliced to 2,000 characters. Conversation title and request ID are not provider context. Thus financial summaries and chat text **are disclosed to Gemini**; this is not zero exposure. User-entered text or a category label can include identifiers/secrets and is not automatically redacted.

Affordability `explain:true` sends the already calculated assessment: purchase amount, canAfford/decision, recorded cash-flow balance, reserved goal savings, estimated buffer, available amount, post-purchase balance, monthly income/expenses/net, selected goal's monthly requirement, period, assumptions, limitations and calculation version. It adds a fixed explanation request and selected language, with no chat history or contact/profile details. `explain:false`, savings plans, wellness and simulator require no Gemini call. General chat does not receive the complete savings-plan result or a purchase verdict unless it is part of user-supplied text; do not portray it as the calculator.

GEMINI_API_KEY/GOOGLE_API_KEY authenticate the SDK request via its credential header, not prompt JSON. DATABASE_URL, DIRECT_URL and unused Supabase secret/JWK/split-DB configuration are not deliberately placed in prompts. This does not stop a user from pasting a secret into a message. Server/client source inspection and tests establish intended paths, not absence of every possible leak.

## Source of truth and injection evidence

Financial calculations stay in `lib/finance.ts`, `lib/savings-plan.ts`, `lib/projections.ts` and `lib/financial-health.ts`. AI cannot change their fields or write transactions/goals. Coach can store only validated messages and up to three qualitative recommendation records under explicit owned handlers. Recommendation status actions do not execute a financial transaction. Model output is plain React text, not raw HTML.

Stage 5's 41 offline evaluation cases already cover system/data separation, attempted verdict overrides, secret requests, category instructions, invented balances and live-wallet claims. They also deliberately show contradictory prose and invented numerical targets being accepted by structure/script validation. Stage 8 does not duplicate those cases or claim to detect all false numbers. A new real affordability-handler test returns falsely approving/wallet-claiming AI prose while proving every calculated response field remains identical and no messages/recommendations are written. The unsafe prose is intentionally accepted: **hallucinations are not eliminated**.

A new test runs the actual minimized context builder into real SDK serialization with an injected synthetic transport. Extra private/merchant instruction fields in fixture rows/profile/goal do not enter the provider body; the attack-bearing current message/history remains in untrusted JSON and outside the system instruction. This tests application construction, not Gemini's obedience. Schema-valid prose could follow an injection or give unsafe advice. There are no live adversarial/model-quality results or prompt-injection immunity claims.

## Explainability and emergency reserve proxy

Affordability UI shows the calculated verdict first, the reserve/buffer arithmetic and assumptions, then optional AI explanation with the calculated verdict remaining authoritative. It cannot verify wallet liquidity or execute purchases. Wellness is illustrative, not a credit score or lending eligibility. Existing API limitations are rendered by Analytics.

The unchanged `wellness-v1` formula divides savings in **all noncancelled goals** by recorded average monthly expenses and scales that estimated coverage against three months. Laptop/education/travel savings may not be liquid emergency funds. `emergencyFundBasis` is `non_cancelled_goal_savings_proxy`; existing calculation tests cover it and the API/UI states that goal savings may not be liquid emergency funds. Zero expenses produce unknown coverage/zero emergency component. No separate emergency account was fabricated. **FUTURE DESIGN:** model independently designated, available emergency reserves separately from earmarked goal savings, with an explicit revised formula/version and validation before changing behavior.

## Privacy, consent and data provenance

User-entered manual/mock records are prototype records and may contain real personal information; they are not automatically synthetic simply because `source` is manual/mock. Automated Vitest/Playwright/evaluation fixtures are synthetic/authored; public demos are static examples. Neither supplies customer-impact or live Gemini-quality evidence.

Coach submission and the unchecked optional explanation toggle now disclose transmission to the configured Gemini provider and possible mistakes. Users can use deterministic planning without AI and should not submit passwords, authentication codes, card details or unnecessary identifiers. This is a submission choice/disclosure, **not a recorded informed-consent workflow or compliance certification**. Existing recorded conversation replay can return without transmission. Provider retention/training configuration, regional processing and contractual deletion were not inspected; no provider-specific privacy guarantee is asserted. Future MFS ingestion requires actual provider authorization and explicit user consent; no consent records or live ingestion exist.

## Retention and deletion inventory

| Data | Current user-facing/API behavior | Remaining limitation |
| --- | --- | --- |
| Conversations/messages | Owned DELETE conversation; schema cascades its messages; browser UI confirms | Recommendations remain; no per-message delete; deployed cascade not tested |
| Recommendations | Mark viewed/completed/dismissed | Status change is not deletion; no DELETE route |
| Transactions | Owned manual/mock DELETE; UI confirmation | Contributions remain and source FK becomes null; no guaranteed undo or backup erasure |
| Goals/contributions | DELETE goal route archives as CANCELLED; completed goals cannot be archived | No hard-delete UI/API, no individual contribution delete; archived data remains |
| Wellness assessments | Read history; refresh can save or calculate without storing | No user deletion route; original inputs/formula version not stored in snapshots |
| Insights | Analytics refresh stores insights; dashboard reads them | No user deletion route or automatic expiry |
| Profile/Auth account | Read and owned upsert/profile preferences | Account-wide data deletion is not currently implemented. No account deletion UI/API. |
| Plans/simulator/affordability | Calculated responses, not stored decision histories | AI/provider processing is separate; client/log/backup copies are not audited |

No automatic retention period, purge job or formal retention policy is implemented. Schema Auth/user cascade definitions do not constitute a supported account deletion workflow and do not erase provider records, logs or backups. Conversation confirmation now warns that generated recommendations remain. Public Security explains deletion/retention gaps. **FUTURE PROCEDURE/DESIGN:** define purposes/periods, provider and backup retention, consent revocation, supported export/erasure, verified cascades and audit before advertising deletion guarantees. No risky CRUD changes were introduced.

## Authorization, secrets, rate protection and logs

`lib/auth.ts` uses Supabase `getUser` rather than accepting client userId; profile upsert uses verified ID/email. Existing tests cover goals, owned parent contributions/messages, recommendations, analytics/health scoping and profile. Stage 8 adds a missing individual transaction GET/PATCH/DELETE rejection test, asserting scoped lookup, identical safe 404 and no mutation. These are application tests with mocked Auth/Prisma, not two-user deployed RLS testing. Supplied RLS SQL has owner-read/active-category/parent-owner policies; privileged Prisma may bypass it. **Deployed RLS NOT VERIFIED.**

Public Auth configuration accepts publishable/anon keys and rejects secret/service-role keys; no service-role key or JWT signing secret is needed by the app. GEMINI_API_KEY/GOOGLE_API_KEY and DATABASE_URL/DIRECT_URL are server-used. `.env` is ignored; only placeholder `.env.example` is tracked. No browser import path for Prisma or deliberate secret response/prompt serialization was found. Existing local audit checks names/locations without printing values; its pattern scan is not a comprehensive secret/security audit.

Stage 7's gate remains unchanged: six generation attempts per verified user/rolling minute/process; failed calls count, rejected requests never reach provider, replay/calculation-only bypass. Safe 429/Retry-After and capacity/expiry/isolation tests remain. No distributed enforcement, all-endpoint/IP protection or shared spend budget exists. Cold starts/instances/separate route bundles can each have their own allowance.

Gemini diagnostics log stage, fixed category, numeric status, language, elapsed time and a network-failure flag; API failures log error type. No current call site deliberately logs raw bodies, prompts, replies, contact details, financial records or auth headers. A new test verifies private provider error payloads are excluded by classification/logging. `coachDiagnostic` is typed, not a runtime arbitrary-field sanitizer; callers must preserve its metadata-only contract. Infrastructure/access/error logs and production retention were not inspected. Existing transport timeouts/retries/safe errors and atomic coach persistence are preserved. No monitoring platform, alerts, request correlation, security telemetry or privacy certification was added; those remain production hardening.

## Evidence and changes

Stage 8 changes only three UI disclosure/confirmation locations, focused tests, README matrix and this/report documentation. No financial, Auth, rate-limit, schema, transaction/goal semantics, model/provider configuration or public positioning change was made. Full Stage 6/7 regression coverage is retained. New tests: actual context-to-SDK minimization/injection boundary, classified log privacy, contradictory prose vs immutable affordability facts, public privacy/deletion disclosures, and cross-user transaction read/edit/delete denial. Existing optional-explanation UI test additionally checks the provider disclosure. No fake MFS, live Gemini or production DB tests were added.

Initial focused run: 77 passed/1 failed because the new synthetic goal fixture omitted created/updated dates required by `goalData`; corrected the fixture, with no production change. Focused rerun: 78/78 across four files before the final disclosure/transaction additions. These intermediate outcomes are historical; fresh final checks and scope-qualified results are recorded below. Raw logs and JSON are retained under ignored `coverage/stage8/`.

The expanded focused run initially returned 122 passed/1 failed: the new transaction test expected the lookup argument to contain only `where`, overlooking GET's existing category include. Corrected the assertion to allow the include while requiring the exact owned `where` filter. Both intermediate failures were new test-fixture/assertion mistakes, not production defects; their logs remain preserved.

## Stage 8 resume audit — 8 October 2026

Resumed the existing work without restarting the Stage 8 audit. Before edits, ran `git status`, `git status --short`, `git diff`, `git diff --stat`, `git diff --name-only` and `git diff --cached`. The checkout remained `main` at `05d68ad`, matching the recorded `origin/main` reference, with **14 modified tracked files, seven untracked files and nothing staged**. This is the combined Stage 6/7/8 worktree, not a list of new changes from this resume. No unexpected source change was identified. No applicable AGENTS.md was found.

All described Stage 8 work was present: provider-use/optional-explanation disclosures; the conversation-delete warning that recommendations remain; the public retention/account-deletion disclosures; the exact context and emergency-proxy documentation; the README control matrix; context/log-privacy tests; immutable affordability-fact coverage with contradictory AI prose; and transaction GET/PATCH/DELETE ownership denial. The ownership assertion already used `expect.objectContaining` while requiring the exact owned `where` filter, allowing GET's existing category include. No correction needed to be repeated.

Prior ignored logs and JSON survived under `coverage/stage8/`. Their historical results included 326 passing Vitest tests/29 files and 123 passing focused tests/seven files. The prior browser log eventually contained individual success lines for 30 desktop and 30 mobile cases, but lacked a final runner summary/exit result and `test-results/.last-run.json`; it was therefore not accepted as completed verification. Fresh validation was required and performed separately. Prior logs were preserved; surviving screenshots were copied before the fresh browser run.

Fresh resume evidence is kept under ignored `coverage/stage8/resume-2026-10-08/`: initial status/stat/full diff, SHA-256 hashes of all 161 tracked/untracked files present at resume, command logs and test JSON. Comparison with the earlier Stage 8 initial patch confirms that both AI-route gates, `lib/api.ts` and the frontend-client test changes are inherited Stage 6/7 work. The browser patch also matches apart from Unicode arrows replaced by question marks in that older saved patch. These artifact-encoding differences were not treated as source edits.

## Regression and failure classification

Fresh typecheck, lint, complete Vitest, focused Vitest, production build and Node-native audit passed without a test or implementation fix. The two old focused failures remain classified as **stale/overly strict test or fixture mistakes**, with their existing corrections preserved. The earlier `tsx` user-info launcher failure remains an **environment issue**; the working Node-native command was used directly rather than rerunning that launcher.

The resume adds no tests or features. Changes made during the resume are confined to this report, README and the project report, including correcting the README deletion matrix to say manual/mock records rather than implying all user-entered transactions are synthetic. User records can contain real personal information.

Financial modules, affordability verdict rules, wellness/emergency formulas, transaction/goal handlers, Auth, schema, dependencies, public product positioning and Gemini configuration have no diff from HEAD. The intentionally uncommitted Stage 7 rate-limiter/API additions remain preserved. All application and test files are also checked against their exact resume hashes after documentation finalization. No live Gemini, paid API, database provisioning, installer execution, deployment, commit, push or Stage 9 work is authorized or performed.

## Judge feedback status

These classifications describe the evidence actually available, including preserved earlier stages. Documenting a missing capability does not count as implementing it.

| Concern | Status | Evidence / practical boundary |
| --- | --- | --- |
| Customer-only savings/purchase decision story | ADDRESSED | Preserved prior positioning and deterministic journeys; no customer-demand claim. |
| Provider disclosure and exact AI context | ADDRESSED | Coach/optional-explanation disclosure, actual context-to-SDK test and documented field/history boundaries. |
| Numerical source of truth | ADDRESSED | Contradictory explanation cannot change backend assessment fields; financial formulas preserved. |
| Factual AI accuracy / hallucination control | PARTIALLY ADDRESSED | Structural/script validation and truthful limitations; false schema-valid prose remains accepted. |
| Prompt injection | PARTIALLY ADDRESSED | System/untrusted-data separation and retained offline attacks; no live model resistance or immunity evidence. |
| Financial explainability / emergency liquidity | PARTIALLY ADDRESSED | Verdict arithmetic and proxy disclosures; earmarked goal savings are still an emergency-reserve proxy. |
| Privacy and consent | PARTIALLY ADDRESSED | Submission disclosure, unchecked optional explanation and minimized context; no consent ledger or provider privacy audit. |
| Automatic retention and account-wide erasure | NOT ADDRESSED | Gaps and existing delete/archive behavior documented; no retention job or account-wide deletion implemented. |
| Authorization / production data isolation | PARTIALLY ADDRESSED | Verified-identity scoping and mocked ownership tests; deployed RLS/roles are unverified. |
| Secrets and logging privacy | PARTIALLY ADDRESSED | Server-use/source review, masked local pattern/import audit and sensitive-error test; production logs/penetration testing unverified. |
| Distributed AI abuse protection | PARTIALLY ADDRESSED | Preserved tested per-process six-attempt allowance; no distributed quota or shared spend cap. |
| Multilingual usefulness / model-quality evidence | PARTIALLY ADDRESSED | English/Bangla/Banglish instructions, schemas and offline fixtures; no live or comparative human evaluation. |
| Verified customer interviews, best customer group, MFS-specific benefit and measured outcomes | NOT ADDRESSED | Synthetic tests and a proposed validation plan are not customer research or outcome evidence. |
| Live Upay integration | NOT ADDRESSED | Manual/mock records and a future authorized integration design only; no wallet connection. |
| Production security, load and database-concurrency assurance | NOT ADDRESSED | No production penetration/security/load test, deployed database isolation check or live-provider security test performed. |

## Remaining limitations

- Structurally valid contradictory or falsely reassuring AI prose can still be accepted. Hallucinations are not eliminated, factual output is not automatically verified, and offline injection tests do not prove model immunity.
- Deployed RLS, effective production roles, live Gemini security behavior and production security are not verified. Local ownership tests and secret-pattern scanning are not production or comprehensive security audits; no penetration/security test was performed.
- The Stage 7 limiter is process-local. Distributed enforcement, a shared spend cap and comprehensive abuse protection are not implemented.
- Account-wide deletion and automatic retention are not implemented. Conversation deletion can leave recommendations; goal archive is not hard deletion. Provider erasure, logs, backups and deployed cascades are unverified.
- The emergency calculation still uses all noncancelled goal savings as a proxy, including potentially earmarked or illiquid savings. It does not verify emergency reserves or a wallet balance.
- Free text/category labels can contain personal information or secrets; no automatic redaction, consent ledger or audited provider-retention configuration exists.
- No live Upay wallet integration, verified customer-demand/outcome study or live multilingual/model-quality evidence exists.

## Fresh final Stage 8 verification

All checks below were freshly executed on **8 October 2026 (Asia/Dhaka)** with Node `v24.15.0`, npm `11.12.1` and installed Chrome. The complete and focused Vitest runs use the same existing test inventory; their counts are not additive. No new test was added in this resume.

| Exact command | Fresh result |
| --- | --- |
| `npm.cmd run typecheck` | PASS; exit 0 |
| `npm.cmd run lint` | PASS; **0 errors, five existing warnings**; exit 0 |
| `npm.cmd test -- --reporter=default --reporter=json --outputFile=coverage/stage8/resume-2026-10-08/vitest.json` | **326 passed, 0 failed, 0 skipped; 29/29 files passed**; exit 0 |
| `npm.cmd run build` | Prisma client generation and Next production build PASS; exit 0; no DB provisioning |
| `npm.cmd run test:browser -- --reporter=list,json` | **60 passed; desktop 30/30, mobile 30/30; 0 failed/skipped/flaky; 8.1 minutes**; exit 0 |
| `npm.cmd test -- tests/responsible-ai.test.ts tests/phase56-routes.test.ts tests/routes.test.ts tests/public-ui.test.ts tests/affordability-ui.test.ts tests/ai-evaluation.test.ts tests/ai-rate-limit.test.ts --reporter=default --reporter=json --outputFile=coverage/stage8/resume-2026-10-08/focused.json` | **123 passed, 0 failed, 0 skipped; 7/7 files passed**; exit 0 |
| `node scripts/audit-project.ts` | PASS using Node-native TypeScript; **136 source files, 18 commits**; no unresolved/undeclared imports, casing/cycle issues, duplicate environment names, current/history secret-pattern findings or tracked/historical real `.env` files; exit 0 |
| `git diff --check` | PASS after documentation finalization; no output; exit 0 |

Logs were captured with PowerShell `*> coverage\stage8\resume-2026-10-08\<check>.log`; each command's `$LASTEXITCODE` was captured before reading/printing the log, appended as `EXIT_CODE=0`, and returned by the shell. Before the browser command, set `$env:PLAYWRIGHT_JSON_OUTPUT_FILE = 'coverage/stage8/resume-2026-10-08/browser.json'`. The browser JSON independently reports 60 expected, zero unexpected/skipped/flaky, no runner errors and one successful attempt per case; `test-results/.last-run.json` reports `passed` with no failed tests.

The expanded focused set consists of affordability UI (23), offline AI evaluation (41), rate limiting (3), Phase 5/6 routes (32), public UI (8), Responsible AI context/log privacy (2), and general routes/ownership (14): **123**. Stage 8 introduced five tests before this resume and extended one existing provider-disclosure assertion; all were preserved. The complete suite also retains Stage 5's 41 offline evaluation cases and Stage 6's ten simulated contribution cases. Neither is live-provider or real-database evidence.

**Environment issue, not an application/test regression:** after all 60 cases completed, the Windows browser runner stalled during server teardown without its final summary/JSON. Verified that this run's `[WebServer]` Next PID **16892** owned `127.0.0.1:3118`, then ran **`Stop-Process -Id 16892 -Force`** only after confirming all 60 individual passes. The test runner and unrelated processes were not terminated. Playwright immediately completed with `60 passed (8.1m)`, exit 0 and the successful JSON/last-run results above. This matches the earlier Stage 6/7 environment limitation; cleanup evidence is retained in `browser-cleanup.log`. No production behavior was changed to address it. The five lint warnings remain the existing effect/ref warnings, not new errors.

Browser verification uses real local built pages with synthetic Auth/application API fixtures and blocked unmatched external browser traffic. Desktop uses Chrome; mobile uses iPhone-sized Chromium/Chrome emulation, not physical hardware or Safari. Secret-pattern/import scanning is a local limited review, not a complete security audit. There was no live Gemini, paid API, deployed Auth/database, RLS, penetration/security or production load verification.

## Final diff and Git status

The final preservation check compares all 161 baseline file hashes: **only `README.md`, `FINAL_PROJECT_REPORT.md` and this Stage 8 report changed during the resume; the other 158 baseline files are unchanged**. All existing application/test/Stage 6/Stage 7 files and the untracked installer are preserved. Financial formulas/verdicts, wellness/emergency calculation, transaction/goal semantics, authentication, Stage 7 allowance semantics, Gemini model/provider settings and product positioning are unchanged. No regression was found within the fresh local/mocked verification boundary.

Final worktree remains on `main` at `05d68ad`, matching recorded `origin/main`, with **14 modified tracked files, seven untracked files and no staged changes**. Modified: `FINAL_PROJECT_REPORT.md`, `README.md`, coach/planning/security pages, the two Stage 7 AI routes, `e2e/application.spec.ts`, `lib/api.ts`, and affordability-UI/frontend-client/Phase-5-6-route/public-UI/general-route tests. Untracked: `STAGE7_SCALABILITY_INTEGRATION.md`, `STAGE8_RESPONSIBLE_AI_SECURITY.md`, `install.cmd`, `lib/ai-rate-limit.ts`, and rate-limit/concurrency/Responsible-AI tests. These are the preserved combined worktree changes, not newly created files in this resume. Nothing was staged, committed, pushed or deployed; `install.cmd` was not executed, and Stage 9 was not started.

## Stage 8 verdict

The requested Stage 8 continuation is complete: fresh complete validation, preserved earlier work, final regression/diff review and accurate responsibility/security documentation are ready for review. Remaining implementation and production-evidence gaps above remain open; completion does not certify production security or AI factual accuracy.

STAGE 8 COMPLETE — READY FOR REVIEW
