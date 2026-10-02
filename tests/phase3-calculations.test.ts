import { describe, expect, it } from "vitest";
import { Prisma, type savings_goals } from "@prisma/client";
import { period, previousPeriod, spendingSummary, type SpendingRow } from "@/lib/analytics";
import { financialHealth } from "@/lib/financial-health";
import { savingsPlan } from "@/lib/savings-plan";
import { healthQuery, healthRefreshInput, savingsPlanInput } from "@/lib/analytics-validation";

const d = (value: number | string) => new Prisma.Decimal(value);
const range = period({ startDate: "2026-01-01", endDate: "2026-03-31" });
function row(amount: string, type = "expense", month = "2026-01", category = "food"): SpendingRow {
  return { month, categoryId: category, categoryName: category, categoryType: type, amount: d(amount), transactionCount: 1n };
}
const goal: savings_goals = { goal_id: "00000000-0000-4000-8000-000000000001", user_id: "00000000-0000-4000-8000-000000000002",
  goal_name: "Emergency fund", target_amount: d(1000), current_amount: d(100), target_date: new Date("2026-06-30"),
  status: "ACTIVE", created_at: new Date("2026-01-01"), updated_at: new Date("2026-01-01") };

describe("Spending aggregation and periods", () => {
  it("uses inclusive Bangladesh dates and an adjacent equal-length comparison window", () => {
    const oneDay = period({ startDate: "2026-01-01", endDate: "2026-01-01" });
    expect(oneDay.start.toISOString()).toBe("2025-12-31T18:00:00.000Z");
    expect(oneDay.endExclusive.toISOString()).toBe("2026-01-01T18:00:00.000Z");
    expect(previousPeriod(oneDay)).toMatchObject({ startDate: "2025-12-31", endDate: "2025-12-31", days: 1 });
  });
  it("handles leap dates and rejects reversed or excessive ranges", () => {
    expect(period({ startDate: "2024-02-28", endDate: "2024-03-01" }).days).toBe(3);
    expect(() => period({ startDate: "2026-02-01", endDate: "2026-01-01" })).toThrow();
    expect(() => period({ startDate: "2020-01-01", endDate: "2026-01-01" })).toThrow();
  });
  it("sums decimals by category, fills empty trend months, and calculates comparison percentages", () => {
    const data = spendingSummary([row("0.10"), row("0.20", "expense", "2026-03"), row("1.00", "income")], [row("0.20")], range);
    expect(data).toMatchObject({ totalIncome: 1, totalExpenses: 0.3, netCashFlow: 0.7, transactionCount: 3 });
    expect(data.categorySpending).toEqual([{ categoryId: "food", categoryName: "food", totalSpent: 0.3, transactionCount: 2, percentage: 100 }]);
    expect(data.spendingTrends[1]).toEqual({ month: "2026-02", totalIncome: 0, totalExpenses: 0, netCashFlow: 0, transactionCount: 0 });
    expect(data.comparison).toMatchObject({ incomeChangePercent: null, expenseChangePercent: 50 });
  });
  it("returns useful zero data and null comparison percentages without fabricated growth", () => {
    const data = spendingSummary([], [], range);
    expect(data.totalIncome).toBe(0);
    expect(data.categorySpending).toEqual([]);
    expect(data.spendingTrends).toHaveLength(3);
    expect(data.comparison.expenseChangePercent).toBeNull();
  });
});

describe("Savings plan arithmetic", () => {
  it("uses real net cash flow, gap, and per-category scenario budgets", () => {
    const plan = savingsPlan(goal, [row("3000", "income"), row("2700")], range, 10);
    expect(plan).toMatchObject({ remainingAmount: 900, requiredMonthlySaving: 300, averageMonthlyIncome: 1000,
      averageMonthlyExpenses: 900, availableMonthlySaving: 100, monthlySavingsGap: 200,
      potentialMonthlySaving: 90, projectedMonthlySaving: 190, remainingMonthlyGap: 110,
      feasibleByTargetDate: false, projectedMonthsToGoal: 5 });
    expect(plan.categoryBudgets[0]).toMatchObject({ suggestedMonthlyBudget: 810, potentialMonthlySaving: 90 });
  });
  it("does not treat expense cuts as savings until an existing deficit is covered", () => {
    const plan = savingsPlan(goal, [row("300", "income"), row("900")], range, 50);
    expect(plan.monthlyNetCashFlow).toBe(-200);
    expect(plan.projectedMonthlySaving).toBe(0);
    expect(plan.projectedMonthsToGoal).toBeNull();
  });
  it("does not claim an overdue goal is feasible even with a large surplus", () => {
    const plan = savingsPlan({ ...goal, target_date: new Date("2026-03-30") }, [row("90000", "income")], range, 10);
    expect(plan.isOverdue).toBe(true);
    expect(plan.feasibleByTargetDate).toBe(false);
  });
  it("does not claim a ten-day deadline is affordable from a full month's surplus", () => {
    const plan = savingsPlan({ ...goal, target_date: new Date("2026-04-10") }, [row("2700", "income")], range, 0);
    expect(plan.monthlySavingsGap).toBe(0);
    expect(plan.projectedMonthlySaving).toBe(900);
    expect(plan.feasibleByTargetDate).toBe(false);
  });
  it("handles no history and floor-rounds scenario reductions", () => {
    expect(savingsPlan(goal, [], range, 10)).toMatchObject({ projectedMonthlySaving: 0, feasibleByTargetDate: false });
    const plan = savingsPlan(goal, [row("0.33")], range, 10);
    expect(plan.categoryBudgets[0]).toMatchObject({ averageMonthlySpending: 0.11, potentialMonthlySaving: 0.01, suggestedMonthlyBudget: 0.1 });
  });
});

describe("Illustrative wellness formulas", () => {
  it("calculates the four components and equally weighted total", () => {
    const health = financialHealth([row("3000", "income"), row("2400")], [{ ...goal, current_amount: d(500) }], range);
    expect(health).toMatchObject({ savingsScore: 100, spendingScore: 60, goalScore: 50, emergencyScore: 20.83, healthScore: 57.71 });
    expect(health.assumptions.emergencyFundBasis).toBe("non_cancelled_goal_savings_proxy");
  });
  it("keeps all scores within 0..100 under overspending", () => {
    const health = financialHealth([row("100", "income"), row("10000")], [goal], range);
    expect(health.savingsScore).toBe(0);
    expect(health.spendingScore).toBe(0);
    for (const key of ["healthScore", "savingsScore", "spendingScore", "goalScore", "emergencyScore"] as const) {
      expect(health[key]).toBeGreaterThanOrEqual(0); expect(health[key]).toBeLessThanOrEqual(100);
    }
  });
  it("does not invent perfect scores or divide by zero with no data", () => {
    const health = financialHealth([], [], range);
    expect(health).toMatchObject({ healthScore: 0, savingsScore: 0, spendingScore: 0, goalScore: 0, emergencyScore: 0 });
    expect(health.metrics.estimatedEmergencyCoverageMonths).toBeNull();
    expect(health.metrics.savingsRatePercent).toBeNull();
  });
  it("excludes cancelled goals from both progress and savings proxy", () => {
    const health = financialHealth([row("3000", "income"), row("2400")], [{ ...goal, status: "CANCELLED" }], range);
    expect(health.goalScore).toBe(0); expect(health.emergencyScore).toBe(0);
    expect(health.metrics.totalGoalSavings).toBe(0);
  });
});

describe("Phase 3 validation", () => {
  it("rejects invalid scenario parameters and caller-selected user IDs", () => {
    for (const value of [{ lookbackMonths: 0 }, { lookbackMonths: 13 }, { spendingReductionPercent: 51 }, { userId: goal.user_id }]) {
      expect(savingsPlanInput.safeParse(value).success).toBe(false);
    }
    expect(healthRefreshInput.safeParse({ store: "false" }).success).toBe(false);
    expect(healthQuery.safeParse({ mode: "history", pageSize: "101" }).success).toBe(false);
    expect(healthQuery.parse({})).toEqual({ mode: "current", lookbackMonths: 3 });
  });
});
