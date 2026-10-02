import { GoalStatus, Prisma } from "@prisma/client";
import { body, handle, success } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { goalCreate, goalQuery } from "@/lib/validation";
import { goalData } from "@/lib/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async (request: Request) => {
  const userId = await requireUser(request);
  const query = goalQuery.parse(Object.fromEntries(new URL(request.url).searchParams));
  const where = { user_id: userId, ...(query.status ? { status: query.status } : {}) };
  const [goals, total] = await prisma.$transaction([
    prisma.savings_goals.findMany({ where, orderBy: [{ created_at: "desc" }, { goal_id: "desc" }],
      skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    prisma.savings_goals.count({ where }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return success(goals.map(goal => goalData(goal)), "Savings goals retrieved", 200, {
    page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize),
  });
});

export const POST = handle(async (request: Request) => {
  const userId = await requireUser(request);
  const input = await body(request, goalCreate);
  const goal = await prisma.savings_goals.create({ data: {
    user_id: userId, goal_name: input.goalName,
    target_amount: new Prisma.Decimal(input.targetAmount),
    current_amount: new Prisma.Decimal(input.currentAmount),
    target_date: new Date(input.targetDate),
    status: input.currentAmount === input.targetAmount ? GoalStatus.COMPLETED : GoalStatus.ACTIVE,
  } });
  return success(goalData(goal), "Savings goal created", 201);
});
