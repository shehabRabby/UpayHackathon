import { describe, expect, it } from "vitest";
import { Prisma, type savings_goals } from "@prisma/client";
import { affordability, simulate } from "@/lib/projections";
import { period, type SpendingRow } from "@/lib/analytics";
import {
  affordabilityInput,
  messageInput,
  recommendationPatch,
  simulationInput,
} from "@/lib/phase56-validation";

const d = (value: number) => new Prisma.Decimal(value);
const goal: savings_goals = {
  goal_id: "00000000-0000-4000-8000-000000000001",
  user_id: "00000000-0000-4000-8000-000000000002",
  goal_name: "Laptop",
  target_amount: d(1000),
  current_amount: d(100),
  target_date: new Date("2027-01-01"),
  status: "ACTIVE",
  created_at: new Date("2026-01-01"),
  updated_at: new Date("2026-01-01"),
};
const range = period({ startDate: "2026-01-01", endDate: "2026-03-31" });
const row = (value: number, type: string): SpendingRow => ({
  month: "2026-01",
  categoryId: "category",
  categoryName: "Category",
  categoryType: type,
  amount: d(value),
  transactionCount: 1n,
});

describe("Deterministic simulator", () => {
  it("matches the contract and caps requested saving by cash flow", () => {
    const output = simulate(
      {
        monthlyIncome: 1000,
        monthlyExpenses: 900,
        monthlySaving: 200,
        horizonMonths: 12,
      },
      goal,
      "2026-01-31",
    );
    expect(output).toMatchObject({
      projectedMonthlySaving: 100,
      projectedSavings: 1200,
      monthsToGoal: 9,
      projectedGoalDate: "2026-10-31",
    });
    expect(goal.current_amount.toNumber()).toBe(100);
  });
  it("clamps end-of-month completion dates", () => {
    expect(
      simulate(
        {
          monthlyIncome: 1000,
          monthlyExpenses: 0,
          monthlySaving: 900,
          horizonMonths: 1,
        },
        goal,
        "2026-01-31",
      ).projectedGoalDate,
    ).toBe("2026-02-28");
  });
  it("handles deficit, zero saving, funded goals, and missing goal", () => {
    const input = {
      monthlyIncome: 100,
      monthlyExpenses: 200,
      monthlySaving: 50,
      horizonMonths: 12,
    };
    expect(simulate(input, goal)).toMatchObject({
      projectedMonthlySaving: 0,
      monthlyDeficit: 100,
      projectedGoalDate: null,
      monthsToGoal: null,
    });
    expect(
      simulate(input, { ...goal, current_amount: d(1000) }, "2026-01-01"),
    ).toMatchObject({ monthsToGoal: 0, projectedGoalDate: "2026-01-01" });
    expect(simulate(input, null)).toMatchObject({
      goalId: null,
      monthsToGoal: null,
    });
  });
  it("does not overflow JavaScript dates for enormous goal timelines", () => {
    const output = simulate(
      {
        monthlyIncome: 0.01,
        monthlyExpenses: 0,
        monthlySaving: 0.01,
        horizonMonths: 12,
      },
      { ...goal, target_amount: d(1e12) },
    );
    expect(output.projectedGoalDate).toBeNull();
    expect(output.monthsToGoal).toBeGreaterThan(1200);
  });
});

describe("Recorded purchase affordability", () => {
  it("reserves goals and an expense buffer before declaring affordability", () => {
    const output = affordability(
      { purchaseAmount: 100, emergencyBufferMonths: 3 },
      [row(3000, "income"), row(1500, "expense")],
      range,
      d(2500),
      2,
      d(100),
      null,
    );
    expect(output).toMatchObject({
      canAfford: true,
      decision: "AFFORDABLE",
      emergencyBuffer: 1500,
      availableForPurchase: 900,
      balanceAfterPurchase: 2400,
    });
  });
  it("distinguishes spending reserves from an actual cash-flow shortfall", () => {
    const rows = [row(3000, "income"), row(1500, "expense")];
    const args = [rows, range, d(2500), 2, d(100), null] as const;
    expect(
      affordability({ purchaseAmount: 2000, emergencyBufferMonths: 3 }, ...args)
        .decision,
    ).toBe("CAUTION");
    expect(
      affordability({ purchaseAmount: 3000, emergencyBufferMonths: 3 }, ...args)
        .decision,
    ).toBe("NOT_AFFORDABLE");
  });
  it("does not invent an affordable purchase when recent income is missing", () => {
    expect(
      affordability(
        { purchaseAmount: 10, emergencyBufferMonths: 0 },
        [],
        range,
        d(10000),
        1,
        d(0),
        null,
      ),
    ).toMatchObject({ canAfford: false, decision: "INSUFFICIENT_DATA" });
  });
});

describe("Phase 5/6 Zod contracts", () => {
  it("rejects ownership injection, excessive messages, negative money, and reset statuses", () => {
    expect(
      messageInput.safeParse({ message: "Hello", userId: goal.user_id })
        .success,
    ).toBe(false);
    expect(messageInput.safeParse({ message: "a".repeat(2001) }).success).toBe(
      false,
    );
    expect(
      simulationInput.safeParse({
        monthlyIncome: -1,
        monthlyExpenses: 0,
        monthlySaving: 0,
      }).success,
    ).toBe(false);
    expect(affordabilityInput.safeParse({ purchaseAmount: 0 }).success).toBe(
      false,
    );
    expect(recommendationPatch.safeParse({ status: "NEW" }).success).toBe(
      false,
    );
    expect(
      messageInput.safeParse({ message: "Ki korbo?", language: "banglish" })
        .success,
    ).toBe(true);
  });
});
