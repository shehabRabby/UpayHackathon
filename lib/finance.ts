import { Prisma, type savings_goals, type transactions } from "@prisma/client";
import { today } from "./validation";

export function goalData(goal: savings_goals, referenceDate = today()) {
  const remaining = Prisma.Decimal.max(
    goal.target_amount.minus(goal.current_amount),
    0,
  );
  const days = Math.max(
    0,
    (goal.target_date.getTime() - new Date(referenceDate).getTime()) /
      86_400_000,
  );
  const months = Math.max(1, Math.ceil(days / (365.25 / 12)));
  return {
    goalId: goal.goal_id,
    goalName: goal.goal_name,
    targetAmount: goal.target_amount.toNumber(),
    currentAmount: goal.current_amount.toNumber(),
    remainingAmount: remaining.toNumber(),
    targetDate: goal.target_date.toISOString().slice(0, 10),
    requiredMonthlySaving: remaining
      .div(months)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_CEIL)
      .toNumber(),
    status: goal.status,
    progressPercentage: Prisma.Decimal.min(
      goal.current_amount.div(goal.target_amount).mul(100),
      100,
    )
      .toDecimalPlaces(2)
      .toNumber(),
    isOverdue: remaining.gt(0) && days === 0,
    createdAt: goal.created_at.toISOString(),
    updatedAt: goal.updated_at.toISOString(),
  };
}

export function transactionData(
  transaction: transactions & {
    category?: { category_name: string; category_type: string };
  },
) {
  return {
    transactionId: transaction.transaction_id,
    categoryId: transaction.category_id,
    ...(transaction.category
      ? {
          categoryName: transaction.category.category_name,
          categoryType: transaction.category.category_type,
        }
      : {}),
    transactionType: transaction.transaction_type,
    amount: transaction.amount.toNumber(),
    merchantName: transaction.merchant_name,
    description: transaction.description,
    transactionDate: transaction.transaction_date.toISOString(),
    source: transaction.source,
    createdAt: transaction.created_at.toISOString(),
  };
}

export const categorySelect = { category_name: true, category_type: true };
