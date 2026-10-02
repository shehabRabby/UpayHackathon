import { Prisma } from "@prisma/client";
import { ApiError } from "./api";
import { today } from "./validation";

export const ANALYTICS_VERSION = "spending-v1";
export const DAY_MS = 86_400_000;
const DHAKA_OFFSET = 6 * 3_600_000;
export const decimal = (value: Prisma.Decimal.Value = 0) =>
  new Prisma.Decimal(value);
export const moneyNumber = (value: Prisma.Decimal) =>
  value.toDecimalPlaces(2).toNumber();

export type Period = {
  startDate: string;
  endDate: string;
  start: Date;
  endExclusive: Date;
  days: number;
};
export function shiftDate(date: string, days: number) {
  return new Date(new Date(date).getTime() + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}
export function period(
  input: { startDate?: string; endDate?: string },
  defaultDays = 90,
): Period {
  const endDate = input.endDate ?? today();
  const startDate = input.startDate ?? shiftDate(endDate, 1 - defaultDays);
  const days =
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / DAY_MS + 1;
  if (days < 1 || days > 366)
    throw new ApiError(400, "Date range must contain 1 to 366 inclusive days");
  return {
    startDate,
    endDate,
    days,
    start: new Date(new Date(startDate).getTime() - DHAKA_OFFSET),
    endExclusive: new Date(new Date(endDate).getTime() + DAY_MS - DHAKA_OFFSET),
  };
}
export function rollingPeriod(months: number) {
  return period({}, months * 30);
}
export function previousPeriod(current: Period) {
  return period({
    startDate: shiftDate(current.startDate, -current.days),
    endDate: shiftDate(current.startDate, -1),
  });
}
export function publicPeriod(range: Period) {
  return {
    startDate: range.startDate,
    endDate: range.endDate,
    days: range.days,
    timeZone: "Asia/Dhaka",
  };
}

export type SpendingRow = {
  month: string;
  categoryId: string;
  categoryName: string;
  categoryType: string;
  amount: Prisma.Decimal;
  transactionCount: bigint;
};
export async function spendingRows(
  tx: Prisma.TransactionClient,
  userId: string,
  range: Period,
) {
  // Parameterized SQL aggregates in PostgreSQL; no transaction descriptions,
  // merchant names, other users' data, or complete histories are loaded.
  return tx.$queryRaw<SpendingRow[]>`
    SELECT to_char(t.transaction_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM') AS month,
           c.category_id AS "categoryId", c.category_name AS "categoryName",
           c.category_type AS "categoryType", SUM(t.amount) AS amount,
           COUNT(*) AS "transactionCount"
    FROM public.transactions t JOIN public.categories c ON c.category_id = t.category_id
    WHERE t.user_id = ${userId}::uuid AND t.transaction_date >= (${range.start}::timestamptz AT TIME ZONE 'UTC')
          AND t.transaction_date < (${range.endExclusive}::timestamptz AT TIME ZONE 'UTC')
          AND c.category_type IN ('income', 'expense')
    GROUP BY month, c.category_id, c.category_name, c.category_type
    ORDER BY month, c.category_id`;
}

export function totals(rows: SpendingRow[]) {
  let income = decimal(),
    expenses = decimal(),
    count = 0;
  for (const row of rows) {
    if (row.categoryType === "income") income = income.plus(row.amount);
    if (row.categoryType === "expense") expenses = expenses.plus(row.amount);
    count += Number(row.transactionCount);
  }
  return { income, expenses, net: income.minus(expenses), count };
}

export function categorySpending(rows: SpendingRow[]) {
  const categories = new Map<
    string,
    {
      categoryId: string;
      categoryName: string;
      amount: Prisma.Decimal;
      transactionCount: number;
    }
  >();
  for (const row of rows.filter((row) => row.categoryType === "expense")) {
    const category = categories.get(row.categoryId) ?? {
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      amount: decimal(),
      transactionCount: 0,
    };
    category.amount = category.amount.plus(row.amount);
    category.transactionCount += Number(row.transactionCount);
    categories.set(row.categoryId, category);
  }
  return [...categories.values()].sort(
    (a, b) =>
      b.amount.comparedTo(a.amount) || a.categoryId.localeCompare(b.categoryId),
  );
}

export function percentChange(
  current: Prisma.Decimal,
  previous: Prisma.Decimal,
) {
  return previous.eq(0)
    ? null
    : current
        .minus(previous)
        .div(previous)
        .mul(100)
        .toDecimalPlaces(2)
        .toNumber();
}
export function spendingSummary(
  rows: SpendingRow[],
  previousRows: SpendingRow[],
  range: Period,
) {
  const current = totals(rows),
    previous = totals(previousRows);
  const trends = [];
  const first = new Date(`${range.startDate.slice(0, 7)}-01`);
  const last = range.endDate.slice(0, 7);
  while (first.toISOString().slice(0, 7) <= last) {
    const month = first.toISOString().slice(0, 7);
    const values = totals(rows.filter((row) => row.month === month));
    trends.push({
      month,
      totalIncome: moneyNumber(values.income),
      totalExpenses: moneyNumber(values.expenses),
      netCashFlow: moneyNumber(values.net),
      transactionCount: values.count,
    });
    first.setUTCMonth(first.getUTCMonth() + 1);
  }
  return {
    period: publicPeriod(range),
    totalIncome: moneyNumber(current.income),
    totalExpenses: moneyNumber(current.expenses),
    netCashFlow: moneyNumber(current.net),
    transactionCount: current.count,
    categorySpending: categorySpending(rows).map((category) => ({
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      totalSpent: moneyNumber(category.amount),
      transactionCount: category.transactionCount,
      percentage: current.expenses.gt(0)
        ? category.amount
            .div(current.expenses)
            .mul(100)
            .toDecimalPlaces(2)
            .toNumber()
        : 0,
    })),
    spendingTrends: trends,
    comparison: {
      period: publicPeriod(previousPeriod(range)),
      totalIncome: moneyNumber(previous.income),
      totalExpenses: moneyNumber(previous.expenses),
      incomeChangePercent: percentChange(current.income, previous.income),
      expenseChangePercent: percentChange(current.expenses, previous.expenses),
    },
    calculationVersion: ANALYTICS_VERSION,
  };
}

export async function calculateSpending(
  tx: Prisma.TransactionClient,
  userId: string,
  range: Period,
) {
  const rows = await spendingRows(tx, userId, range);
  const previous = await spendingRows(tx, userId, previousPeriod(range));
  return spendingSummary(rows, previous, range);
}
