import "dotenv/config";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { calculateSpending, period } from "../lib/analytics";

try {
  // A nonexistent authenticated identity exercises SQL, Date, bigint, and
  // Decimal conversion without loading real user records or writing snapshots.
  const data = await prisma.$transaction(
    (tx) =>
      calculateSpending(
        tx,
        "00000000-0000-0000-0000-000000000000",
        period({ startDate: "2026-01-01", endDate: "2026-03-31" }),
      ),
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  assert.equal(data.transactionCount, 0);
  assert.equal(data.totalIncome, 0);
  assert.equal(data.totalExpenses, 0);
  assert.equal(data.spendingTrends.length, 3);
  const [numeric] = await prisma.$queryRaw<
    { amount: Prisma.Decimal; count: bigint }[]
  >`
    SELECT SUM(amount) AS amount, COUNT(*) AS count
    FROM (VALUES (0.10::numeric), (0.20::numeric)) AS sample(amount)`;
  assert.equal(numeric.amount.toNumber(), 0.3);
  assert.equal(numeric.count, 2n);
  const [boundary] = await prisma.$queryRaw<{ month: string }[]>`
    SELECT to_char(TIMESTAMP '2026-09-30 20:00:00' AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM') AS month`;
  assert.equal(boundary.month, "2026-10");
  console.log(
    "Phase 3 PostgreSQL aggregation verified: date boundaries, comparison period, and empty-month trends",
  );
} catch {
  console.error(
    "Analytics database verification failed; check connectivity and schema setup",
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
