import { Prisma, type savings_goals } from "@prisma/client";
import {
  decimal,
  moneyNumber,
  publicPeriod,
  totals,
  type Period,
  type SpendingRow,
} from "./analytics";
import { goalData } from "./finance";
import { today } from "./validation";

function projectedDate(reference: string, months: number) {
  // Keep dates representable and projections meaningful (maximum 100 years).
  if (!Number.isSafeInteger(months) || months > 1200) return null;
  const [year, month, day] = reference.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export function simulate(
  input: {
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlySaving: number;
    horizonMonths: number;
  },
  goal: savings_goals | null,
  reference = today(),
) {
  const income = decimal(input.monthlyIncome),
    expenses = decimal(input.monthlyExpenses),
    requested = decimal(input.monthlySaving);
  const cashFlow = income.minus(expenses);
  const capacity = Prisma.Decimal.max(cashFlow, 0);
  const projected = Prisma.Decimal.min(requested, capacity);
  const remaining = goal
    ? Prisma.Decimal.max(goal.target_amount.minus(goal.current_amount), 0)
    : null;
  const months = remaining
    ? remaining.eq(0)
      ? 0
      : projected.gt(0)
        ? remaining.div(projected).ceil().toNumber()
        : null
    : null;
  const date = months === null ? null : projectedDate(reference, months);
  return {
    projectedMonthlySaving: moneyNumber(projected),
    requestedMonthlySaving: input.monthlySaving,
    monthlyNetCashFlow: moneyNumber(cashFlow),
    monthlyDeficit: moneyNumber(Prisma.Decimal.max(cashFlow.neg(), 0)),
    projectedSavings: moneyNumber(projected.mul(input.horizonMonths)),
    horizonMonths: input.horizonMonths,
    goalId: goal?.goal_id ?? null,
    remainingAmount: remaining ? moneyNumber(remaining) : null,
    monthsToGoal: months,
    projectedGoalDate: date,
    assumptions: {
      monthlyIncome: input.monthlyIncome,
      monthlyExpenses: input.monthlyExpenses,
      monthlySaving: input.monthlySaving,
      asOfDate: reference,
      contributionTiming: "end_of_month",
      savingCappedByNetCashFlow: true,
      maximumProjectionMonths: 1200,
      interestFeesAndInflationIncluded: false,
      otherGoalsIncluded: false,
    },
    limitations: [
      ...(requested.gt(capacity)
        ? ["Requested saving exceeds net cash flow and was capped."]
        : []),
      ...(remaining?.gt(0) && projected.eq(0)
        ? ["No saving capacity; a goal completion date cannot be projected."]
        : []),
      ...(months !== null && date === null
        ? ["Goal timeline exceeds the supported 100-year date projection."]
        : []),
    ],
    calculationVersion: "simulator-v1",
  };
}

export function affordability(
  input: { purchaseAmount: number; emergencyBufferMonths: number },
  rows: SpendingRow[],
  range: Period,
  balance: Prisma.Decimal,
  allTimeCount: number,
  saved: Prisma.Decimal,
  goal: savings_goals | null,
) {
  const sum = totals(rows),
    months = decimal(range.days).div(30);
  const monthlyExpenses = sum.expenses.div(months),
    net = sum.net.div(months);
  const buffer = monthlyExpenses.mul(input.emergencyBufferMonths);
  const available = Prisma.Decimal.max(balance.minus(saved).minus(buffer), 0);
  const purchase = decimal(input.purchaseAmount);
  const details = goal ? goalData(goal, range.endDate) : null;
  const goalRequirement =
    details && details.status === "ACTIVE"
      ? decimal(details.requiredMonthlySaving)
      : decimal();
  const enoughData = allTimeCount > 0 && sum.income.gt(0);
  const canAfford =
    enoughData && purchase.lte(available) && net.gte(goalRequirement);
  const decision = !enoughData
    ? "INSUFFICIENT_DATA"
    : canAfford
      ? "AFFORDABLE"
      : purchase.lte(Prisma.Decimal.max(balance, 0))
        ? "CAUTION"
        : "NOT_AFFORDABLE";
  return {
    purchaseAmount: input.purchaseAmount,
    canAfford,
    decision,
    recordedCashFlowBalance: moneyNumber(balance),
    reservedGoalSavings: moneyNumber(saved),
    emergencyBuffer: moneyNumber(buffer),
    availableForPurchase: moneyNumber(available),
    balanceAfterPurchase: moneyNumber(balance.minus(purchase)),
    averageMonthlyIncome: moneyNumber(sum.income.div(months)),
    averageMonthlyExpenses: moneyNumber(monthlyExpenses),
    monthlyNetCashFlow: moneyNumber(net),
    selectedGoalMonthlyRequirement: moneyNumber(goalRequirement),
    period: publicPeriod(range),
    assumptions: {
      currency: "BDT",
      emergencyBufferMonths: input.emergencyBufferMonths,
      source: "recorded_transactions",
      goalSavingsReserved: true,
      realWalletBalanceAvailable: false,
    },
    limitations: [
      "Illustrative cash-flow assessment, not a verified wallet balance or lending decision.",
      "Goal balances are treated as earmarked funds; they may overlap with expenses already recorded.",
      ...(enoughData
        ? []
        : [
            "Insufficient recent recorded income; affordability cannot be established.",
          ]),
      ...(details?.isOverdue ? ["Selected goal deadline is overdue."] : []),
    ],
    calculationVersion: "affordability-v1",
  };
}
