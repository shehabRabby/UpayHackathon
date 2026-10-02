import { describe, expect, it } from "vitest";
import { goalCreate, positiveMoney, profileCreate, transactionCreate, transactionQuery } from "@/lib/validation";
import { spendingInput, savingsPlanInput } from "@/lib/analytics-validation";
import { affordabilityInput, simulationInput } from "@/lib/phase56-validation";

describe("deployment QA validation boundaries", () => {
  it.each([0, -1, 0.001, 1e12 + 1, Infinity, NaN])("rejects invalid positive money %s", amount => {
    expect(positiveMoney.safeParse(amount).success).toBe(false);
  });
  it("accepts cents and the documented upper limit", () => {
    expect(positiveMoney.safeParse(0.01).success).toBe(true);
    expect(positiveMoney.safeParse(1e12).success).toBe(true);
  });
  it("rejects whitespace goal/profile names and oversized text", () => {
    const goal = { goalName: "Valid", targetAmount: 100, currentAmount: 0, targetDate: "2099-01-01" };
    for (const goalName of ["   ", "a".repeat(201)]) expect(goalCreate.safeParse({ ...goal, goalName }).success).toBe(false);
    expect(profileCreate.safeParse({ fullName: "   ", preferredLanguage: "en" }).success).toBe(false);
  });
  it("rejects malformed IDs and reversed transaction ranges", () => {
    expect(transactionCreate.safeParse({ categoryId: "not-a-uuid", transactionType: "CASH_IN", amount: 100, transactionDate: "2026-01-01" }).success).toBe(false);
    expect(transactionQuery.safeParse({ startDate: "2026-02-01", endDate: "2026-01-01" }).success).toBe(false);
  });
  it("rejects reversed analytics dates and impossible calendar dates", () => {
    expect(spendingInput.safeParse({ startDate: "2020-02-01", endDate: "2020-01-01" }).success).toBe(false);
    expect(spendingInput.safeParse({ startDate: "2020-02-30" }).success).toBe(false);
  });
  it("rejects invalid lookbacks and percentages", () => {
    for (const lookbackMonths of [0, 13, 1.5]) expect(savingsPlanInput.safeParse({ lookbackMonths }).success).toBe(false);
    for (const spendingReductionPercent of [-1, 51]) expect(savingsPlanInput.safeParse({ spendingReductionPercent }).success).toBe(false);
  });
  it("rejects invalid horizons, buffers and negative simulator inputs", () => {
    const scenario = { monthlyIncome: 50000, monthlyExpenses: 5000, monthlySaving: 10000, horizonMonths: 12 };
    for (const horizonMonths of [0, 121, 1.5]) expect(simulationInput.safeParse({ ...scenario, horizonMonths }).success).toBe(false);
    expect(simulationInput.safeParse({ ...scenario, monthlyIncome: -50000 }).success).toBe(false);
    for (const emergencyBufferMonths of [-1, 13, 1.5]) expect(affordabilityInput.safeParse({ purchaseAmount: 100, emergencyBufferMonths }).success).toBe(false);
  });
});
