import { Prisma } from "@prisma/client";
import { ApiError, body, handle, resourceId, success, type IdContext } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recommendationPatch } from "@/lib/phase56-validation";
import { recommendationData } from "@/lib/coach-data";
import { recommendationTransitions } from "@/lib/recommendation-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const PATCH = handle(async (request: Request, context: IdContext) => {
  const userId = await requireUser(request), id = await resourceId(context);
  const input = await body(request, recommendationPatch);
  const item = await prisma.$transaction(async tx => {
    const current = await tx.recommendations.findFirst({ where: { recommendation_id: id, user_id: userId } });
    if (!current) throw new ApiError(404, "Recommendation not found");
    if (current.status === input.status) return current;
    if (!recommendationTransitions[current.status].includes(input.status))
      throw new ApiError(400, "Recommendation status transition is not allowed");
    const changed = await tx.recommendations.updateMany({
      where: { recommendation_id: id, user_id: userId, status: current.status },
      data: { status: input.status },
    });
    if (!changed.count) throw new ApiError(400, "Recommendation changed; refresh before trying another action");
    return { ...current, status: input.status };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return success(recommendationData(item), "Recommendation status updated");
});
