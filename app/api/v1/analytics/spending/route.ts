import { Prisma } from "@prisma/client";
import { handle, success } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { spendingInput } from "@/lib/analytics-validation";
import { calculateSpending, period } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = handle(async (request: Request) => {
  const userId = await requireUser(request);
  const input = spendingInput.parse(Object.fromEntries(new URL(request.url).searchParams));
  const range = period(input);
  const data = await prisma.$transaction(tx => calculateSpending(tx, userId, range), {
    isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
  });
  return success(data, "Spending analytics calculated");
});
