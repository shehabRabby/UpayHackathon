import { Prisma } from "@prisma/client";
import { ApiError, body, handle, resourceId, success, type IdContext } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { savingsPlanInput } from "@/lib/analytics-validation";
import { rollingPeriod, spendingRows } from "@/lib/analytics";
import { savingsPlan } from "@/lib/savings-plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = handle(async (request: Request, context: IdContext) => {
  const userId = await requireUser(request);
  const id = await resourceId(context);
  const input = await body(request, savingsPlanInput);
  const data = await prisma.$transaction(async tx => {
    const goal = await tx.savings_goals.findFirst({ where: { goal_id: id, user_id: userId } });
    if (!goal) throw new ApiError(404, "Savings goal not found");
    if (goal.status !== "ACTIVE") throw new ApiError(403, "Savings plans require an active goal");
    const range = rollingPeriod(input.lookbackMonths);
    const rows = await spendingRows(tx, userId, range);
    return savingsPlan(goal, rows, range, input.spendingReductionPercent);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return success(data, "Personalized savings plan calculated");
});
