import { Prisma, type savings_goals } from "@prisma/client";
import { categorySpending, decimal, moneyNumber, publicPeriod, totals, type Period, type SpendingRow } from "./analytics";
import { goalData } from "./finance";

export function savingsPlan(goal: savings_goals, rows: SpendingRow[], range: Period, reductionPercent: number) {
  const summary = totals(rows);
  const monthsObserved = decimal(range.days).div(30);
  const monthlyIncome = summary.income.div(monthsObserved);
  const monthlyExpenses = summary.expenses.div(monthsObserved);
  const surplus = monthlyIncome.minus(monthlyExpenses);
  const details = goalData(goal, range.endDate);
  const required = decimal(details.requiredMonthlySaving);
  // Floor reductions to whole cents so the suggested budget never cuts more
  // than the validated scenario assumption. Sum budgets before computing totals.
  const budgets = categorySpending(rows).map(category => {
    const average = category.amount.div(monthsObserved).toDecimalPlaces(2);
    const reduction = average.mul(reductionPercent).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_FLOOR);
    return { categoryId: category.categoryId, categoryName: category.categoryName, averageMonthlySpending: moneyNumber(average),
      suggestedMonthlyBudget: moneyNumber(average.minus(reduction)), potentialMonthlySaving: moneyNumber(reduction) };
  });
  const potentialSaving = budgets.reduce((sum, item) => sum.plus(item.potentialMonthlySaving), decimal());
  const available = Prisma.Decimal.max(surplus, 0);
  const projectedSurplus = surplus.plus(potentialSaving);
  const projectedSaving = Prisma.Decimal.max(projectedSurplus, 0);
  const gap = Prisma.Decimal.max(required.minus(available), 0);
  const remainingGap = Prisma.Decimal.max(required.minus(projectedSaving), 0);
  const remaining = goal.target_amount.minus(goal.current_amount);
  const daysUntilTarget = Math.max(0, (goal.target_date.getTime() - new Date(range.endDate).getTime()) / 86_400_000);
  const feasible = !details.isOverdue && projectedSaving.gt(0) && remaining.lte(projectedSaving.mul(daysUntilTarget).div(30));
  const monthsToGoal = projectedSaving.gt(0) ? remaining.div(projectedSaving).ceil().toNumber() : null;
  const notes = [
    "This scenario allocates available monthly cash flow to this goal. Review essential expenses before reducing any category budget.",
    "Other goals, debts, fees, and unrecorded income or expenses are not included in this projection.",
    ...(summary.count === 0 ? ["No transactions were found; add transaction history before relying on the plan."] : []),
    ...(monthlyIncome.eq(0) ? ["No recorded income was found in the lookback period."] : []),
    ...(details.isOverdue ? ["The target date has passed; choose a new deadline before using the monthly target."] : []),
    ...(remainingGap.gt(0) ? ["The spending-reduction scenario does not fully cover the required monthly saving; consider a later deadline, a lower target, or additional income."] : []),
    ...(!feasible && remainingGap.eq(0) && !details.isOverdue ? ["The remaining deadline is shorter than the projected saving timeline; consider a later date or a higher contribution pace."] : []),
  ];
  return { ...details, period: publicPeriod(range), averageMonthlyIncome: moneyNumber(monthlyIncome),
    averageMonthlyExpenses: moneyNumber(monthlyExpenses), monthlyNetCashFlow: moneyNumber(surplus),
    availableMonthlySaving: moneyNumber(available), monthlySavingsGap: moneyNumber(gap),
    potentialMonthlySaving: moneyNumber(potentialSaving), projectedMonthlySaving: moneyNumber(projectedSaving),
    remainingMonthlyGap: moneyNumber(remainingGap), feasibleByTargetDate: feasible, projectedMonthsToGoal: monthsToGoal,
    categoryBudgets: budgets, notes,
    assumptions: { spendingReductionPercent: reductionPercent, averagingMonthDays: 30, feasibilityBasis: "surplus_prorated_over_remaining_days", source: "recorded_transactions", reservesForOtherGoals: false },
    calculationVersion: "savings-plan-v1", generatedBy: "backend" };
}
