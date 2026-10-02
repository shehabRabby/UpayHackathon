import { Prisma } from "@prisma/client";
import { ApiError, body, handle, resourceId, success, type IdContext } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contributionCreate, pagination } from "@/lib/validation";
import { goalData } from "@/lib/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async (request: Request, context: IdContext) => {
  const userId = await requireUser(request);
  const id = await resourceId(context);
  const query = pagination.strict().parse(Object.fromEntries(new URL(request.url).searchParams));
  const result = await prisma.$transaction(async tx => {
    if (!await tx.savings_goals.findFirst({ where: { goal_id: id, user_id: userId }, select: { goal_id: true } })) {
      throw new ApiError(404, "Savings goal not found");
    }
    const where = { goal_id: id, goal: { user_id: userId } };
    const contributions = await tx.goal_contributions.findMany({ where,
      orderBy: [{ contribution_date: "desc" }, { contribution_id: "desc" }],
      skip: (query.page - 1) * query.pageSize, take: query.pageSize });
    const total = await tx.goal_contributions.count({ where });
    return { contributions, total };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return success(result.contributions.map(item => ({
    contributionId: item.contribution_id, goalId: item.goal_id, transactionId: item.transaction_id,
    amount: item.amount.toNumber(), contributionDate: item.contribution_date.toISOString(),
  })), "Contributions retrieved", 200, { ...query, total: result.total, totalPages: Math.ceil(result.total / query.pageSize) });
});

export const POST = handle(async (request: Request, context: IdContext) => {
  const userId = await requireUser(request);
  const id = await resourceId(context);
  const input = await body(request, contributionCreate);
  const result = await prisma.$transaction(async tx => {
    const goal = await tx.savings_goals.findFirst({ where: { goal_id: id, user_id: userId } });
    if (!goal) throw new ApiError(404, "Savings goal not found");
    if (goal.status !== "ACTIVE") throw new ApiError(403, "Contributions require an active goal");
    const amount = new Prisma.Decimal(input.amount);
    const current = goal.current_amount.plus(amount);
    if (current.gt(goal.target_amount)) throw new ApiError(400, "Contribution exceeds the remaining goal amount");
    if (input.transactionId) {
      const transaction = await tx.transactions.findFirst({ where: { transaction_id: input.transactionId, user_id: userId } });
      if (!transaction) throw new ApiError(404, "Source transaction not found");
      const allocated = await tx.goal_contributions.aggregate({ where: { transaction_id: input.transactionId }, _sum: { amount: true } });
      if ((allocated._sum.amount ?? new Prisma.Decimal(0)).plus(amount).gt(transaction.amount)) {
        throw new ApiError(400, "Contributions exceed the source transaction amount");
      }
    }
    const contribution = await tx.goal_contributions.create({ data: {
      goal_id: id, transaction_id: input.transactionId ?? null, amount,
      contribution_date: input.contributionDate ? new Date(input.contributionDate) : new Date(),
    } });
    const updatedGoal = await tx.savings_goals.update({ where: { goal_id: id, user_id: userId }, data: {
      current_amount: current, status: current.eq(goal.target_amount) ? "COMPLETED" : "ACTIVE",
    } });
    return { contribution, goal: updatedGoal };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return success({ contribution: {
    contributionId: result.contribution.contribution_id, goalId: id,
    transactionId: result.contribution.transaction_id, amount: result.contribution.amount.toNumber(),
    contributionDate: result.contribution.contribution_date.toISOString(),
  }, goal: goalData(result.goal) }, "Contribution added", 201);
});
