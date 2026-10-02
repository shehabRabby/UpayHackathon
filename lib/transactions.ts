import { TransactionType, type Prisma } from "@prisma/client";
import { ApiError } from "./api";

export async function validateCategory(tx: Prisma.TransactionClient, categoryId: string, type: TransactionType) {
  const category = await tx.categories.findFirst({ where: { category_id: categoryId, is_active: true } });
  if (!category) throw new ApiError(400, "Select an active transaction category");
  const expected = type === TransactionType.CASH_IN ? "income" : "expense";
  if (category.category_type !== expected) throw new ApiError(400, "Category does not match the transaction type");
}
