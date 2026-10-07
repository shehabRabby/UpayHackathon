# Final Round Feedback Audit

Audit date: 7 October 2026 (Asia/Dhaka). Target persona: **Customer only**. Status: inspection and recommendations only; no recommendations implemented.

## 1. Executive Verdict

**Keep the existing project and reposition it. The proposed focus fits the actual implementation.** Both goal-based savings planning and purchase affordability are implemented through authenticated APIs and deterministic financial calculations. They are not merely labels on unfinished screens. The largest mismatch is how the product introduces, prioritizes, and explains those capabilities.

**Estimated engineering/product fit: approximately 70%.** This is a subjective engineering/product-fit estimate, not customer research, a test-coverage percentage, or evidence that 70% of judge requirements have been validated. The estimate weighs strong existing calculation/API support against weak Customer identification, broad public messaging, incomplete presentation of useful results, and limited MFS differentiation. All requested basic numerical capabilities exist, subject to the limitations documented below. **Verified customer interview evidence: none supplied or identified.** Customer benefit and the best customer group remain unvalidated.

The proposed positioning as an AI-assisted financial independence tool is reasonable as a direction. The supported current promise is narrower: help customers understand savings scenarios and recorded-data purchase assessments. The implementation does not establish financial independence, guarantee safe purchases, or measure realized financial improvement.

The most consequential findings are:

- The homepage promotes an eight-capability workspace and puts promotional images before the product introduction. Several banners advertise cash-out, utility bill rewards, or recharge cashback that this prototype cannot provide.
- Savings planning already calculates progress, remaining amounts, monthly requirements, spending adjustments, feasibility, and projected months to completion. The goal-detail UI omits the completion estimate and several useful gap/context values returned by its API.
- Affordability already subtracts all non-cancelled goal savings and an expense-based emergency buffer. Selecting a goal adds a monthly saving requirement check; it does not turn saved-fund protection on or off.
- Multilingual coaching is implemented, but general chat does not receive a calculated savings-plan result or purchase assessment. The dedicated optional affordability explanation does receive the assessment.
- MFS-oriented transaction labels, BDT, Dhaka dates, and Bangla/Banglish support provide a local context. They do not demonstrate an Upay integration or an advantage over generic budgeting applications.
- Customer interviews, a validated priority customer group, MFS-specific pain evidence, and measured customer outcomes cannot be supplied through code changes.

**Audit method and verification boundary.** Inspected README/package scripts, every product page and application API family, navigation, authentication, financial modules, Gemini integration, Prisma/SQL definitions, relevant shared components, tests, deployment instructions, and historical project reports. Visually inspected all five homepage carousel assets. Ran the existing local suite with `npm.cmd test`: **23 test files and 222 tests passed**. Auth/database dependencies are mocked; Gemini tests use mocked SDK calls or injected synthetic transports. No live Gemini, Supabase, database, application HTTP, or other external API requests were made. Browser tests were inspected but not executed; no server, build, migration, deployment, or production-site inspection was performed. UI findings describe the current source and supplied assets, not independently verified deployed behavior. Historical reports are context, not fresh service verification.

## 2. Judge-by-Judge Analysis

### Judge 1

| Status | Assessment |
| --- | --- |
| Already satisfied | The implementation can demonstrate goal requirements, spending-reduction scenarios, completion estimates, and purchase assessments. English/Bangla/Banglish coaching can discuss selected goal metrics; optional affordability explanations can explain a calculated assessment. |
| Partially satisfied | The relevant customer difficulties can be demonstrated with synthetic scenarios, but neither their prevalence nor customer benefit is established. Language choices exist, but the group that benefits most has not been identified through research. |
| Missing | Verified Upay customer interviews; consented examples of savings/purchase difficulties; evidence of which Customer group benefits most; comparative comprehension evidence for multilingual coaching. |

A passing software test proves a specified calculation or control works with its fixture. It does not validate customer demand or language preference.

### Judge 2

| Status | Assessment |
| --- | --- |
| Already satisfied | There is one individual account/workspace model with owned transactions, goals, and conversations. No Merchant, Agent, or Operations portal, role selector, or business-persona workflow was found. MFS-style recorded activity exists. |
| Partially satisfied | Public pages describe everyday decisions and contain relevant savings/purchase sections, but do not clearly name Customer as the target persona. Most public and workspace messaging still leads with a general financial toolkit. |
| Missing | A prominent Customer-only problem statement; a clear two-outcome hierarchy; a consistent customer story across homepage, About, Features, workflow, README, and submission report. The specific guideline track and its compliance requirements are not documented sufficiently to independently verify the judge's track-alignment observation. |

Persona clarification requires presentation changes, not a database role field or a new authentication flow.

### Judge 3

| Status | Assessment |
| --- | --- |
| Already satisfied | Two concrete, numerically demonstrable decision outputs exist: savings requirement/gap/timeline and reserve-aware purchase verdict/available amount. Financial arithmetic stays in backend code rather than generated prose. |
| Partially satisfied | The two outcomes are buried within a broader workspace. Local currency, dates, transaction labels, and language support make an MFS-oriented demonstration plausible, but the calculations remain generally applicable. Existing goal progress is recorded progress, not verified money held or improved independence. |
| Missing | Customer evidence of the selected pain points; a validated explanation of why these problems are especially relevant to MFS customers; defined and observed customer-level success measures. There is no implemented study or outcome tracking for comprehension, decisions changed, purchases avoided, or actual saving improvement. |

## 3. Existing Feature Classification

Classification concerns the focused product story. **No feature should be deleted on the basis of this table.** “DISTRACTING” below means possibly distracting in the judge-facing presentation.

| Feature | CORE / SUPPORTING / SECONDARY / DISTRACTING | Reason |
| --- | --- | --- |
| Goals list and goal creation | CORE | Establish target, saved amount, deadline, and progress for savings planning. |
| Goal details and monthly requirement | CORE | Show remaining amount and the required saving pace. |
| Contributions and contribution history | CORE | Maintain recorded progress toward a goal; allocations do not transfer money. |
| Goal edit/pause/resume/archive | SUPPORTING | Keep the plan usable as customer priorities change. |
| Goal-specific Savings Plan | CORE | Links recorded spending to gaps, category budgets, feasibility, and projected completion time. |
| What-if Savings Simulator | CORE | Compares hypothetical monthly saving capacity and completion dates. |
| Purchase Affordability | CORE | Assesses purchase amount against recorded cash flow, saved goal reserves, and an emergency buffer. |
| Optional AI affordability explanation | SUPPORTING | Helps explain the already calculated assessment in a selected language. |
| Transactions and transaction CRUD | SUPPORTING | Supply recorded income/expense context needed by both core outcomes. |
| Transaction search/filter/pagination | SUPPORTING | Help customers maintain and review the source records. |
| Dashboard cash flow and goal summaries | SUPPORTING | Orient customers to the records and goals behind decisions. |
| Spending/category analytics | SUPPORTING | Identify the spending categories used in savings scenarios. |
| Analytics comparison and saved insight snapshots | SECONDARY | Useful context, but not a primary savings/purchase decision outcome. |
| Financial Wellness score | SECONDARY | An illustrative composite score; unnecessary for calculating either core outcome. Prominence can distract from the focused story. |
| Wellness history | SECONDARY | Historical score comparison is not needed for the two decisions. |
| Multilingual AI Coach with selected goal | SUPPORTING | Explains existing goal/cash-flow context and qualitative next steps. |
| General-purpose coach topics and chat-led product story | DISTRACTING | “Talk through your finances” and broad money questions can imply a general AI assistant; purchase questions do not invoke the calculator from chat. |
| AI recommendations and status actions | SUPPORTING | Support follow-through; “Complete” is a status update, not proof of financial improvement. |
| Conversation creation/history/deletion | SUPPORTING | Preserve context for optional coaching without being the primary outcome. |
| Planning page | CORE | Houses simulator and affordability; the recorded-data goal plan itself lives in Goal Details. |
| Profile name/email/phone | SECONDARY | Account housekeeping, not a headline customer problem. |
| Language preference | SUPPORTING | Provides an API fallback, though current chat/explanation selectors default to English. |
| Authentication, ownership, and protected workspace | SUPPORTING | Necessary to use private customer records safely. |
| Public Security page and prototype disclosures | SUPPORTING | Explain the recorded-data and AI boundaries. |
| Home/About/Features/How it works | SUPPORTING | Should help a Customer discover the two core outcomes; current breadth weakens that role. |
| Eight-capability marketing and feature-count strip | DISTRACTING | Measures product breadth instead of the two customer decisions. |
| Cash-out/rewards/recharge carousel promotions | DISTRACTING | Lead visitors toward external wallet services/offers absent from the prototype. |
| Responsive UI, accessibility, and motion controls | SUPPORTING | Enable use on different devices; preserve the existing behavior. |

## 4. Two Core Outcomes — Technical Verification

### Goal-Based Savings Planning

The real path is `/goals` → `/goals/[id]` → `POST /api/v1/goals/[id]/savings-plan`. A separate hypothetical path is `/planning` → `POST /api/v1/simulator/what-if`. [Goal detail UI][goal-detail], [savings-plan handler][plan-route], and [simulator handler][sim-route] call implemented calculation modules.

| Capability | Actual implementation / API | What is actually supported |
| --- | --- | --- |
| Goal progress | [lib/finance.ts:4 — goalData()][goal-data]; `GET /api/v1/goals` and `GET /api/v1/goals/[id]` | Current ÷ target × 100, capped at 100, rounded to two decimals. Displayed in goal cards/details. |
| Remaining amount | `goalData()` | `max(target − current, 0)`. Displayed in details/cards. |
| Required monthly saving | `goalData()` | Remaining divided by rounded-up months until deadline, with at least one month and upward cent rounding. An overdue goal is flagged. |
| Recorded financial context | [lib/analytics.ts:43 — rollingPeriod()][analytics-period] and [spendingRows()/totals()][analytics-rows]; savings-plan handler | Owned income/expense aggregates over a validated 1–12 × 30-day lookback; default 90 days. |
| Available monthly saving and original gap | [lib/savings-plan.ts:13 — savingsPlan()][savings-plan] | Positive part of average monthly income minus expenses; required saving minus that available amount, clamped at zero. |
| Spending-reduction suggestions | `savingsPlan()` and [lib/analytics-validation.ts:22 — savingsPlanInput][plan-validation] | Applies one customer-selected reduction percentage to recorded expense categories; default 10%, allowed 0–50%. Returns average spending, suggested budget, and potential saving per category. Reductions are floored to cents. |
| Projected monthly saving | `savingsPlan()` | `max(monthly surplus + total suggested reductions, 0)`. An existing deficit must be covered before expense cuts become saving capacity. |
| Feasibility | `savingsPlan()` | `feasibleByTargetDate` requires a non-overdue goal, positive projected saving, and enough projected saving prorated over the actual remaining days. |
| Projected completion duration from records | `savingsPlan()` | `projectedMonthsToGoal = ceil(remaining / projected monthly saving)` or `null` without capacity. Returned by API and declared in [SavingsPlan frontend type][planning-types], but **not rendered in the goal savings-plan result**. |
| Hypothetical projected savings and completion date | [lib/projections.ts:25 — simulate()][simulate]; simulator API | Caps requested saving at nonnegative income minus expenses; returns horizon total, months to goal, and projected calendar date. Month-end dates are clamped; date projections over 100 years return `null`. UI displays the timeline if a goal is selected. |
| Recorded contributions | [app/api/v1/goals/[id]/contributions/route.ts:32 — POST][contributions] | Ownership, active-goal, remaining-amount, and optional source allocation checks; contribution plus goal amount/status update in a Serializable transaction. |

**Important numerical distinctions.** The monthly requirement uses `ceil(days / (365.25 / 12))`, while spending averages and feasibility use 30-day months. The feasibility result can therefore be “No” despite a zero monthly gap when the remaining deadline is short. This is explicitly tested; do not silently change either formula to simplify the story. The record-based plan returns months to completion, not a projected completion date. The simulator returns a calendar date under a different, end-of-month hypothetical model. It does not itself compare that date against the goal deadline or return the plan's feasibility flag.

**UI exposure gap.** [Goal Details:37][goal-plan-ui] shows monthly savings gap, projected monthly saving, a Yes/No feasibility flag, category spending/budgets, and notes. It does not show `projectedMonthsToGoal`, `remainingMonthlyGap`, per-category `potentialMonthlySaving`, the lookback's calculated income/expense context, or the full assumptions. Several of these already exist in the frontend type; exposing them requires no new financial calculation.

**Limits on the savings promise.** Feasibility is conditional on recorded/hypothetical values continuing. The same reduction percentage applies to all expense categories; there is no essential-versus-discretionary model or customer-specific recommendation engine. The plan allocates available cash flow to one goal and excludes other goals, debts, fees, and unrecorded obligations. No-history/no-income/overdue notes are implemented. A selected simulator goal may be paused, completed, or cancelled because that endpoint checks ownership, not eligibility. The simulator's horizon total is not capped at the goal's remaining amount and can exceed the target; it represents scenario savings, not an automatic goal contribution. No interest, fees, or inflation are modeled. These are scenario tools, not commitments or guarantees.

**Observed test evidence.** [tests/finance.test.ts:23][finance-tests] checks progress, upward cent rounding, completed/overdue handling, and validation. [tests/phase3-calculations.test.ts:110][plan-tests] checks category cuts, gaps, deficits, overdue/short deadlines, empty history, and rounding. [tests/phase3-routes.test.ts:123][plan-route-tests] checks ownership, active-goal requirements, and calculation without persistence. [tests/phase56-calculations.test.ts:34][sim-tests] checks capped saving, month-end dates, missing/funded goals, deficits, and large timelines. These passed in the current local suite.

For example, an existing fixed-date **synthetic test** supplies average income BDT 1,000, expenses BDT 900, remaining target BDT 900, and required saving BDT 300. A 10% cut produces BDT 190 projected monthly saving, BDT 110 remaining monthly gap, five projected months, and an infeasible deadline. This is calculation evidence from a fixture, not an interview or an observed customer's result.

### Purchase Affordability

The real path is `/planning` → `POST /api/v1/affordability/check` → [lib/projections.ts:89 — affordability()][affordability]. [The handler][afford-route] prepares an owned-data snapshot in a RepeatableRead transaction; it performs no financial writes.

| Capability | Actual implementation / API | What is actually supported |
| --- | --- | --- |
| Purchase amount | [lib/phase56-validation.ts:31 — affordabilityInput][afford-validation]; Planning UI | Positive, finite BDT amount with at most two decimals and the shared money ceiling. |
| Recorded cash-flow balance | Affordability handler:19 | Income-category sums minus expense-category sums for all records before the current Dhaka day's end. It is not a queried wallet balance. |
| Recent cash flow | `rollingPeriod(3)`, `spendingRows()`, `affordability()` | Fixed 90-day lookback; calculates average monthly income, expenses, and net flow using three 30-day months. |
| Protected saved goal funds | Affordability handler:23 and `affordability()` | Sums `current_amount` across **all non-cancelled goals**, including paused/completed goals, and always deducts that sum. |
| Selected goal's saving pace | `goalData()` inside `affordability()` | If the optional selected goal is ACTIVE, monthly net flow must meet its required monthly saving. Without an active selected goal, the monthly requirement is zero. |
| Emergency buffer | `affordability()` and `affordabilityInput` | Average monthly recorded expenses × selected buffer months; default 3, validated 0–12. It is an assumed reserve, not a verified emergency account. |
| Available amount | `affordability()` | `max(recorded balance − all reserved goal savings − emergency buffer, 0)`. |
| Verdict | `affordability()` | `INSUFFICIENT_DATA`, `AFFORDABLE`, `CAUTION`, or `NOT_AFFORDABLE`, according to the rules below. |
| Balance after purchase | `affordability()` | Recorded balance minus purchase amount. This is hypothetical cash flow after the purchase, not remaining spendable funds after reserves. It can be negative. |
| Optional AI explanation | Affordability handler:30 and [lib/gemini.ts:14 — generateCoaching()][gemini] | Default `explain=false`; only explicit opt-in calls Gemini. Sends the calculated assessment/assumptions/limitations and instructions not to recalculate or change the decision. Returns text without storing chat or recommendations. |

The actual verdict rules are:

1. Sufficient data means at least one all-time record and **positive recorded income in the recent 90 days**. Otherwise return `INSUFFICIENT_DATA`.
2. `AFFORDABLE` requires sufficient data, purchase ≤ available amount, and recent monthly net cash flow ≥ the selected ACTIVE goal's monthly requirement (or zero without one).
3. Otherwise, a purchase ≤ the nonnegative recorded balance is `CAUTION`.
4. A purchase beyond that balance is `NOT_AFFORDABLE`.

**Protection wording needs precision.** “Protect a selected goal (optional)” in [Planning:31][planning-ui] and “optional goal protection” in [README:34][readme] can imply that unselected saved goals are unprotected. In fact, all non-cancelled saved balances are always reserved. Only **one selected active goal's future monthly requirement** is checked; future contributions for every active goal are not combined. A cancelled goal is excluded from saved-fund aggregation; a paused/completed/cancelled selected goal adds no monthly requirement.

**Decision explanation gap.** The UI shows verdict, available amount, balance after purchase, goal savings, buffer, and limitations. It does not show the returned recorded balance, income/expense averages, monthly net flow, or selected monthly requirement. Therefore a customer may not understand a `CAUTION` result caused by the monthly saving condition even when the purchase fits the available amount. The distinction between balance after purchase and spendable amount after reserves should be explicit.

**Limits on the affordability promise.** A single recent income record can meet the data gate; complete expense history is not required. With zero recorded expenses, the calculated emergency buffer is zero, including at the default three months. Starting balances, income volatility, missing obligations, credit, fees, and separate liquid/emergency accounts are not modeled. Saved goals may overlap expenses already recorded; this can double-count deductions, and the code discloses that limitation. An overdue selected active goal is noted but does not categorically block an `AFFORDABLE` verdict. No forecast of goal completion after purchase is produced.

If the customer opts into explanation and Gemini fails, [the handler][afford-route] currently fails the entire request; the UI has cleared the previous result. The deterministic assessment remains independent of Gemini when `explain=false`. A separate fallback could improve resilience later, but requires a reviewed backend/frontend response-contract change.

**Observed test evidence.** [tests/phase56-calculations.test.ts:104][afford-tests] checks reserves/buffer, all four verdict categories across its cases, and missing recent income. [tests/phase56-routes.test.ts:363][afford-route-tests] checks foreign goal rejection, no provider call by default, owner-scoped aggregates, and an optional explanation of a fixed decision without AI persistence. These passed locally. Direct calculation coverage for selected active-goal gating, zero-expense/incomplete-history cases, and overdue selected goals is limited; the suite's pass count should not imply those boundaries are comprehensively tested.

An existing **synthetic calculation test** supplies BDT 2,500 recorded balance, BDT 100 goal savings, BDT 500 monthly expenses, and a three-month buffer. Available purchase amount is BDT 900. Its BDT 100 purchase is `AFFORDABLE`; BDT 2,000 is `CAUTION`; BDT 3,000 is `NOT_AFFORDABLE`. These are controlled fixture results, not verified customer purchasing capacity.

## 5. Current Positioning Problems

These are actual source wording or visually inspected image contents. Proposed directions are recommendations only. Neutral account/security wording does not need wholesale replacement merely because it contains “workspace.”

| File / location | Route/page | Current wording or presentation | Why it conflicts with feedback | Recommended direction |
| --- | --- | --- | --- | --- |
| [app/page.tsx:13][home] and [components/hero-slider-assets.ts:8][hero-assets] | `/`, first content | Promotional carousel precedes the product hero; natural filename order begins with `heroSlider2.png`. | The first story is wallet promotion, not a Customer's savings or purchase problem. | Lead with existing product/problem content; keep supplied assets and carousel, but visibly contextualize promotions and prevent unsupported service offers from leading the prototype story. |
| `public/heroSlider2.png` | `/`, initial carousel image | Image advertises zero-charge ATM cash-out and contains an Upay agent cash-out fee note. | Implies live cash-out service/pricing; the app only records activity. External agent mention also adds noise to a Customer-only story. | Label as supplied promotional material, not a prototype capability. Do not claim the offer is current or implemented. |
| `public/heroSlider3.png` | `/`, carousel | Utility bill payment and daily BDT 5,000 cash-reward promotion, with a Pay Bill phone screen. | Bill payment and rewards are absent from the prototype. | Apply the same explicit promotional context and prioritize the two implemented outcomes. |
| `public/heroSlider5.png`, `public/heroSlider6.png` | `/`, carousel | Airtel cirkle/Robi recharge cashback promotions. | Cashback/recharge execution is not implemented. | Distinguish supplied external promotions from recorded recharge entries; do not present them as product benefits. |
| `public/heroSlider4.png` | `/`, carousel | Bangla spending/planning slogan with illustrated summary, comparison, and goal numbers. | More relevant, but static figures and pictured UI can be mistaken for the actual product. | Mark as illustrative; anchor the product story in real implemented savings/purchase outputs. |
| [app/page.tsx:14][home-copy] | `/`, hero | “Smarter money. Better decisions. Powered by AI.” and “Record financial activity, understand spending, build savings goals and explore decisions...” | AI and a broad activity list lead; Customer and the exact two difficulties are unspecified. | Name Customer and the savings-plan/purchase decision pair; make multilingual AI supporting explanation. Preserve the recorded-data footnote. |
| `app/page.tsx:15–16` | `/`, capability strip/cards | “8 Core capabilities,” “1 Financial workspace,” “A CONNECTED FINANCIAL TOOLKIT.” | Signals breadth and feature count instead of one or two outcomes. | Organize the story around the two decisions; retain other capabilities as supporting context. |
| `app/page.tsx:17` | `/`, dashboard section | “See your financial life in one place.” and “...illustrative wellness into the same workspace.” | Generic consolidated-finance promise; wellness appears central. | Explain why recorded cash flow and spending context help plan a goal or assess a purchase. |
| `app/page.tsx:18–19` | `/`, workflow/AI section | “Record → Understand → Set goals → Plan → Ask AI → Improve” and a dedicated “YOUR AI FINANCIAL COACH” section. | Broad routine and conversation can overshadow measurable decision outputs. | Show the savings decision and purchase decision first, then optional language-assisted explanation. |
| [app/about/page.tsx:6][about] | `/about`, hero | “THE IDEA BEHIND THE WORKSPACE,” “Financial clarity should be easier,” “...one experience for users in Bangladesh.” | General audience and clarity problem; Customer pain remains implicit. | State a Customer-only design hypothesis about saving pace and purchase affordability, clearly unvalidated. |
| `app/about/page.tsx:7–8` | `/about`, problem/approach | Five problems, including scattered records, spending patterns, savings routine, purchase context, and general financial context; “Record/Understand/Plan/Improve.” | Expands the problem beyond the selected one or two outcomes. | Lead with savings goal achievability and purchases that preserve savings/buffer; describe records as inputs. |
| `app/about/page.tsx:10,12` | `/about`, ecosystem/vision | “THE PRODUCT ECOSYSTEM” and “...an AI-assisted financial workspace could complement a digital financial experience.” | Returns to a generic ecosystem/toolkit vision without MFS customer evidence. | Connect the current recorded-data prototype to the two decisions; label MFS-specific benefit as a research hypothesis. |
| [app/features/page.tsx:7][features] and `:14–16` | `/features` | Dashboard and transactions first; “Personal workspace”; “8 CAPABILITIES. ONE WORKSPACE.” | Core decision tools are later in an equally weighted catalog. | Put goal planning and purchase affordability first, followed by financial context and optional coaching. Preserve all eight capability entries. |
| [app/how-it-works/page.tsx:5][workflow] and `:17` | `/how-it-works` | “Nine steps through the actual application”; dashboard/analytics precede goals; “Test a savings plan” describes the hypothetical simulator. | Long feature tour; conflates the record-based goal plan and hypothetical simulation. | Explain the two Customer journeys and distinguish Goal Details' recorded-data plan from the simulator. Account/records remain preparation. |
| [components/auth-form.tsx:84][auth-copy] | `/login`, `/signup` | “Your smarter financial companion”; “One private workspace...” and four broad benefits. | Onboarding reinforces a general-finance companion. | Update explanatory copy to the two Customer decisions only; retain fields, handlers, validation, and redirects. |
| [components/public-layout.tsx:19][footer] | Public footer | “Financial clarity for everyday decisions”; “Built around your records. Designed for more informed decisions.” | Generic recap misses Customer and the decision pair. | Use a concise savings/purchase description while preserving no-wallet/no-endorsement wording. |
| [components/public-page.tsx:10][final-cta] | Homepage final CTA | “Build better financial habits, one decision at a time.” | Implies broad habit improvement without measurement. | Invite a specific goal plan or purchase check; do not claim proven habit improvement. |
| [app/layout.tsx:8][metadata] | All routes, metadata | “Track recorded finances, save toward goals, and get financial coaching.” | Omits purchase affordability and Customer; reinforces tracking/coaching. | Align metadata with the two supported decision outcomes. |
| [components/ui.tsx:29][page-title] / [components/app-shell.tsx:9][shell] | All authenticated pages/sidebar | “YOUR FINANCIAL WORKSPACE”; “YOUR WORKSPACE”; Dashboard, Transactions, Goals, Analytics, AI Coach, Planning, Profile. | No explicit Customer identification; planning is late in navigation. | Clarify Customer context and prioritize existing Goals/Planning links without deleting routes or changing auth. |
| [app/(workspace)/dashboard/page.tsx:14][dashboard] | `/dashboard` | “Here’s your financial overview”; leading action “Add a transaction”; prominent spending/insights/wellness. | Context collection and broad overview lead over the intended decisions. | Add/promote entry points to existing goal plans and purchase checks; keep current metrics/modules. |
| [app/(workspace)/analytics/page.tsx:15][analytics-ui] | `/analytics` | “Understand your recorded spending and illustrative financial wellness.” | If promoted as the core pitch, makes wellness a competing product outcome. | Explain spending context for planning; retain wellness as a secondary illustrative tool. |
| [app/(workspace)/coach/page.tsx:42][coach-ui] and `:48,51–52` | `/coach` | “Talk through your finances”; “What would you like to understand about your money?”; “Can I afford a large purchase?”; “All finances.” | General chat suggests a numerical affordability answer even though no purchase calculation is invoked. “All finances” overstates the minimized recorded-data context. | Use outcome-related prompts, clarify scope, and link purchase questions to the deterministic check; preserve optional coaching/history. |
| [app/(workspace)/planning/page.tsx:25][planning-ui] and `:31,34` | `/planning` | “Plan your next move”; “Protect a selected goal (optional)”; “Balance after purchase.” | Page is relevant but reserve behavior and post-purchase amount can be misunderstood. | Clearly name savings scenarios/purchase decisions; explain always-reserved savings, the selected monthly pace check, and hypothetical recorded balance after purchase. |
| [README.md:5][readme] and `:17,34,439` | Repository introduction/workflow | “...one personal workspace”; audience includes finance learners and evaluators; “optional goal protection”; broad eight-step tour. | Evaluators are not the target Customer; broad positioning and imprecise reserve explanation carry into judging material. | State Customer-only focus and two outcomes; preserve the complete technical reference and correct protection wording later. |
| [FINAL_PROJECT_REPORT.md:5][project-report] and `:37,49,59–61,396` | Submission report | “AI-Powered Personal Financial Management and Decision-Support Prototype”; “integrated personal financial management”; intended users include learners and evaluators; combined-workspace conclusion. | A judge reading the report receives the same broad story the feedback questions. | Reposition cover, problem, objectives, scope hierarchy, and conclusion around the two Customer decisions; add an honest validation gap. Retain technical evidence. |

**Already aligned wording worth preserving:** the homepage's [goal → plan → decision section:20][home-decisions], the Features affordability description, [Goal Details' no-transfer note][goal-plan-ui], [Planning's recorded-data/no-wallet note][planning-ui], and the [Security boundary page][security]. The problem is emphasis and precision, not that every existing sentence is wrong. No exact “manage every aspect of finances” claim was found in current app copy.

## 6. Customer Persona Audit

**Target persona = Customer only.** Structurally, the app already fits an individual Customer: one profile per Auth identity and personally owned records. [prisma/schema.prisma:53][schema-users] contains name/email/phone/language, with no product-persona role. Authenticated API checks scope resources to the verified user. A `Customer` role column or role-selection onboarding is unnecessary.

Customer is not explicitly named in the inspected current app/components/lib/Prisma product text. The public pages use “users,” “your,” or “users in Bangladesh”; README/report also name learners and evaluators. The app does not verify whether a signed-in person actually has an Upay customer account. Therefore future copy must distinguish **the intended Customer audience** from verified Upay account linkage.

**Other-persona language:** “Merchant payment,” “Merchant (optional),” merchant search, and `merchant_name` describe a customer's transaction counterparty, not a Merchant persona. Retain these fields/types. No Agent/Operations persona or portal was found. The ATM banner contains Bengali Upay agent wording in a service-fee note; that is promotional image content, not an implemented Agent workflow. Do not convert it into a new persona.

Highest-impact places to explicitly communicate Customer are the homepage hero, About problem statement, README audience, submission report, Features introduction, and How it works journeys. Login/signup explanatory copy and a shared workspace caption can reinforce this once. Goals/Planning can use ordinary “you/your” language after the audience is established; repeating “Customer” in every field would add friction.

Within the Customer audience, a possible research hypothesis is customers who use MFS for everyday activity, have a near-term savings goal/planned purchase, and want Bangla or Banglish explanations. This is **not a validated segment or a claim that it benefits most**. Interviews must identify the most useful customer group before that is asserted.

## 7. MFS Relevance Audit

### 1. Already supported by implementation

| Evidence | Defensible interpretation | Boundary |
| --- | --- | --- |
| [TransactionType enum][schema-types], [Transactions UI][transactions-ui], and [category seed definitions][seed] | Customers can manually record cash in, cash out, merchant payments, and mobile recharge with income/expense categories. | Recording those labels does not execute or synchronize an MFS transaction. Seed definitions were inspected, not applied or checked against the live database. |
| [BDT formatting / Dhaka dates][ui-money], [analytics periods][analytics-period], [today()][validation] | Currency/date presentation supports a Bangladesh-oriented demonstration. | These are localization choices, not evidence of an MFS-specific need or exclusive advantage. |
| English/Bangla/Banglish request modes and prompt instructions | Optional coaching can explain recorded customer context in those modes. | Current model fluency/availability and which customers prefer each mode were not live verified. Full application UI translation is absent. |
| Goal planning and reserve-aware assessment | A recorded MFS-style activity example can feed the two decisions. | The formulas work on generic categorized records; there is no wallet-specific financial engine. |
| Explicit no-wallet disclosures | The prototype can present an honest recorded-data MFS-oriented scenario. | A disclosure is a product boundary, not an integration. |

### 2. Supported only by product context/branding

UPAY naming/logo, blue/yellow branding, Bengali promotional banners, Bangladesh references, and the README's Upay-ecosystem inspiration support contextual association. They provide no official partnership, endorsement, access, verified customer status, or research evidence. Promotional wallet screenshots are not screenshots of this application. The large banner offers are not proof of implemented product value.

### 3. Not currently supported

- Live Upay wallet access, verified balance, automatic transaction synchronization, statement ingestion, or an Upay authorization/linking flow.
- Money movement, bill payment, merchant payment execution, cash-out execution, recharge execution, rewards, or cashback.
- Provider-specific fees, wallet limits, offer eligibility, official MFS guideline compliance, or wallet-specific affordability rules.
- Full accounting of transfers between cash/bank/wallet accounts or a separate starting liquid balance. [validateCategory()][transaction-category] treats `CASH_IN` as income and every other transaction type as expense. A real wallet top-up can be a transfer rather than new income, and cash-out can be conversion to cash rather than consumption. Consequently, this ledger is a simplified recorded cash-flow model, not verified total financial position.
- Detection of complete transaction coverage, verified emergency liquidity, simultaneous future contributions for every goal, or automated proof of financial-independence outcomes.
- Evidence that Upay/MFS customers struggle more with these decisions, or benefit more from this prototype, than customers using general budgeting tools.

`upay_future` in [the schema][schema-users] and SQL source constraint is a reserved string. [transactionCreate][validation] only accepts `manual`/`mock`. There is no implemented future integration behind that value.

### 4. Claims we should NOT make without evidence

Do not claim verified Upay customer demand, measured language benefits, validated priority customer groups, improved actual saving, reduced harmful purchases, automatic synchronization, real wallet access, actual fund protection, an official partnership, current banner pricing/offers, regulatory approval, or superior MFS-specific effectiveness. Do not treat a wellness score as a credit score or a real emergency-fund balance.

The defensible current story is **a Customer-focused, MFS-oriented prototype using manually recorded activity to explore savings and purchase decisions in BDT, with optional multilingual explanation**. The proposed advantage of connecting familiar activity to goal-aware decisions needs customer comparison evidence. Branding alone cannot answer Judge 3.

## 8. Multilingual AI Audit

| Check | Evidence | Finding |
| --- | --- | --- |
| English | [Coach UI:51][coach-ui], [language enum][afford-validation], [Gemini prompt:57][gemini-prompt] | `en` is an accepted request mode; prompt requests English. Supported in mocks/synthetic transport tests. |
| Bangla | Same sources | `bn` is accepted; prompt requests Bengali script. `bn-BD` profile fallback maps to `bn`. Unicode text survives the inspected JSON/persistence paths and local mocks. |
| Banglish | Same sources and [lib/coach-language.ts:6 — assertCoachLanguage()][language-check] | `banglish` requests transliterated Bangla. A deterministic U+0980–U+09FF check rejects Bengali characters in the response message and every recommendation before storing a chat turn. |
| Request/output validation | [phase56-validation.ts][afford-validation], [generateCoaching()][gemini] | Strict request enum; nonempty bounded message; optional owned goal; strict response message/recommendation shape; maximum three recommendations. Unsupported language is rejected before transport. |
| Language-quality boundary | `assertCoachLanguage()` and Gemini prompt | English/Bangla have no deterministic language detector. Banglish rejection only proves absence of Bengali-block characters; it does not establish natural Banglish, Latin-only text across all other scripts, fluency, or financial correctness. |
| Financial context | [lib/coach-context.ts:15 — minimizedContext()][coach-context] | Fixed 90-day averages: income, expenses, net flow, positive saving capacity, transaction count, goal count, total goal savings, top five spending categories, BDT, period, and limitations. No account IDs, contact details, merchants, or descriptions are added by context preparation. |
| Goal context | `minimizedContext()` plus [message handler][coach-route] | Optional goal is owner-checked. Supplies target/current/remaining/monthly requirement/deadline/overdue/status, without the goal name. Does not supply every goal's detail or combined monthly obligations. |
| Conversation history | Message handler:44 | Up to six recent user/assistant messages, each capped at 2,000 characters. A user can still put private data into message/history text; minimizing computed context does not remove that. |
| Recommendations | [coachResponse schema][afford-validation], [message persistence][coach-route], [recommendation UI][recommendations] | Qualitative SAVING/BUDGET/GOAL/EMERGENCY recommendations with priority and status. Stored with the turn; ownership and allowed status transitions enforced. No automatic financial action. |
| Optional affordability explanation | [Affordability handler:30][afford-route] | Receives the complete backend assessment, including assumptions/limitations. `explain=false` by default. Text is returned for that result; no conversation/recommendation persistence. |
| Provider boundary | [lib/gemini-client.ts:5][gemini-client] | Server-side `@google/genai`, configured default `gemini-3.5-flash-lite`, optional model override, official endpoint, bounded timeouts/retries, no fallback model. This is source configuration, not current live-model verification. |
| Persistence/retry safeguards | [message handler][coach-route] and [lib/coach-retry.ts][coach-retry] | Paid generation occurs outside DB transactions. Messages/recommendations/conversation version commit atomically; failed generation stores no partial turn. Committed request IDs replay stored output. Simultaneous in-flight retries can still consume multiple provider calls. |

The current chat context does **not** contain `feasibleByTargetDate`, category reduction budgets, savings-plan projected months/date, all-time affordability balance, a purchase amount, an emergency-buffer assessment, or a calculated purchase verdict. General chat has no database tools/function execution. Its prompt says to direct customers to the savings-plan/simulator/affordability endpoint when a requested number is absent. Therefore do not advertise chat itself as the affordability engine or a fully integrated explainer of the current savings-plan result.

Profile preference accepts `bn`, `bn-BD`, and `en`, not a persisted Banglish preference. Chat and affordability selectors offer all three AI modes but currently default to English, with no binding to the saved profile preference. The API fallback only applies when language is omitted. This is a small frontend preference-consistency gap, not a need to change the schema. Entire pages, controls, and deterministic result labels are not translated by the language selector.

Prompt instructions prohibit arithmetic, invented numbers, credential requests, and financial execution, but output validation does not semantically prove that prose obeyed those rules. The optional explanation cannot modify the returned deterministic decision field, although its words could still be misleading or contradictory. Existing warnings should remain.

[Coach language tests][language-tests], [Gemini prompt/output tests][gemini-tests], [SDK synthetic-transport tests][transport-tests], and [route persistence tests][coach-tests] passed locally. [COACH_DIAGNOSTICS.md][diagnostics] records historical successes, provider failures, and a Banglish failure before later clarification/enforcement; none establishes current live availability or language quality. No live call was made for this audit.

**Appropriate supporting role:** help a Customer understand supplied goal requirements and qualitative spending choices, clarify terms in a chosen language, and explain the dedicated calculated affordability assessment. Lead the demo with deterministic decisions; show language assistance afterward. Linking existing decision tools from chat is sufficient for an initial focused story. Passing a savings-plan result into AI would be a separate, optional context/prompt change, not a feature that currently exists.

## 9. Customer Evidence Still Required

**There is no verified customer interview evidence for this audit.** No interviews, survey percentages, testimonials, or validation results have been invented. Statements of customer difficulty should be framed as design hypotheses until evidence is collected.

The following judge requirements cannot be solved by code: validating the pain points, identifying the Customer group that benefits most, establishing why the need is especially relevant to MFS customers, demonstrating comprehension improvements from multilingual explanation, and demonstrating actual financial-independence outcomes.

Evidence to collect later:

| Evidence needed | What to collect | What it would establish |
| --- | --- | --- |
| Actual Customer context | Consented interviews with people who use Upay/MFS as customers; capture how they use it, income regularity, goals/purchases, record habits, language preference, and current alternatives. Do not request credentials. | Whether participants fit the intended Customer audience and which customer situations recur. |
| Savings-planning difficulty | A recent concrete savings goal: target, deadline, current planning method, obstacles, how monthly contributions were chosen, and what caused uncertainty or missed progress. | Whether goal achievability/timeline is an experienced problem, rather than a developer assumption. |
| Purchase-decision difficulty | A recent planned purchase: how the customer checked affordability, what savings/obligations were protected, how emergencies were considered, and whether the decision was postponed or changed. | Whether reserve-aware purchase assessment solves a meaningful customer difficulty. |
| MFS-specific relevance | Examples of how cash in/out, cash/wallet transfers, merchant payments, recharge, fragmented records, or irregular inflows affect those decisions; compare existing budgeting methods/tools. | Why the selected problem may be particularly relevant to these customers, and where the current simplified ledger is inadequate. |
| Priority customer group | Compare the frequency/severity of both problems, recording willingness, language comprehension, and prototype usefulness across interviewed Customers. | Which group within the Customer persona benefits most. Do not choose that group based on banner imagery or assumptions. |
| Language assistance | Have customers interpret the same deterministic result in their preferred language; note misunderstandings, preference reasons, and correct understanding before/after explanation. | Whether English, Bangla, or Banglish support materially helps a specific group. Preference alone does not prove better decisions. |
| Two task outcomes | Observe a customer identifying a goal's requirement/gap/timeline, then evaluating a purchase while explaining the goal reserve and buffer. Record task completion, errors, time, and whether the customer can explain the limits. | Measurable usability/comprehension outcomes for the focused product. These are study measures, not current results. |
| Longer-term financial effect | If feasible, consented follow-up on actual contributions, plans followed, and purchase decisions, with clear recorded-versus-verified boundaries. | Whether useful task performance leads to real financial benefit. Immediate demo success cannot establish this. |
| Traceable research record | Consent notes, dated anonymized interview notes/transcripts, participant-selection method, exact sample size, genuine quotes, and a clear finding-to-product-decision mapping. | Credible evidence that judges can assess without exposing private finances. Small convenience samples should not be presented as population percentages. |

Recommended initial measurable outcomes are:

1. **Savings planning:** the Customer can correctly identify remaining amount, required monthly saving, the scenario's feasibility/gap, and estimated completion time, and choose a revised plan while understanding its assumptions.
2. **Purchase decision:** the Customer can correctly interpret a verdict and available amount, explain the saved-goal/emergency deductions and selected monthly saving check, and recognize when recorded data is insufficient.

The application already exposes numbers suitable for these tasks, but there are no observed study results. Recommendation “Complete” status and wellness scores are not substitutes for either measure. Savings-plan and affordability results are not persisted as decision histories; no study instrumentation or actual financial-effect measurements were found. A manual, consented research log is enough initially; a new database is unnecessary.

**Improvements possible immediately once implementation is authorized:** sharpen Customer/problem wording, reorder existing feature emphasis, distinguish record-based plans from hypothetical simulation, show existing numerical outputs, clarify reserve/data limitations, align chat entry points, and prepare a clearly synthetic two-outcome demo. None requires interviews to justify accurate implementation descriptions. Claims about demand, best customer group, or proven benefit must wait for evidence.

## 10. Recommended Changes

Recommendations below favor existing fields, calculations, routes, and components. **No change in this table has been implemented.** “Backend” means handlers/contracts/services; “Calculations” means financial formula or decision-policy changes. “AI” means generation/context/orchestration changes, not merely using an existing language selector.

### P0 — Essential for judge feedback

| ID / page or module | Current problem | Recommended change | Why | Risk | Backend required? | Database required? | Calculations required? | AI required? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P0-1 — Home, About, metadata, README, submission report, auth explanatory copy/footer | Customer and the two problems are unclear; broad financial management/AI wording leads. | State Customer-only intended audience and the savings-planning/purchase-affordability pair consistently. Identify claims as hypotheses and keep prototype disclosures. | Directly addresses Judges 2/3 without new features. | Low; content review needed to avoid overclaiming. | No | No | No | No |
| P0-2 — Homepage carousel/product introduction | Unsupported cash-out/reward/recharge offers appear first. | Put the existing product introduction/decision story first; visibly label supplied promotional images as external context/illustration, with no live-wallet, offer, or partnership implication. Preserve assets and carousel controls. | Prevents the strongest first-impression mismatch and strengthens honest MFS boundaries. | Low–medium; content order and responsive verification. | No | No | No | No |
| P0-3 — Features and How it works | Equal-weight feature tour; record-based plan confused with simulator. | Present two Customer journeys using existing sections: recorded-data goal planning and purchase checking. Describe simulator separately as hypothetical; other features provide context. | Narrows the story and gives judges a short, traceable workflow. | Low; preserve anchors/links. | No | No | No | No |
| P0-4 — Goal Details / Savings Plan result | Projected months and remaining gap are returned but hidden. | Display `projectedMonthsToGoal`, `remainingMonthlyGap`, category saving potential, and the current recorded input/assumption context with clear null/overdue labels. Reuse backend values; extend frontend types only for any additional returned fields used. | Makes goal achievability and timeline demonstrable without building a new planner. | Low–medium; check empty/deficit/short-deadline states. | No | No | No | No |
| P0-5 — Planning / Affordability result and input help | Selected-goal protection wording is misleading; monthly gating/data assumptions are hidden. | Explain that all non-cancelled saved goal funds are reserved; selection checks one ACTIVE goal's monthly requirement. Show returned recorded balance, monthly net flow, selected requirement, and input/result limitations. Clarify “Balance after purchase”; show status implications and warn that omitted expenses/zero buffer undermine the assessment. | Makes the actual verdict understandable and avoids treating recorded-data assessment as guaranteed safety. | Low–medium; preserve verdict and reserve arithmetic. | No | No | No | No |
| P0-6 — Customer research and judge evidence | No interviews, best customer group, MFS pain evidence, or outcome results. | Plan/collect consented Customer evidence described in Section 9 and report only real findings. Define the two task measures and label the current demo synthetic. This is future work, not authorization to contact anyone now. | Judges 1/3 explicitly require evidence; code cannot replace it. | Low technical; research quality/privacy require care. | No | No; manual records suffice | No | No |

### P1 — Strongly recommended

| ID / page or module | Current problem | Recommended change | Why | Risk | Backend required? | Database required? | Calculations required? | AI required? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1-1 — Dashboard/sidebar/shared titles | Overview, transactions, analytics, and chat dominate navigation/entry actions. | Promote existing Goals and Planning links/actions and clarify Customer context. Keep every current route, summary, and module available. | Gives the focused public promise a matching authenticated entry path. | Low; navigation/auth-aware links need regression checks. | No | No | No | No |
| P1-2 — Coach starters and links | General-finance prompts; purchase starter suggests chat can calculate affordability. | Use goal-related explanation prompts and explicit links to existing savings/purchase tools. Describe minimized recorded-data context accurately instead of “All finances.” | Keeps multilingual coaching supportive and routes numerical decisions to existing calculators. | Low; preserve draft-only behavior until Send. | No | No | No | No |
| P1-3 — Coach/affordability language defaults | UI ignores saved preference and defaults to English. | Map existing `en` preference to English and `bn`/`bn-BD` to Bangla; keep explicit Banglish choice. Avoid changing the persisted preference contract. | Makes supporting language behavior consistent without database changes. | Low; verify selections and payload codes. | No | No | No | No |
| P1-4 — Optional affordability explanation failure | Gemini failure hides an otherwise completed deterministic assessment. | Consider returning the calculation with a safe “explanation unavailable” state, or requesting explanation separately. Review the response contract and focused failure test before implementing. Keep no-AI default. | Core purchase assessment should remain useful if optional explanation fails. | Medium; error/contract changes, no financial arithmetic changes. | Yes | No | No | Yes, error orchestration only |
| P1-5 — Focused calculation/UI regression coverage | Some decision boundaries lack direct tests and newly surfaced fields need checks. | Add targeted synthetic cases for the selected ACTIVE monthly requirement, inactive/overdue goal behavior, missing expenses/zero buffer, reserved-goal scope, and the visible gap/timeline/rationale. Keep existing tests and policy expectations. | Protects the focused decision story against misleading outputs and accidental regressions. | Low; no production behavior change by adding tests. | No | No | No | No |

### P2 — Optional polish

| ID / page or module | Current problem | Recommended change | Why | Risk | Backend required? | Database required? | Calculations required? | AI required? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P2-1 — Decision help/static public previews | Technical concepts may be unfamiliar; previews do not show the full decision reasoning. | Add short plain-language definitions/examples for monthly gap, earmarked savings, emergency horizon, and hypothetical balance; clearly label static values. Preserve existing layout/components. | Improves comprehension; customer testing should guide final wording. | Low | No | No | No | No |
| P2-2 — Optional savings-plan AI explanation | Chat does not receive plan feasibility/gap/budget/timeline results. | Only if research shows value, pass an owned precomputed plan snapshot through a deliberate explanation flow. Do not imply this integration exists now or let AI recompute results. Review privacy, prompt, persistence, and failures separately. | Could deepen language assistance after the two deterministic workflows are clear. | Medium; expands context and provider use. | Yes | No if response-only; persistence would be separate scope | No | Yes |

Persistent Banglish profile preference, full-page translation, wallet integration, richer budgeting, notifications, new reserve accounting, and automated research telemetry are not necessary for the focused final-round repositioning. They should not become incidental development scope.

### NO CHANGE — Already aligned

| Page/module | Current condition / recommended handling | Why | Risk of preserving | Backend / Database / Calculations / AI changes required? |
| --- | --- | --- | --- | --- |
| Authentication and profile identity | Preserve sign-up/login, confirmation callback, session restoration/refresh, verified profile ownership, sign-out, and existing fields. Only surrounding explanatory copy is proposed. | Customer focus does not require a new identity system. | Low | No / No / No / No |
| Transaction and goal CRUD/contributions | Preserve validation, user scoping, lifecycle rules, atomic allocations, and retained history. | Necessary source records and progress already work. | Low | No / No / No / No |
| Financial calculation modules | Preserve `goalData`, `savingsPlan`, `simulate`, `affordability`, analytics, and wellness formulas. Explain their assumptions. | Existing tested behavior supports the scope; presentation does not justify formula changes. | Known model limits remain, as documented | No / No / No / No |
| AI generation/persistence foundation | Preserve validated output, language rejection, minimized context, retry IDs, ownership, atomic storage, conversation guards, and recommendation transitions. | Provides supporting coaching without destabilizing persistence. | Existing provider/semantic limits remain | No / No / No / No |
| Security/prototype boundaries | Preserve no-wallet, no-money-movement, informational-AI, illustrative-wellness, no-endorsement, and static-demo disclosures. | Essential for an honest focused prototype. | Low | No / No / No / No |
| Prisma/schema/SQL and deployment configuration | Preserve existing models, enums, foreign keys, Decimal types, RLS definitions, external Auth inventory, environment names, dependencies/model configuration, runtimes, and deployment scripts. | No essential repositioning need for infrastructure changes. | Existing operational limits remain | No / No / No / No |

### Existing functionality that must remain untouched unless necessary

- **Authentication:** `components/auth-provider.tsx`, auth form handlers, `lib/auth.ts`, profile synchronization/upsert, confirmation callback, session refresh, local logout, authenticated redirects, and API verification. Copy edits must not change their contracts.
- **Database schema:** all ten public models and the external `auth.users` reference, enums, relations, indexes, Decimal precision, SQL constraints/RLS, and externally managed Auth declarations. Do not add a persona enum/column. Do not migrate/push/reset/seed for positioning.
- **Transaction CRUD:** category/type compatibility, manual/mock source restrictions, filtering/search/pagination, owned reads/writes, allocated-amount protection, and nullable links retaining contribution history after deletion.
- **Goal CRUD/contributions:** future-date/amount checks, ACTIVE/PAUSED lifecycle rules, completion/archive protections, contribution/history ownership, source allocation checks, Serializable updates, and automatic completion at the target.
- **Existing tested financial calculations:** remaining/progress/monthly requirement and cent rounding; do not replace them with AI arithmetic or reinterpret scenario results as guarantees.
- **Analytics calculations:** Decimal totals, category aggregation, Dhaka period bounds, filled monthly trends, equal-length comparison, null comparison without a baseline, and saved snapshots.
- **Wellness calculations/history:** existing component weights/scores, bounds, goal-savings emergency proxy, empty-data rules, and score-only snapshots. Retain them as secondary, illustrative functionality.
- **Savings planning/simulation:** category reduction rounding, deficit handling, short-deadline/overdue feasibility checks, requested-saving cap, month-end completion dates, and supported projection limits. Surface existing fields without changing formulas.
- **Affordability calculations:** recent-data gate, all non-cancelled saved-goal reservations, buffer multiplication, selected ACTIVE monthly requirement, four verdict rules, and hypothetical balance. Any later decision-policy change needs separate review and meaningful tests.
- **AI persistence:** user/assistant/recommendation transaction, request-ID replay, changed-payload rejection, optimistic conversation guard, rollback, history isolation, and recommendation terminal transitions. Optional affordability explanation currently does not persist; preserve that unless separately scoped.
- **Provider configuration:** server-only keys, endpoint/model override validation, language/output contracts, diagnostic sanitization, quota/error handling, and deadlines/retries. Do not switch models for a positioning task.
- **Deployment configuration:** package scripts/lockfile, Supabase/Prisma configuration, Node runtime, hosting duration declarations, callback behavior, and environment variables. No push/deploy or remote configuration action is warranted in this audit.
- **Existing accessibility/responsiveness and navigation behaviors:** field labels, password visibility, reduced-motion handling, carousel pause/swipe, auth-aware CTAs, and error/empty/loading/retry behavior.
- **The user's pre-existing `e2e/application.spec.ts` change:** preserve exactly; do not reset or overwrite it to make Git appear clean.

## 11. Risk Analysis

| Change category | Proposed items | Practical risk and boundary |
| --- | --- | --- |
| Content-only | Customer/problem wording, README/report/metadata, honest evidence labeling, explanatory/disclaimer text | Lowest technical risk. Main risk is promising validated benefits, live-wallet services, broad AI numeracy, or safety guarantees. Review every phrase against actual implementation. |
| Frontend-only | Existing section/link emphasis, promotional captions/order, exposed calculation fields, clearer reserve labels, language defaults, focused coach links | Low–medium. Risks are stale results, null/overdue confusion, inaccessible/overflowing added values, broken anchors, or auth-aware navigation regressions. Do not derive a new financial verdict in the browser. |
| Backend-impacting | Optional P1-4 explanation fallback; optional P2-2 owned plan explanation context | Medium. Requires response-contract/error tests, ownership/privacy review, and preserving transaction boundaries. Neither is essential to the initial repositioning. |
| Database-impacting | **None required or recommended for P0/P1 repositioning** | New roles, wallet accounts, decision histories, or reserve models would materially enlarge scope and migration risk. Keep them out of the focused release plan. |
| AI-impacting | Optional explanation error handling or plan-context integration | Medium. Context/prompt changes can alter provider costs, privacy, languages, response validity, and persistence. Existing deterministic outputs must remain authoritative. No live AI verification is authorized in this stage. |
| Research/evidence | Future interviews/tasks/follow-up and a manual evidence log | No implementation needed initially. Unrepresentative sampling, leading questions, or confusing synthetic demos with customer results would weaken the submission. |

Existing model limitations should be communicated rather than quietly “fixed” under a copy task. In particular, goal savings/recorded expense overlap, transfer-versus-income classification, sparse expense data, simultaneous future goal commitments, and illustrative emergency liquidity involve financial-policy choices. A stronger model may eventually require backend/calculation/database work, but it is not needed to demonstrate the current two outcomes honestly. Preserve current tested rules until such work is explicitly scoped.

No client-specific/upstream runtime, successful real authentication, live RLS deployment, actual wallet balance, or current Gemini quality was established by this local audit. The passed mocks support implementation regressions; they do not prove production behavior or customer benefit. Historical pass counts/service claims in other reports should remain historical.

## 12. Recommended Implementation Order

**This is a future staged plan. It is not authorization to implement, contact customers, call services, or deploy now.**

1. **Agree on the reviewed scope.** Keep Customer as the only persona; adopt the two decision outcomes and their limitations; preserve the current system. Treat the best customer group and MFS-specific benefit as hypotheses. Review this report before making changes.
2. **Start evidence planning separately.** Prepare neutral Customer interview/task prompts, consent, recruitment criteria, and the two task measures. Collect evidence only through an authorized research process. Track actual observations manually first; do not wait for a new research database.
3. **Apply P0 content changes once authorized.** Align Home, About, Features, How it works, README, submission report, metadata, auth explanatory copy, and footer. Clarify supplied promotions and distinguish goal plan from simulator. Keep layouts/features/assets and technical documentation intact.
4. **Expose existing decision results.** Show goal-plan duration/gaps/category savings and affordability cash-flow/monthly requirement context. Clarify data sufficiency, buffer assumptions, selected-goal semantics, and hypothetical balance. Use existing API values; no financial formula or DB change.
5. **Align entry points and supporting language behavior.** Promote existing Goals/Planning links from Dashboard/sidebar, add outcome-related coach links/prompts, and honor existing profile preference defaults. Keep language choice optional and AI secondary.
6. **Run focused regression checks.** Use meaningful synthetic calculation/UI cases and the existing unit suite. For an authorized implementation stage, run static checks/build and the relevant fixture-backed browser workflows, including null/overdue/deficit/insufficient-data/zero-expense states and public auth-aware links. Do not use live Gemini/database diagnostics as routine checks.
7. **Prepare the focused demo and evidence narrative.** Demonstrate both deterministic decisions first with clearly synthetic or consented recorded data. Explain conditional results and MFS limitations. Show optional language assistance only as supporting interpretation; use a clearly labeled static example if live AI is not authorized/available.
8. **Consider optional resilience/integration work separately.** Review P1-4/P2-2 only if they improve the validated workflow enough to justify backend/AI changes. Keep schema, CRUD, formulas, AI persistence, provider settings, and deployment configuration unchanged by default. Publishing/push/deploy would require separate authorization.

## 13. Final Recommendation

| Question | Recommendation |
| --- | --- |
| 1. Should we keep the current project and reposition it? | **Yes.** The two decision engines already exist. Repositioning and clearer result presentation provide the smallest useful path. |
| 2. Do we need major feature development? | **No for this focused prototype/demo.** Surface existing results, clarify the workflow, and collect genuine customer evidence. Major development would be needed for verified live-wallet decisions or stronger total-finance/reserve accounting, which are outside the current direction. |
| 3. Do we need backend/database changes? | **No for the essential repositioning.** No database change is justified. Optional AI-failure resilience/plan-explanation context could later require backend/AI changes, with unchanged financial formulas. |
| 4. Which pages need highest-priority changes? | Homepage including carousel/hero, About, Features, How it works, Goal Details/Savings Plan, and Planning/Affordability. README and the submission report are equally important judge-facing artifacts. Dashboard/navigation/shared captions and Coach framing follow. |
| 5. What should the approximate one-sentence problem statement focus on? | **“We are testing whether Upay customers need clearer ways to judge a savings goal's achievable saving pace and a planned purchase's affordability while protecting goal savings and an emergency buffer.”** This is a design hypothesis, not a validated customer finding. The prototype uses recorded data; optional English/Bangla/Banglish explanation supports understanding. |
| 6. What should the final demo primarily demonstrate? | A Customer turning recorded income/expenses into a goal requirement, spending-adjustment scenario, feasibility/gap and completion estimate; then comparing purchase amounts against saved goals and an emergency buffer, interpreting the verdict and its limits. Show optional multilingual explanation afterward. |

A useful demo sequence is: establish clearly labeled recorded/synthetic data → open one active savings goal → explain saved/remaining/required monthly amounts → compare spending-reduction scenarios and the conditional timeline → run a hypothetical alternative if useful → check a purchase without AI → show a contrasting `CAUTION`/`NOT_AFFORDABLE` case and an insufficient-data example → explain reserve assumptions → optionally show a language-assisted explanation. Keep full analytics, wellness history, profile, and chat administration available but outside the main judge narrative. Do not present generated explanation or a saved recommendation status as proof that the customer achieved independence.

The intended positioning approximately fits the code if it promises **help understanding plans and decisions**, identifies **Customer**, names **recorded-data limits**, and treats **multilingual AI as supporting assistance**. The customer-validation part of the judges' feedback remains open until real evidence is collected.

**Final safety check**

| Item | Audit-stage result |
| --- | --- |
| Code changes | **ZERO**; no application, test, configuration, or dependency edits. The existing E2E modification was preserved. |
| Database changes | **ZERO**; no DB connections, migrations, schema pushes, seeds, resets, SQL execution, or record writes. |
| Gemini calls | **ZERO live calls**; only existing mocks/injected synthetic transports executed locally. |
| External/application HTTP API calls | **ZERO live calls**; test handlers/clients used local mocks. |
| Deployment changes | **ZERO**; no server/build/deployment or remote configuration action. |
| Git push | **ZERO**; no commit, push, or staging. |
| Fabricated customer evidence | **ZERO**; all examples explicitly synthetic and validation gaps identified. |
| Written deliverable | This audit report only: `FINAL_ROUND_FEEDBACK_AUDIT.md`. SHA-256 comparison confirmed all 149 pre-existing tracked files match their audit baseline, including the user's modified E2E file. Test-run cache artifacts are not deliverables or code changes. |

[goal-detail]: <D:/Hackathon/app/(workspace)/goals/[id]/page.tsx:26>
[plan-route]: <D:/Hackathon/app/api/v1/goals/[id]/savings-plan/route.ts:11>
[sim-route]: <D:/Hackathon/app/api/v1/simulator/what-if/route.ts:9>
[goal-data]: <D:/Hackathon/lib/finance.ts:4>
[analytics-period]: <D:/Hackathon/lib/analytics.ts:25>
[analytics-rows]: <D:/Hackathon/lib/analytics.ts:69>
[savings-plan]: <D:/Hackathon/lib/savings-plan.ts:13>
[plan-validation]: <D:/Hackathon/lib/analytics-validation.ts:22>
[planning-types]: <D:/Hackathon/lib/frontend/types.ts:149>
[simulate]: <D:/Hackathon/lib/projections.ts:25>
[contributions]: <D:/Hackathon/app/api/v1/goals/[id]/contributions/route.ts:32>
[goal-plan-ui]: <D:/Hackathon/app/(workspace)/goals/[id]/page.tsx:34>
[finance-tests]: <D:/Hackathon/tests/finance.test.ts:23>
[plan-tests]: <D:/Hackathon/tests/phase3-calculations.test.ts:110>
[plan-route-tests]: <D:/Hackathon/tests/phase3-routes.test.ts:123>
[sim-tests]: <D:/Hackathon/tests/phase56-calculations.test.ts:34>
[affordability]: <D:/Hackathon/lib/projections.ts:89>
[afford-route]: <D:/Hackathon/app/api/v1/affordability/check/route.ts:13>
[afford-validation]: <D:/Hackathon/lib/phase56-validation.ts:5>
[gemini]: <D:/Hackathon/lib/gemini.ts:14>
[planning-ui]: <D:/Hackathon/app/(workspace)/planning/page.tsx:25>
[readme]: <D:/Hackathon/README.md:5>
[afford-tests]: <D:/Hackathon/tests/phase56-calculations.test.ts:104>
[afford-route-tests]: <D:/Hackathon/tests/phase56-routes.test.ts:363>
[home]: <D:/Hackathon/app/page.tsx:13>
[hero-assets]: <D:/Hackathon/components/hero-slider-assets.ts:8>
[home-copy]: <D:/Hackathon/app/page.tsx:14>
[about]: <D:/Hackathon/app/about/page.tsx:6>
[features]: <D:/Hackathon/app/features/page.tsx:7>
[workflow]: <D:/Hackathon/app/how-it-works/page.tsx:5>
[auth-copy]: <D:/Hackathon/components/auth-form.tsx:84>
[footer]: <D:/Hackathon/components/public-layout.tsx:19>
[final-cta]: <D:/Hackathon/components/public-page.tsx:10>
[metadata]: <D:/Hackathon/app/layout.tsx:8>
[page-title]: <D:/Hackathon/components/ui.tsx:29>
[shell]: <D:/Hackathon/components/app-shell.tsx:9>
[dashboard]: <D:/Hackathon/app/(workspace)/dashboard/page.tsx:14>
[analytics-ui]: <D:/Hackathon/app/(workspace)/analytics/page.tsx:15>
[coach-ui]: <D:/Hackathon/app/(workspace)/coach/page.tsx:42>
[project-report]: <D:/Hackathon/FINAL_PROJECT_REPORT.md:5>
[home-decisions]: <D:/Hackathon/app/page.tsx:20>
[security]: <D:/Hackathon/app/security/page.tsx:5>
[schema-users]: <D:/Hackathon/prisma/schema.prisma:53>
[schema-types]: <D:/Hackathon/prisma/schema.prisma:13>
[transactions-ui]: <D:/Hackathon/app/(workspace)/transactions/page.tsx:10>
[seed]: <D:/Hackathon/prisma/seed.ts:4>
[ui-money]: <D:/Hackathon/components/ui.tsx:7>
[validation]: <D:/Hackathon/lib/validation.ts:24>
[transaction-category]: <D:/Hackathon/lib/transactions.ts:4>
[gemini-prompt]: <D:/Hackathon/lib/gemini.ts:57>
[language-check]: <D:/Hackathon/lib/coach-language.ts:6>
[coach-context]: <D:/Hackathon/lib/coach-context.ts:15>
[coach-route]: <D:/Hackathon/app/api/v1/coach/conversations/[id]/messages/route.ts:31>
[recommendations]: <D:/Hackathon/components/recommendations.tsx:7>
[gemini-client]: <D:/Hackathon/lib/gemini-client.ts:5>
[coach-retry]: <D:/Hackathon/lib/coach-retry.ts:10>
[language-tests]: <D:/Hackathon/tests/coach-language.test.ts:5>
[gemini-tests]: <D:/Hackathon/tests/gemini.test.ts:23>
[transport-tests]: <D:/Hackathon/tests/coach-transport.test.ts:9>
[coach-tests]: <D:/Hackathon/tests/phase56-routes.test.ts:99>
[diagnostics]: <D:/Hackathon/COACH_DIAGNOSTICS.md:1>
