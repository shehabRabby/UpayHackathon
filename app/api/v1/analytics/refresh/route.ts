import { Prisma } from "@prisma/client";
import { body, handle, success } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { spendingInput } from "@/lib/analytics-validation";
import { calculateSpending, period } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = handle(async (request: Request) => {
  const userId = await requireUser(request);
  const input = await body(request, spendingInput);
  const data = await prisma.$transaction(async tx => {
    const summary = await calculateSpending(tx, userId, period(input));
    const snapshot = await tx.financial_insights.create({ data: {
      user_id: userId, insight_type: "spending_summary", title: "Spending analytics refreshed",
      description: `Income ${summary.totalIncome.toFixed(2)} BDT; expenses ${summary.totalExpenses.toFixed(2)} BDT for ${summary.period.startDate} to ${summary.period.endDate}.`,
      metadata: summary as Prisma.InputJsonValue,
    }, select: { insight_id: true, created_at: true } });
    return { ...summary, insightId: snapshot.insight_id, refreshedAt: snapshot.created_at.toISOString() };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return success(data, "Spending analytics refreshed");
});
