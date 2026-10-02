import { Prisma } from "@prisma/client";
import { ApiError } from "./api";
import {
  categorySpending,
  decimal,
  moneyNumber,
  publicPeriod,
  rollingPeriod,
  spendingRows,
  totals,
} from "./analytics";
import { goalData } from "./finance";
import type { CoachLanguage } from "./gemini";

export async function minimizedContext(
  tx: Prisma.TransactionClient,
  userId: string,
  goalId?: string,
) {
  const range = rollingPeriod(3);
  const rows = await spendingRows(tx, userId, range);
  const sum = totals(rows);
  const profile = await tx.users.findUnique({
    where: { user_id: userId },
    select: { preferred_language: true },
  });
  const goal = goalId
    ? await tx.savings_goals.findFirst({
        where: { goal_id: goalId, user_id: userId },
      })
    : null;
  if (goalId && !goal) throw new ApiError(404, "Savings goal not found");
  const goals = await tx.savings_goals.aggregate({
    where: { user_id: userId, status: { not: "CANCELLED" } },
    _sum: { current_amount: true },
    _count: true,
  });
  const preferredLanguage: CoachLanguage =
    profile?.preferred_language === "en" ? "en" : "bn";
  const details = goal ? goalData(goal, range.endDate) : null;
  return {
    preferredLanguage,
    context: {
      currency: "BDT",
      period: publicPeriod(range),
      averagingMonthDays: 30,
      averageMonthlyIncome: moneyNumber(sum.income.div(3)),
      averageMonthlyExpenses: moneyNumber(sum.expenses.div(3)),
      monthlyNetCashFlow: moneyNumber(sum.net.div(3)),
      availableMonthlySaving: moneyNumber(
        Prisma.Decimal.max(sum.net.div(3), 0),
      ),
      transactionCount: sum.count,
      goalCount: goals._count,
      totalGoalSavings: moneyNumber(goals._sum.current_amount ?? decimal()),
      topSpendingCategories: categorySpending(rows)
        .slice(0, 5)
        .map((item) => ({
          category: item.categoryName.slice(0, 100),
          averageMonthlySpending: moneyNumber(item.amount.div(3)),
        })),
      selectedGoal: details
        ? {
            targetAmount: details.targetAmount,
            currentAmount: details.currentAmount,
            remainingAmount: details.remainingAmount,
            requiredMonthlySaving: details.requiredMonthlySaving,
            targetDate: details.targetDate,
            isOverdue: details.isOverdue,
            status: details.status,
          }
        : null,
      limitations: [
        "Recorded transactions only; no live Upay wallet connection.",
        "Goal savings do not establish liquid emergency reserves.",
      ],
    },
  };
}
