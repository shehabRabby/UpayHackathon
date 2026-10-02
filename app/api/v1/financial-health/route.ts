import { Prisma } from "@prisma/client";
import { handle, success } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { healthQuery } from "@/lib/analytics-validation";
import { rollingPeriod, spendingRows } from "@/lib/analytics";
import { financialHealth, healthSnapshot } from "@/lib/financial-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = handle(async (request: Request) => {
  const userId = await requireUser(request);
  const input = healthQuery.parse(Object.fromEntries(new URL(request.url).searchParams));
  if (input.mode === "history") {
    const where: Prisma.financial_healthWhereInput = { user_id: userId,
      ...(input.startDate || input.endDate ? { assessment_date: {
        ...(input.startDate ? { gte: new Date(input.startDate) } : {}),
        ...(input.endDate ? { lte: new Date(input.endDate) } : {}),
      } } : {}) };
    const [snapshots, total] = await prisma.$transaction([
      prisma.financial_health.findMany({ where, orderBy: [{ assessment_date: "desc" }, { health_id: "desc" }],
        skip: (input.page - 1) * input.pageSize, take: input.pageSize }),
      prisma.financial_health.count({ where }),
    ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return success(snapshots.map(healthSnapshot), "Financial wellness history retrieved", 200, {
      page: input.page, pageSize: input.pageSize, total, totalPages: Math.ceil(total / input.pageSize),
      mode: "history", note: "The existing health table stores scores and assessment dates; original inputs and formula versions are not recorded.",
    });
  }
  const data = await prisma.$transaction(async tx => {
    const range = rollingPeriod(input.lookbackMonths);
    const rows = await spendingRows(tx, userId, range);
    const goals = await tx.savings_goals.findMany({ where: { user_id: userId, status: { not: "CANCELLED" } } });
    return financialHealth(rows, goals, range);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return success({ ...data, stored: false }, "Current illustrative financial wellness calculated");
});
