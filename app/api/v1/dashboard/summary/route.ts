import { Prisma } from "@prisma/client";
import { handle, success } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categorySelect, goalData, transactionData } from "@/lib/finance";
import { today } from "@/lib/validation";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async (request: Request) => {
  const userId = await requireUser(request);
  z.strictObject({}).parse(Object.fromEntries(new URL(request.url).searchParams));
  const referenceDate = today();
  // Calendar month boundaries in Bangladesh (UTC+06:00).
  const [year, month] = referenceDate.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, month - 1, 1) - 6 * 3_600_000);
  const monthEnd = new Date(Date.UTC(year, month, 1) - 6 * 3_600_000);
  const financial = (type: "income" | "expense", monthly = false) => prisma.transactions.aggregate({
    where: { user_id: userId, category: { category_type: type },
      ...(monthly ? { transaction_date: { gte: monthStart, lt: monthEnd } } : {}) }, _sum: { amount: true },
  });
  const [income, expenses, monthlyIncome, monthlyExpenses, goals, savings, insights, recentTransactions] = await prisma.$transaction([
    financial("income"), financial("expense"), financial("income", true), financial("expense", true),
    prisma.savings_goals.findMany({ where: { user_id: userId, status: { in: ["ACTIVE", "PAUSED"] } },
      orderBy: [{ target_date: "asc" }, { goal_id: "asc" }], take: 20 }),
    prisma.savings_goals.aggregate({ where: { user_id: userId, status: { not: "CANCELLED" } }, _sum: { current_amount: true }, _count: true }),
    prisma.financial_insights.findMany({ where: { user_id: userId }, orderBy: [{ created_at: "desc" }, { insight_id: "desc" }], take: 5 }),
    prisma.transactions.findMany({ where: { user_id: userId }, include: { category: { select: categorySelect } },
      orderBy: [{ transaction_date: "desc" }, { transaction_id: "desc" }], take: 5 }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  const totalIncome = income._sum.amount ?? new Prisma.Decimal(0);
  const totalExpenses = expenses._sum.amount ?? new Prisma.Decimal(0);
  const monthIncome = monthlyIncome._sum.amount ?? new Prisma.Decimal(0);
  const monthExpenses = monthlyExpenses._sum.amount ?? new Prisma.Decimal(0);
  return success({
    balance: totalIncome.minus(totalExpenses).toNumber(),
    totalIncome: totalIncome.toNumber(), totalExpenses: totalExpenses.toNumber(),
    monthlyIncome: monthIncome.toNumber(), monthlyExpenses: monthExpenses.toNumber(),
    monthlyNetCashFlow: monthIncome.minus(monthExpenses).toNumber(),
    totalSaved: (savings._sum.current_amount ?? new Prisma.Decimal(0)).toNumber(),
    goalCount: savings._count, goals: goals.map(goal => goalData(goal, referenceDate)),
    latestInsights: insights.map(item => ({ insightId: item.insight_id, insightType: item.insight_type,
      title: item.title, description: item.description, metadata: item.metadata, createdAt: item.created_at.toISOString() })),
    recentTransactions: recentTransactions.map(transactionData),
  }, "Dashboard summary retrieved", 200, { month: referenceDate.slice(0, 7), timeZone: "Asia/Dhaka", balanceSource: "recorded_transactions" });
});
