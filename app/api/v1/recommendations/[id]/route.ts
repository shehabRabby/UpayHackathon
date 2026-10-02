import { Prisma } from "@prisma/client";
import { ApiError, body, handle, resourceId, success, type IdContext } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recommendationPatch } from "@/lib/phase56-validation";
import { recommendationData } from "@/lib/coach-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const PATCH = handle(async (request: Request, context: IdContext) => {
  const userId = await requireUser(request), id = await resourceId(context);
  const input = await body(request, recommendationPatch);
  const item = await prisma.$transaction(async tx => {
    if (!await tx.recommendations.findFirst({ where: { recommendation_id: id, user_id: userId }, select: { recommendation_id: true } })) throw new ApiError(404, "Recommendation not found");
    return tx.recommendations.update({ where: { recommendation_id: id, user_id: userId }, data: { status: input.status } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return success(recommendationData(item), "Recommendation status updated");
});
