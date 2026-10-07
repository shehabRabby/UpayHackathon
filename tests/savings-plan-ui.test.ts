import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Goal, SavingsPlan } from "@/lib/frontend/types";
import { date, money } from "@/components/ui";

const state = vi.hoisted(() => ({
  goal: null as Goal | null,
  plan: null as SavingsPlan | null,
  loading: false,
  error: "",
  busy: false,
}));

// Follow the project's static-render UI test pattern. Supply a returned plan
// through the page's state without invoking Auth, API, database or AI services.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: (initial: unknown) => [initial === null ? state.plan : initial, vi.fn()],
  };
});
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "synthetic-goal" }) }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: ReactNode; href: string }) => createElement("a", props, children),
}));
vi.mock("@/components/auth-provider", () => ({ useAuth: () => ({ request: vi.fn() }) }));
vi.mock("@/lib/frontend/hooks", () => ({
  useAction: () => ({ busy: state.busy, error: "", success: "", clear: vi.fn(), run: vi.fn() }),
  useResource: (path: string) => path.includes("/contributions")
    ? { data: [], loading: false, error: "", reload: vi.fn() }
    : { data: state.goal, loading: state.loading, error: state.error, reload: vi.fn() },
}));

import GoalDetail from "@/app/(workspace)/goals/[id]/page";

const goal: Goal = {
  goalId: "synthetic-goal",
  goalName: "Synthetic savings goal",
  targetAmount: 1000,
  currentAmount: 100,
  remainingAmount: 900,
  requiredMonthlySaving: 300,
  targetDate: "2026-06-30",
  status: "ACTIVE",
  progressPercentage: 10,
  isOverdue: false,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-04-01T00:00:00Z",
};
const plan: SavingsPlan = {
  ...goal,
  period: { startDate: "2026-01-01", endDate: "2026-03-31", days: 90, timeZone: "Asia/Dhaka" },
  averageMonthlyIncome: 1000,
  averageMonthlyExpenses: 900,
  monthlyNetCashFlow: 100,
  availableMonthlySaving: 100,
  monthlySavingsGap: 200,
  projectedMonthlySaving: 190,
  remainingMonthlyGap: 110,
  feasibleByTargetDate: false,
  projectedMonthsToGoal: 5,
  categoryBudgets: [{ categoryId: "synthetic-category", categoryName: "Recorded groceries", averageMonthlySpending: 900, suggestedMonthlyBudget: 810, potentialMonthlySaving: 90 }],
  assumptions: { spendingReductionPercent: 10, averagingMonthDays: 30 },
  notes: ["Other goals, debts, fees, and unrecorded income or expenses are not included in this projection."],
};

const render = () => renderToStaticMarkup(createElement(GoalDetail));
const summary = (html: string) => html.slice(html.indexOf('<h3 id="savings-plan-summary">'), html.indexOf('<h3 id="savings-plan-context">'));
function metricValue(html: string, label: string) {
  const value = new RegExp(`<p>${label}</p>[\\s\\S]*?<strong[^>]*>([\\s\\S]*?)</strong>`).exec(html)?.[1];
  expect(value, `Visible metric: ${label}`).toBeDefined();
  return value!.replace(/<[^>]*>/g, "");
}

beforeEach(() => {
  state.goal = { ...goal };
  state.plan = { ...plan };
  state.loading = false;
  state.error = "";
  state.busy = false;
});

describe("Goal Details recorded-data Savings Plan presentation", () => {
  it("surfaces the returned decision values without using the earlier goal snapshot or recalculating a verdict", () => {
    // Deliberately independent sentinels verify presentation, not arithmetic.
    state.plan = { ...plan, remainingAmount: 731.25, requiredMonthlySaving: 281.91, availableMonthlySaving: 44.13, monthlySavingsGap: 237.78, projectedMonthlySaving: 88.57, remainingMonthlyGap: 193.34, projectedMonthsToGoal: 9, feasibleByTargetDate: true };
    const html = summary(render());
    for (const [label, value] of [
      ["Remaining goal amount", 731.25], ["Required monthly saving", 281.91],
      ["Available monthly saving", 44.13], ["Original monthly gap", 237.78],
      ["Projected monthly saving", 88.57], ["Remaining monthly gap", 193.34],
    ] as const) expect(metricValue(html, label)).toBe(money(value));
    expect(metricValue(html, "Estimated saving time")).toBe("9 months");
    expect(metricValue(html, "Feasible by target date")).toBe("Yes");
    expect(html).toContain("Additional monthly saving or spending reductions are still needed.");
  });

  it("keeps a zero monthly gap separate from a returned infeasible deadline", () => {
    state.plan = { ...plan, remainingMonthlyGap: 0, feasibleByTargetDate: false, projectedMonthsToGoal: 1 };
    const html = summary(render());
    expect(metricValue(html, "Remaining monthly gap")).toBe(money(0));
    expect(metricValue(html, "Feasible by target date")).toBe("No");
    expect(metricValue(html, "Estimated saving time")).toBe("1 month");
    expect(html).toContain("Deadline feasibility is assessed separately.");
    expect(html).not.toContain("On track");
  });

  it("renders a feasible scenario while retaining estimate and simulator boundaries", () => {
    state.plan = { ...plan, projectedMonthlySaving: 400, remainingMonthlyGap: 0, feasibleByTargetDate: true, projectedMonthsToGoal: 3 };
    const html = render();
    expect(metricValue(summary(html), "Feasible by target date")).toBe("Yes");
    expect(html).toContain("not a guaranteed completion date");
    expect(html).toContain("What-if Simulator");
    expect(html).toContain("does not move money or guarantee future savings");
    expect(html).toContain("may omit unrecorded obligations");
    expect(html).toContain(plan.notes[0]);
  });

  it("shows the returned context and selected reduction assumption rather than the form defaults", () => {
    state.plan = { ...plan, period: { ...plan.period, days: 30, startDate: "2026-03-02" }, monthlyNetCashFlow: -200, assumptions: { spendingReductionPercent: 17.5, averagingMonthDays: 30 } };
    const html = render();
    expect(html).toContain(date("2026-03-02"));
    expect(html).toContain(date(plan.period.endDate));
    expect(html).toContain("30 days · Asia/Dhaka");
    expect(html).toContain(money(plan.averageMonthlyIncome));
    expect(html).toContain(money(plan.averageMonthlyExpenses));
    expect(html).toContain(money(-200));
    expect(html).toContain("17.5%");
    expect(html).toContain("Averaging month length");
    expect(html).toContain("may omit unrecorded obligations");
  });

  it.each([0, -200])("handles monthly net cash flow %s with no positive projected saving", (monthlyNetCashFlow) => {
    state.plan = { ...plan, monthlyNetCashFlow, availableMonthlySaving: 0, projectedMonthlySaving: 0, remainingMonthlyGap: 300, feasibleByTargetDate: false, projectedMonthsToGoal: null };
    const html = render();
    expect(metricValue(summary(html), "Estimated saving time")).toBe("Not estimable");
    expect(html).toContain("No positive projected monthly saving in this scenario.");
    expect(metricValue(summary(html), "Projected monthly saving")).toBe(money(0));
    expect(html).not.toMatch(/NaN|Infinity|null months/);
  });

  it("labels an overdue target without hiding a returned duration or deriving a new date", () => {
    state.plan = { ...plan, isOverdue: true, targetDate: "2026-03-30", feasibleByTargetDate: false, projectedMonthsToGoal: 5 };
    const html = render();
    expect(html).toContain("The target date has passed.");
    expect(html).toContain("Overdue");
    expect(metricValue(summary(html), "Estimated saving time")).toBe("5 months");
    expect(metricValue(summary(html), "Feasible by target date")).toBe("No");
    expect(html).toContain("not achievement of the expired deadline");
  });

  it("retains no-history and no-income notes, and gives empty categories a visible state", () => {
    state.plan = { ...plan, averageMonthlyIncome: 0, averageMonthlyExpenses: 0, monthlyNetCashFlow: 0, availableMonthlySaving: 0, projectedMonthlySaving: 0, monthlySavingsGap: 300, remainingMonthlyGap: 300, projectedMonthsToGoal: null, categoryBudgets: [], notes: ["No transactions were found; add transaction history before relying on the plan.", "No recorded income was found in the lookback period."] };
    const html = render();
    for (const note of state.plan.notes) expect(html).toContain(note);
    expect(html).toContain("No recorded expense categories were returned for this lookback.");
    expect(html).not.toContain("<table>");
    expect(html).not.toMatch(/NaN|Infinity/);
  });

  it("shows each category's returned spending, budget and potential saving with accessible headers", () => {
    state.plan = { ...plan, categoryBudgets: [{ categoryId: "synthetic", categoryName: "Recorded groceries", averageMonthlySpending: 80.13, suggestedMonthlyBudget: 76.11, potentialMonthlySaving: 4.02 }] };
    const html = render();
    expect(html).toContain('<th scope="col">Potential monthly saving</th>');
    expect(html).toContain('<th scope="row">Recorded groceries</th>');
    for (const amount of [80.13, 76.11, 4.02]) expect(html).toContain(`<td>${money(amount)}</td>`);
    expect(html).toContain("Review essential expenses");
  });

  it("does not fabricate financial context when an incomplete response omits it", () => {
    const incomplete: Partial<SavingsPlan> = { ...plan };
    delete incomplete.period;
    delete incomplete.assumptions;
    delete incomplete.availableMonthlySaving;
    delete incomplete.monthlyNetCashFlow;
    state.plan = incomplete as SavingsPlan;
    const html = render();
    expect(metricValue(summary(html), "Available monthly saving")).toBe("Not provided");
    expect(html).toContain("Lookback dates were not provided in this response.");
    expect(html).toContain("Calculation assumptions were not provided in this response.");
    expect(html).not.toMatch(/NaN|Invalid Date/);
  });

  it("preserves a returned zero-month funded scenario without replacing its feasibility flag", () => {
    state.plan = { ...plan, remainingAmount: 0, requiredMonthlySaving: 0, projectedMonthsToGoal: 0, feasibleByTargetDate: false };
    const html = render();
    expect(html).toContain("Recorded goal savings already meet the target.");
    expect(metricValue(summary(html), "Estimated saving time")).toBe("0 months");
    expect(metricValue(summary(html), "Feasible by target date")).toBe("No");
  });

  it.each(["PAUSED", "COMPLETED", "CANCELLED"] as const)("keeps plan generation unavailable for a %s goal", (status) => {
    state.goal = { ...goal, status };
    state.plan = null;
    const html = render();
    const panel = html.slice(html.indexOf("<h2>Your savings plan</h2>"));
    expect(panel).toMatch(/<fieldset[^>]*disabled=""/);
    expect(panel).not.toContain("savings-plan-summary");
    if (status === "COMPLETED") expect(html).toContain("You reached your target. This goal is complete.");
  });

  it("preserves initial, loading and error presentation without a result", () => {
    state.plan = null;
    const initial = render();
    expect(initial).not.toContain("savings-plan-summary");
    expect(initial).toContain("Calculate savings plan");
    expect(initial).toContain('name="lookbackMonths"');
    expect(initial).toContain('name="spendingReductionPercent"');
    state.goal = null;
    state.loading = true;
    expect(render()).toContain("Loading your data…");
    state.loading = false;
    state.error = "Synthetic goal load failure";
    expect(render()).toContain("Synthetic goal load failure");
    expect(render()).toContain("Retry");
  });
});
