import { Prisma } from "@prisma/client";
import { handle, success } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recommendationQuery } from "@/lib/phase56-validation";
import { recommendationData } from "@/lib/coach-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = handle(async (request: Request) => {
  const userId = await requireUser(request);
  const input = recommendationQuery.parse(Object.fromEntries(new URL(request.url).searchParams));
  const where = { user_id: userId, ...(input.status ? { status: input.status } : {}), ...(input.priority ? { priority: input.priority } : {}) };
  const [items, total] = await prisma.$transaction([
    prisma.recommendations.findMany({ where, orderBy: [{ created_at: "desc" }, { recommendation_id: "desc" }], skip: (input.page - 1) * input.pageSize, take: input.pageSize }),
    prisma.recommendations.count({ where }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return success(items.map(recommendationData), "Recommendations retrieved", 200, { page: input.page, pageSize: input.pageSize, total, totalPages: Math.ceil(total / input.pageSize) });
});
