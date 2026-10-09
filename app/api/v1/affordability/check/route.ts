import { Prisma } from "@prisma/client";
import { ApiError, body, handle, success } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { affordabilityInput } from "@/lib/phase56-validation";
import { decimal, rollingPeriod, spendingRows } from "@/lib/analytics";
import { affordability } from "@/lib/projections";
import { generateCoaching, type CoachLanguage } from "@/lib/gemini";
import { requireAiAllowance } from "@/lib/ai-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const POST = handle(async (request: Request) => {
  const userId = await requireUser(request);
  const input = await body(request, affordabilityInput);
  const result = await prisma.$transaction(async tx => {
    const goal = input.goalId ? await tx.savings_goals.findFirst({ where: { goal_id: input.goalId, user_id: userId } }) : null;
    if (input.goalId && !goal) throw new ApiError(404, "Savings goal not found");
    const range = rollingPeriod(3), rows = await spendingRows(tx, userId, range);
    const aggregate = (type: string) => tx.transactions.aggregate({ where: { user_id: userId,
      category: { category_type: type }, transaction_date: { lt: range.endExclusive } }, _sum: { amount: true }, _count: true });
    const income = await aggregate("income"), expenses = await aggregate("expense");
    const goals = await tx.savings_goals.aggregate({ where: { user_id: userId, status: { not: "CANCELLED" } }, _sum: { current_amount: true } });
    const balance = (income._sum.amount ?? decimal()).minus(expenses._sum.amount ?? decimal());
    const data = affordability(input, rows, range, balance, income._count + expenses._count, goals._sum.current_amount ?? decimal(), goal);
    const profile = input.explain ? await tx.users.findUnique({ where: { user_id: userId }, select: { preferred_language: true } }) : null;
    const preferredLanguage: CoachLanguage = profile?.preferred_language === "en" ? "en" : "bn";
    return { data, preferredLanguage };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  let explanation: string | null = null;
  if (input.explain) {
    requireAiAllowance(userId);
    const answer = await generateCoaching({ message: "Explain this backend-calculated affordability assessment and its assumptions. Do not recalculate or change its decision.",
      language: input.language ?? result.preferredLanguage, context: { purpose: "affordability_explanation", assessment: result.data } });
    explanation = answer.message;
  }
  return success({ ...result.data, explanation }, "Purchase affordability calculated");
});
