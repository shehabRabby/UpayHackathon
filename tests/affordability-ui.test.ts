import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Affordability, Goal, Simulation } from "@/lib/frontend/types";
import { date, money } from "@/components/ui";

const state = vi.hoisted(() => ({
  assessment: null as Affordability | null,
  simulation: null as Simulation | null,
  goals: [] as Goal[],
  stateCalls: 0,
  actionCalls: 0,
  busy: false,
  error: "",
  goalsLoading: false,
  goalsError: "",
  request: vi.fn(),
}));

// Provide synthetic returned assessments through the page's two result states.
// Auth, requests, resource loading and AI remain mocked throughout these tests.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useState: () => [state.stateCalls++ === 0 ? state.simulation : state.assessment, vi.fn()] };
});
vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: ReactNode; href: string }) => createElement("a", props, children),
}));
vi.mock("@/components/auth-provider", () => ({ useAuth: () => ({ request: state.request }) }));
vi.mock("@/lib/frontend/hooks", () => ({
  useAction: () => {
    const affordabilityAction = state.actionCalls++ === 1;
    return { busy: affordabilityAction && state.busy, error: affordabilityAction ? state.error : "", success: "", clear: vi.fn(), run: vi.fn() };
  },
  useResource: () => ({ data: state.goals, loading: state.goalsLoading, error: state.goalsError, reload: vi.fn() }),
}));

import PlanningPage from "@/app/(workspace)/planning/page";

const assessment: Affordability = {
  purchaseAmount: 5000,
  canAfford: true,
  decision: "AFFORDABLE",
  recordedCashFlowBalance: 20000,
  reservedGoalSavings: 3000,
  emergencyBuffer: 12000,
  availableForPurchase: 5000,
  balanceAfterPurchase: 15000,
  averageMonthlyIncome: 4500,
  averageMonthlyExpenses: 4000,
  monthlyNetCashFlow: 500,
  selectedGoalMonthlyRequirement: 400,
  period: { startDate: "2026-01-01", endDate: "2026-03-31", days: 90, timeZone: "Asia/Dhaka" },
  assumptions: { emergencyBufferMonths: 3 },
  limitations: ["Goal balances are treated as earmarked funds; they may overlap with expenses already recorded."],
  explanation: null,
};
const goal: Goal = {
  goalId: "synthetic-goal", goalName: "Recorded goal", targetAmount: 10000,
  currentAmount: 3000, remainingAmount: 7000, targetDate: "2026-12-31",
  requiredMonthlySaving: 400, status: "ACTIVE", progressPercentage: 30,
  isOverdue: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-04-01T00:00:00Z",
};

function render() {
  state.stateCalls = 0;
  state.actionCalls = 0;
  return renderToStaticMarkup(createElement(PlanningPage));
}
const result = (html: string) => html.slice(html.indexOf('aria-label="Affordability result"'));
function metricValue(html: string, label: string) {
  const value = new RegExp(`<p>${label}</p>[\\s\\S]*?<strong[^>]*>([\\s\\S]*?)</strong>`).exec(html)?.[1];
  expect(value, `Visible metric: ${label}`).toBeDefined();
  return value!.replace(/<[^>]*>/g, "");
}
function contextValue(html: string, label: string) {
  const value = new RegExp(`<dt>${label}</dt><dd[^>]*>([\\s\\S]*?)</dd>`).exec(html)?.[1];
  expect(value, `Visible context: ${label}`).toBeDefined();
  return value!.replace(/<[^>]*>/g, "");
}

beforeEach(() => {
  state.assessment = { ...assessment };
  state.simulation = null;
  state.goals = [{ ...goal }];
  state.busy = false;
  state.error = "";
  state.goalsLoading = false;
  state.goalsError = "";
  state.request.mockClear();
});

describe("Planning purchase-affordability presentation", () => {
  it.each([
    ["AFFORDABLE", "fits within the calculated available amount"],
    ["CAUTION", "does not pass every affordability check"],
    ["NOT_AFFORDABLE", "exceeds the recorded cash-flow balance"],
    ["INSUFFICIENT_DATA", "not enough recent recorded income or activity"],
  ] as const)("explains the returned %s verdict without substituting a browser verdict", (decision, explanation) => {
    // The inconsistent flag/amounts deliberately ensure the returned decision wins.
    state.assessment = { ...assessment, decision, canAfford: false, purchaseAmount: 999999, availableForPurchase: 1 };
    const html = result(render());
    expect(html).toContain(`<h4>${decision.replaceAll("_", " ")}</h4>`);
    expect(html).toContain(explanation);
    expect(state.request).not.toHaveBeenCalled();
  });

  it("puts all four returned decision figures before the secondary financial context", () => {
    state.assessment = { ...assessment, purchaseAmount: 617.53, availableForPurchase: 139.21, reservedGoalSavings: 283.12, emergencyBuffer: 367.92 };
    const html = result(render());
    const summary = html.slice(0, html.indexOf('id="affordability-reserves"'));
    for (const [label, value] of [["Available for purchase", 139.21], ["Planned purchase", 617.53], ["Reserved goal savings", 283.12], ["Emergency buffer", 367.92]] as const) {
      expect(metricValue(summary, label)).toBe(money(value));
    }
    expect(html.indexOf("Affordability decision summary")).toBeLessThan(html.indexOf("Available for purchase"));
    expect(html.indexOf("Emergency buffer")).toBeLessThan(html.indexOf("Financial context behind the decision"));
  });

  it("uses backend values for the reserve breakdown and all secondary context", () => {
    // Independent sentinels catch any client arithmetic or use of the goal snapshot.
    state.assessment = { ...assessment, recordedCashFlowBalance: 927.13, reservedGoalSavings: 115.12, emergencyBuffer: 210.53, availableForPurchase: 441.81, averageMonthlyIncome: 73.52, averageMonthlyExpenses: 81.92, monthlyNetCashFlow: -11.57, selectedGoalMonthlyRequirement: 39.21 };
    const html = result(render());
    for (const [label, value] of [
      ["Recorded cash-flow balance", 927.13], ["Less reserved goal savings", 115.12],
      ["Less estimated emergency buffer", 210.53], ["Available for purchase", 441.81],
      ["Recent average monthly income", 73.52], ["Recent average monthly expenses", 81.92],
      ["Recent monthly net cash flow", -11.57], ["Selected goal monthly requirement", 39.21],
    ] as const) expect(contextValue(html, label)).toBe(money(value));
    expect(html).toContain("minimum of BDT 0");
    expect(html).toContain(date(assessment.period.startDate));
    expect(html).toContain(date(assessment.period.endDate));
    expect(html).toContain("90 days · Asia/Dhaka");
    expect(html).toContain("30-day month");
  });

  it("clarifies automatic reserves and the optional ACTIVE goal pace without changing options", () => {
    state.goals = (["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"] as const).map(status => ({ ...goal, goalId: status, status }));
    const html = render();
    expect(html).not.toContain("Protect a selected goal");
    expect(html).toContain("Check an active goal’s monthly saving pace (optional)");
    expect(html).toContain('aria-describedby="affordability-goal-help"');
    expect(html).toContain("Saved amounts across all non-cancelled goals are already reserved.");
    expect(html).toContain("Paused, completed or cancelled selections add no monthly requirement.");
    for (const status of ["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]) expect(html).toContain(`Recorded goal (${status})</option>`);
    expect(contextValue(result(html), "Selected goal monthly requirement")).toBe(money(400));
  });

  it.each(["no selection", "PAUSED", "COMPLETED", "CANCELLED", "funded ACTIVE"])("explains a zero returned requirement for %s without dropping reserves", (selection) => {
    state.goals = selection === "no selection" ? [] : [{ ...goal, status: selection === "funded ACTIVE" ? "ACTIVE" : selection as Goal["status"] }];
    state.assessment = { ...assessment, selectedGoalMonthlyRequirement: 0 };
    const html = result(render());
    expect(contextValue(html, "Selected goal monthly requirement")).toBe("No additional monthly requirement");
    expect(html).toContain("selected active goal requires no further monthly saving");
    expect(metricValue(html, "Reserved goal savings")).toBe(money(assessment.reservedGoalSavings));
    expect(html).not.toMatch(/NaN|Infinity/);
  });

  it("retains an AFFORDABLE result at the returned available-amount boundary", () => {
    const html = result(render());
    expect(metricValue(html, "Planned purchase")).toBe(money(5000));
    expect(metricValue(html, "Available for purchase")).toBe(money(5000));
    expect(html).toContain("<h4>AFFORDABLE</h4>");
  });

  it.each([
    { purchaseAmount: 7000, selectedGoalMonthlyRequirement: 400, monthlyNetCashFlow: 500 },
    { purchaseAmount: 5000, selectedGoalMonthlyRequirement: 750, monthlyNetCashFlow: 500 },
    { purchaseAmount: 5000, selectedGoalMonthlyRequirement: 0, monthlyNetCashFlow: -50 },
  ])("keeps CAUTION understandable for reserve or monthly-pace constraints: %j", (context) => {
    state.assessment = { ...assessment, ...context, decision: "CAUTION", canAfford: false };
    const html = result(render());
    expect(html).toContain("<h4>CAUTION</h4>");
    expect(html).toContain("amount available after goal reserves and the buffer");
    expect(html).toContain("recent net cash flow must be at least zero");
  });

  it("labels a negative hypothetical balance without presenting it as remaining spendable funds", () => {
    state.assessment = { ...assessment, decision: "NOT_AFFORDABLE", canAfford: false, purchaseAmount: 25000, balanceAfterPurchase: -5000 };
    const html = result(render());
    expect(html).toContain("<h4>NOT AFFORDABLE</h4>");
    expect(html).toContain("Recorded cash flow after purchase");
    expect(html).toContain(`<strong>${money(-5000)}</strong>`);
    expect(html).toContain("recorded balance minus the purchase amount");
    expect(html).toContain("those reserves are not deducted from this figure");
    expect(html).not.toContain(">Balance after purchase<");
  });

  it("shows the selected zero-month buffer from the response rather than the form default", () => {
    state.assessment = { ...assessment, emergencyBuffer: 0, assumptions: { emergencyBufferMonths: 0 } };
    const html = result(render());
    expect(metricValue(html, "Emergency buffer")).toBe(money(0));
    expect(html).toContain("your selected 0 months");
    expect(html).toContain("No emergency-buffer months were selected");
    expect(html).not.toContain("your selected 3 months");
    expect(html).toContain("not a verified emergency account, money moved aside, or a guarantee");
  });

  it("discloses a zero expense-based buffer and keeps returned insufficient-data notes", () => {
    state.assessment = { ...assessment, decision: "INSUFFICIENT_DATA", canAfford: false, averageMonthlyIncome: 0, averageMonthlyExpenses: 0, monthlyNetCashFlow: 0, emergencyBuffer: 0, limitations: ["Insufficient recent recorded income; affordability cannot be established."] };
    const html = result(render());
    expect(html).toContain("Recorded average monthly expenses are zero, so the estimated buffer is zero.");
    expect(html).toContain("Missing expense records can understate what you need.");
    expect(html).toContain(state.assessment.limitations[0]);
    expect(html).toContain("Unrecorded obligations may be missing");
    expect(html).toContain("not a live Upay wallet balance");
    expect(html).not.toMatch(/NaN|Infinity/);
  });

  it("leaves AI off and makes a returned explanation secondary to the unchanged verdict", () => {
    let html = render();
    const checkbox = html.match(/<input[^>]*name="explain"[^>]*>/)?.[0];
    expect(checkbox).toContain('type="checkbox"');
    expect(checkbox).not.toContain("checked");
    expect(html).not.toContain("Optional AI explanation</h4>");
    state.assessment = { ...assessment, explanation: "Synthetic optional explanation" };
    html = result(render());
    expect(html.indexOf("Optional AI explanation")).toBeGreaterThan(html.indexOf("Recorded cash flow after purchase"));
    expect(html).toContain("Synthetic optional explanation");
    expect(html).toContain("calculated verdict above remains authoritative");
    expect(state.request).not.toHaveBeenCalled();
  });

  it("does not fabricate missing returned period or buffer-month assumptions", () => {
    const incomplete: Partial<Affordability> = { ...assessment };
    delete incomplete.period;
    delete incomplete.assumptions;
    state.assessment = incomplete as Affordability;
    const html = result(render());
    expect(html).toContain("Lookback dates were not provided");
    expect(html).toContain("selected buffer months were not provided");
    expect(html).not.toMatch(/NaN|Invalid Date/);
  });

  it("preserves initial, loading and AI error states without manufacturing a fallback result", () => {
    state.assessment = null;
    expect(render()).not.toContain('aria-label="Affordability result"');
    state.busy = true;
    let html = render();
    expect(html).toContain("Assessing…");
    expect(html).toMatch(/<fieldset disabled="">/);
    expect(html).toContain("An AI explanation can take up to a minute");
    state.busy = false;
    state.error = "Synthetic AI provider unavailable";
    html = render();
    expect(html).toContain('<p class="notice error" role="alert">Synthetic AI provider unavailable</p>');
    expect(html).not.toContain('aria-label="Affordability result"');
    state.goalsLoading = true;
    expect(render()).toContain("Loading your data…");
    state.goalsLoading = false;
    state.goalsError = "Synthetic goal loading error";
    expect(render()).toContain("Synthetic goal loading error");
    expect(render()).toContain("Retry");
  });

  it("keeps the independent Savings Simulator result and inputs intact", () => {
    state.assessment = null;
    state.simulation = { projectedMonthlySaving: 100, requestedMonthlySaving: 150, monthlyNetCashFlow: 100, monthlyDeficit: 0, projectedSavings: 1200, horizonMonths: 12, goalId: null, remainingAmount: null, monthsToGoal: null, projectedGoalDate: null, limitations: ["Synthetic simulator limitation"] };
    const html = render();
    expect(html).toContain("What-if savings simulator");
    expect(html).toContain("Scenario goal (optional)");
    for (const name of ["monthlyIncome", "monthlyExpenses", "monthlySaving", "horizonMonths"]) expect(html).toContain(`name="${name}"`);
    expect(html).toContain('aria-label="Simulation result"');
    expect(metricValue(html, "Projected monthly saving")).toBe(money(100));
    expect(metricValue(html, "Savings over 12 months")).toBe(money(1200));
    expect(html).toContain("Synthetic simulator limitation");
  });
});
