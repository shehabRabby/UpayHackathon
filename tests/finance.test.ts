import { describe, expect, it } from "vitest";
import { Prisma, type savings_goals } from "@prisma/client";
import { goalData } from "@/lib/finance";
import {
  goalCreate,
  money,
  transactionCreate,
  transactionQuery,
} from "@/lib/validation";

export const sampleGoal: savings_goals = {
  goal_id: "00000000-0000-4000-8000-000000000001",
  user_id: "00000000-0000-4000-8000-000000000002",
  goal_name: "Emergency fund",
  target_amount: new Prisma.Decimal("1000"),
  current_amount: new Prisma.Decimal("100"),
  target_date: new Date("2030-04-01"),
  status: "ACTIVE",
  created_at: new Date("2030-01-01"),
  updated_at: new Date("2030-01-01"),
};

describe("Savings contract and decimal calculations", () => {
  it("calculates the gap and monthly saving over three rounded-up months", () => {
    expect(goalData(sampleGoal, "2030-01-01")).toMatchObject({
      remainingAmount: 900,
      requiredMonthlySaving: 300,
      progressPercentage: 10,
    });
  });
  it("rounds required savings upwards to a cent", () => {
    const goal = {
      ...sampleGoal,
      target_amount: new Prisma.Decimal("1000.01"),
    };
    expect(goalData(goal, "2030-01-01").requiredMonthlySaving).toBe(300.01);
  });
  it("handles completed and overdue goals without dividing by zero", () => {
    expect(
      goalData(
        { ...sampleGoal, current_amount: new Prisma.Decimal(1000) },
        "2030-04-02",
      ).requiredMonthlySaving,
    ).toBe(0);
    expect(goalData(sampleGoal, "2030-04-02")).toMatchObject({
      requiredMonthlySaving: 900,
      isOverdue: true,
    });
  });
  it("rejects extra fractions of a cent and accepts normal cents", () => {
    expect(money.safeParse(0.29).success).toBe(true);
    for (const amount of [1.00001, 0.001, -1, Infinity, NaN])
      expect(money.safeParse(amount).success).toBe(false);
  });
  it("validates dates, ownership injection, and amounts", () => {
    const valid = {
      goalName: "Laptop",
      targetAmount: 1000,
      currentAmount: 0,
      targetDate: "2099-01-01",
    };
    expect(goalCreate.safeParse(valid).success).toBe(true);
    expect(
      goalCreate.safeParse({ ...valid, userId: sampleGoal.user_id }).success,
    ).toBe(false);
    expect(
      goalCreate.safeParse({ ...valid, targetDate: "2099-02-30" }).success,
    ).toBe(false);
    expect(
      goalCreate.safeParse({ ...valid, currentAmount: 1001 }).success,
    ).toBe(false);
    expect(
      goalCreate.safeParse({ ...valid, targetDate: "2020-01-01" }).success,
    ).toBe(false);
  });
});

describe("Transaction validation", () => {
  const valid = {
    categoryId: sampleGoal.goal_id,
    transactionType: "CASH_IN",
    amount: 100,
    transactionDate: "2030-01-01",
  };
  it("only accepts synthetic sources", () => {
    expect(transactionCreate.parse(valid).source).toBe("manual");
    expect(
      transactionCreate.safeParse({ ...valid, source: "upay_future" }).success,
    ).toBe(false);
  });
  it("rejects invalid ranges and abusive pagination", () => {
    expect(
      transactionQuery.safeParse({
        startDate: "2030-02-01",
        endDate: "2030-01-01",
      }).success,
    ).toBe(false);
    for (const page of ["0", "-1", "abc", "1.5"])
      expect(transactionQuery.safeParse({ page }).success).toBe(false);
    expect(transactionQuery.safeParse({ pageSize: "101" }).success).toBe(false);
    expect(transactionQuery.parse({ page: "2", pageSize: "10" })).toMatchObject(
      { page: 2, pageSize: 10 },
    );
  });
});
