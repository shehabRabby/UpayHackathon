import { Prisma, type financial_health, type savings_goals } from "@prisma/client";
import { decimal, moneyNumber, publicPeriod, totals, type Period, type SpendingRow } from "./analytics";

export const HEALTH_VERSION = "wellness-v1";
const score = (value: Prisma.Decimal) => Prisma.Decimal.min(100, Prisma.Decimal.max(0, value)).toDecimalPlaces(2);

export function financialHealth(rows: SpendingRow[], goals: savings_goals[], range: Period) {
  const values = totals(rows);
  const monthlyIncome = values.income.div(decimal(range.days).div(30));
  const monthlyExpenses = values.expenses.div(decimal(range.days).div(30));
  const net = monthlyIncome.minus(monthlyExpenses);
  const savingsRate = monthlyIncome.gt(0) ? net.div(monthlyIncome) : null;
  const savings = savingsRate ? score(savingsRate.div("0.2").mul(100)) : decimal();
  const spending = monthlyIncome.gt(0) ? score(decimal(2).minus(monthlyExpenses.div(monthlyIncome)).mul(50)) : decimal();
  const includedGoals = goals.filter(goal => goal.status !== "CANCELLED");
  const progress = includedGoals.length ? score(includedGoals.reduce((sum, goal) => sum.plus(
    goal.target_amount.gt(0) ? score(goal.current_amount.div(goal.target_amount).mul(100)) : decimal(),
  ), decimal()).div(includedGoals.length)) : decimal();
  const saved = includedGoals.reduce((sum, goal) => sum.plus(goal.current_amount), decimal());
  // Recorded goal savings are only a proxy; no emergency-fund designation or
  // liquid account balance exists in this schema.
  const coverageMonths = monthlyExpenses.gt(0) ? saved.div(monthlyExpenses) : null;
  const emergency = coverageMonths ? score(coverageMonths.div(3).mul(100)) : decimal();
  const health = score(savings.plus(spending).plus(progress).plus(emergency).div(4));
  return {
    healthScore: health.toNumber(), savingsScore: savings.toNumber(), spendingScore: spending.toNumber(),
    goalScore: progress.toNumber(), emergencyScore: emergency.toNumber(), assessmentDate: range.endDate,
    period: publicPeriod(range), calculationVersion: HEALTH_VERSION, scoreType: "illustrative_wellness",
    metrics: { averageMonthlyIncome: moneyNumber(monthlyIncome), averageMonthlyExpenses: moneyNumber(monthlyExpenses),
      monthlyNetCashFlow: moneyNumber(net), savingsRatePercent: savingsRate ? savingsRate.mul(100).toDecimalPlaces(2).toNumber() : null,
      totalGoalSavings: moneyNumber(saved), goalCount: includedGoals.length, transactionCount: values.count,
      estimatedEmergencyCoverageMonths: coverageMonths ? coverageMonths.toDecimalPlaces(2).toNumber() : null },
    assumptions: { averagingMonthDays: 30, targetSavingsRatePercent: 20, targetEmergencyMonths: 3,
      componentWeights: { savings: 0.25, spending: 0.25, goals: 0.25, emergency: 0.25 },
      emergencyFundBasis: "non_cancelled_goal_savings_proxy" },
    limitations: ["Illustrative wellness indicator, not a credit score or lending decision.",
      "Only recorded transactions and current goal balances are included; goal savings may not be liquid emergency funds.",
      ...(values.count === 0 ? ["No transaction data in the lookback period."] : []),
      ...(monthlyIncome.eq(0) ? ["Without recorded income, savings and spending components are set to zero."] : []),
      ...(monthlyExpenses.eq(0) ? ["Without recorded expenses, emergency coverage is unknown and its component is zero."] : []),
      ...(!includedGoals.length ? ["Without recorded goals, goal progress and emergency components are zero."] : [])],
  };
}

export function healthSnapshot(snapshot: financial_health) {
  return { healthId: snapshot.health_id, healthScore: snapshot.health_score.toNumber(), savingsScore: snapshot.savings_score.toNumber(),
    spendingScore: snapshot.spending_score.toNumber(), goalScore: snapshot.goal_score.toNumber(),
    emergencyScore: snapshot.emergency_score.toNumber(), assessmentDate: snapshot.assessment_date.toISOString().slice(0, 10),
    scoreType: "illustrative_wellness", calculationVersion: null };
}
