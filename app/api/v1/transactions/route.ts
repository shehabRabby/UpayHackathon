import { Prisma } from "@prisma/client";
import { body, handle, success } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transactionCreate, transactionQuery } from "@/lib/validation";
import { categorySelect, transactionData } from "@/lib/finance";
import { validateCategory } from "@/lib/transactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async (request: Request) => {
  const userId = await requireUser(request);
  const query = transactionQuery.parse(Object.fromEntries(new URL(request.url).searchParams));
  const date: Prisma.DateTimeFilter = {};
  if (query.startDate) date.gte = new Date(query.startDate);
  if (query.endDate) {
    if (query.endDate.length === 10) date.lt = new Date(new Date(query.endDate).getTime() + 86_400_000);
    else date.lte = new Date(query.endDate);
  }
  const where: Prisma.transactionsWhereInput = {
    user_id: userId,
    ...(query.type ? { transaction_type: query.type } : {}),
    ...(query.category ? { category_id: query.category } : {}),
    ...(query.startDate || query.endDate ? { transaction_date: date } : {}),
    ...(query.search ? { OR: [
      { merchant_name: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
      { category: { category_name: { contains: query.search, mode: "insensitive" } } },
    ] } : {}),
  };
  const [transactions, total] = await prisma.$transaction([
    prisma.transactions.findMany({ where, include: { category: { select: categorySelect } },
      orderBy: [{ transaction_date: "desc" }, { transaction_id: "desc" }],
      skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    prisma.transactions.count({ where }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return success(transactions.map(transactionData), "Transactions retrieved", 200, {
    page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize),
  });
});

export const POST = handle(async (request: Request) => {
  const userId = await requireUser(request);
  const input = await body(request, transactionCreate);
  const transaction = await prisma.$transaction(async tx => {
    await validateCategory(tx, input.categoryId, input.transactionType);
    return tx.transactions.create({ data: {
      user_id: userId, category_id: input.categoryId, transaction_type: input.transactionType,
      amount: new Prisma.Decimal(input.amount), merchant_name: input.merchantName ?? null,
      description: input.description ?? null, transaction_date: input.transactionDate, source: input.source,
    }, include: { category: { select: categorySelect } } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return success(transactionData(transaction), "Synthetic transaction created", 201);
});
