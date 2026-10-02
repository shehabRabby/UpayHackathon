import { body, handle, success, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { simulationInput } from "@/lib/phase56-validation";
import { simulate } from "@/lib/projections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = handle(async (request: Request) => {
  const userId = await requireUser(request);
  const input = await body(request, simulationInput);
  const goal = input.goalId ? await prisma.savings_goals.findFirst({ where: { goal_id: input.goalId, user_id: userId } }) : null;
  if (input.goalId && !goal) throw new ApiError(404, "Savings goal not found");
  return success(simulate(input, goal), "Hypothetical savings calculated");
});
