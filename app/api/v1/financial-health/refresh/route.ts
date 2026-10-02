import { Prisma } from "@prisma/client";
import { body, handle, success } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { healthRefreshInput } from "@/lib/analytics-validation";
import { rollingPeriod, spendingRows } from "@/lib/analytics";
import { financialHealth } from "@/lib/financial-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = handle(async (request: Request) => {
  const userId = await requireUser(request);
  const input = await body(request, healthRefreshInput);
  const data = await prisma.$transaction(async tx => {
    const range = rollingPeriod(input.lookbackMonths);
    const rows = await spendingRows(tx, userId, range);
    const goals = await tx.savings_goals.findMany({ where: { user_id: userId, status: { not: "CANCELLED" } } });
    const scores = financialHealth(rows, goals, range);
    if (!input.store) return { ...scores, stored: false, healthId: null };
    const snapshot = await tx.financial_health.create({ data: {
      user_id: userId, health_score: scores.healthScore, savings_score: scores.savingsScore,
      spending_score: scores.spendingScore, goal_score: scores.goalScore,
      emergency_score: scores.emergencyScore, assessment_date: new Date(scores.assessmentDate),
    }, select: { health_id: true } });
    return { ...scores, stored: true, healthId: snapshot.health_id };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return success(data, "Illustrative financial wellness refreshed", input.store ? 201 : 200);
});
