import { Prisma } from "@prisma/client";
import { ApiError, body, handle, resourceId, success, type IdContext } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transactionPatch } from "@/lib/validation";
import { categorySelect, transactionData } from "@/lib/finance";
import { validateCategory } from "@/lib/transactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async (request: Request, context: IdContext) => {
  const userId = await requireUser(request);
  const id = await resourceId(context);
  const transaction = await prisma.transactions.findFirst({ where: { transaction_id: id, user_id: userId },
    include: { category: { select: categorySelect } } });
  if (!transaction) throw new ApiError(404, "Transaction not found");
  return success(transactionData(transaction), "Transaction retrieved");
});

export const PATCH = handle(async (request: Request, context: IdContext) => {
  const userId = await requireUser(request);
  const id = await resourceId(context);
  const input = await body(request, transactionPatch);
  const transaction = await prisma.$transaction(async tx => {
    const existing = await tx.transactions.findFirst({ where: { transaction_id: id, user_id: userId } });
    if (!existing) throw new ApiError(404, "Transaction not found");
    if (!["mock", "manual"].includes(existing.source)) throw new ApiError(403, "Only synthetic transactions can be changed");
    const categoryId = input.categoryId ?? existing.category_id;
    const type = input.transactionType ?? existing.transaction_type;
    await validateCategory(tx, categoryId, type);
    if (input.amount !== undefined) {
      const allocated = await tx.goal_contributions.aggregate({ where: { transaction_id: id }, _sum: { amount: true } });
      if ((allocated._sum.amount ?? new Prisma.Decimal(0)).gt(input.amount)) {
        throw new ApiError(400, "Amount cannot be less than existing goal contributions");
      }
    }
    return tx.transactions.update({ where: { transaction_id: id, user_id: userId }, data: {
      category_id: categoryId, transaction_type: type,
      ...(input.amount !== undefined ? { amount: new Prisma.Decimal(input.amount) } : {}),
      ...(input.merchantName !== undefined ? { merchant_name: input.merchantName } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.transactionDate ? { transaction_date: input.transactionDate } : {}),
    }, include: { category: { select: categorySelect } } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return success(transactionData(transaction), "Transaction updated");
});

export const DELETE = handle(async (request: Request, context: IdContext) => {
  const userId = await requireUser(request);
  const id = await resourceId(context);
  await prisma.$transaction(async tx => {
    const transaction = await tx.transactions.findFirst({ where: { transaction_id: id, user_id: userId } });
    if (!transaction) throw new ApiError(404, "Transaction not found");
    if (!["mock", "manual"].includes(transaction.source)) throw new ApiError(403, "Only synthetic transactions can be deleted");
    await tx.transactions.delete({ where: { transaction_id: id, user_id: userId } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return success({ transactionId: id }, "Transaction deleted; contribution history retained");
});
