import { GoalStatus, Prisma } from "@prisma/client";
import { ApiError, body, handle, resourceId, success, type IdContext } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { goalPatch } from "@/lib/validation";
import { goalData } from "@/lib/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async (request: Request, context: IdContext) => {
  const userId = await requireUser(request);
  const id = await resourceId(context);
  const goal = await prisma.savings_goals.findFirst({ where: { goal_id: id, user_id: userId } });
  if (!goal) throw new ApiError(404, "Savings goal not found");
  return success(goalData(goal), "Savings goal retrieved");
});

export const PATCH = handle(async (request: Request, context: IdContext) => {
  const userId = await requireUser(request);
  const id = await resourceId(context);
  const input = await body(request, goalPatch);
  const result = await prisma.$transaction(async tx => {
    const goal = await tx.savings_goals.findFirst({ where: { goal_id: id, user_id: userId } });
    if (!goal) throw new ApiError(404, "Savings goal not found");
    if (goal.status !== "ACTIVE") throw new ApiError(403, "Only active savings goals can be updated");
    const target = new Prisma.Decimal(input.targetAmount ?? goal.target_amount);
    const current = new Prisma.Decimal(input.currentAmount ?? goal.current_amount);
    if (current.gt(target)) throw new ApiError(400, "Current amount cannot exceed target amount");
    if (input.status === "COMPLETED" && current.lt(target)) throw new ApiError(400, "Goal target has not been reached");
    if (input.currentAmount !== undefined && await tx.goal_contributions.count({ where: { goal_id: id } })) {
      throw new ApiError(400, "Use contributions to change the amount of a goal with contribution history");
    }
    return tx.savings_goals.update({ where: { goal_id: id, user_id: userId }, data: {
      ...(input.goalName !== undefined ? { goal_name: input.goalName } : {}),
      target_amount: target, current_amount: current,
      ...(input.targetDate ? { target_date: new Date(input.targetDate) } : {}),
      status: current.eq(target) ? GoalStatus.COMPLETED : input.status ?? goal.status,
    } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return success(goalData(result), "Savings goal updated");
});

export const DELETE = handle(async (request: Request, context: IdContext) => {
  const userId = await requireUser(request);
  const id = await resourceId(context);
  const goal = await prisma.$transaction(async tx => {
    const existing = await tx.savings_goals.findFirst({ where: { goal_id: id, user_id: userId } });
    if (!existing) throw new ApiError(404, "Savings goal not found");
    if (existing.status === "COMPLETED") throw new ApiError(403, "Completed savings goals cannot be archived");
    return tx.savings_goals.update({ where: { goal_id: id, user_id: userId }, data: { status: "CANCELLED" } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return success(goalData(goal), "Savings goal archived");
});
