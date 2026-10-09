import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  db: {
    savings_goals: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
    transactions: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    categories: { findFirst: vi.fn() },
    goal_contributions: { aggregate: vi.fn(), create: vi.fn(), count: vi.fn() },
    financial_insights: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }));

import { POST as createGoal } from "@/app/api/v1/goals/route";
import {
  GET as getGoal,
  PATCH as patchGoal,
} from "@/app/api/v1/goals/[id]/route";
import {
  GET as listTransactions,
  POST as createTransaction,
} from "@/app/api/v1/transactions/route";
import { GET as getTransaction, PATCH as patchTransaction, DELETE as deleteTransaction } from "@/app/api/v1/transactions/[id]/route";
import { POST as contribute } from "@/app/api/v1/goals/[id]/contributions/route";
import { GET as dashboard } from "@/app/api/v1/dashboard/summary/route";

const userId = "00000000-0000-4000-8000-000000000002";
const id = "00000000-0000-4000-8000-000000000001";
const context = () => ({ params: Promise.resolve({ id }) });
const goal = {
  goal_id: id,
  user_id: userId,
  goal_name: "Laptop",
  target_amount: new Prisma.Decimal(1000),
  current_amount: new Prisma.Decimal(100),
  target_date: new Date("2099-01-01"),
  status: "ACTIVE",
  created_at: new Date(),
  updated_at: new Date(),
};
function request(path: string, value?: unknown, method = "POST") {
  return new Request(`http://localhost/api/v1/${path}`, {
    method: value === undefined ? "GET" : method,
    ...(value !== undefined
      ? {
          body: JSON.stringify(value),
          headers: { "Content-Type": "application/json" },
        }
      : {}),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireUser.mockResolvedValue(userId);
  mocks.db.$transaction.mockImplementation(async (operation: unknown) =>
    typeof operation === "function"
      ? operation(mocks.db)
      : Promise.all(operation as Promise<unknown>[]),
  );
});

describe("API envelopes, auth, validation, and isolation", () => {
  it("denies reading, changing or deleting another user's transaction without writes", async () => {
    mocks.db.transactions.findFirst.mockResolvedValue(null);
    const attempts = [
      () => getTransaction(request(`transactions/${id}`), context()),
      () => patchTransaction(request(`transactions/${id}`, { amount: 100 }, "PATCH"), context()),
      () => deleteTransaction(new Request(`http://localhost/api/v1/transactions/${id}`, { method: "DELETE" }), context()),
    ];
    for (const attempt of attempts) {
      const response = await attempt();
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ success: false, message: "Transaction not found", data: null });
      expect(mocks.db.transactions.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({ where: { transaction_id: id, user_id: userId } }));
    }
    expect(mocks.db.transactions.update).not.toHaveBeenCalled();
    expect(mocks.db.transactions.delete).not.toHaveBeenCalled();
    expect(mocks.db.categories.findFirst).not.toHaveBeenCalled();
  });
  it("returns 401 without database access", async () => {
    mocks.requireUser.mockRejectedValue(
      new ApiError(401, "Authentication required"),
    );
    const response = await createGoal(request("goals", {}));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      success: false,
      message: "Authentication required",
      data: null,
    });
    expect(mocks.db.savings_goals.create).not.toHaveBeenCalled();
  });
  it("returns 400 for malformed JSON", async () => {
    const response = await createGoal(
      new Request("http://localhost/api/v1/goals", {
        method: "POST",
        body: "{",
      }),
    );
    expect(response.status).toBe(400);
    expect(mocks.db.savings_goals.create).not.toHaveBeenCalled();
  });
  it("creates the contract with server-selected ownership", async () => {
    mocks.db.savings_goals.create.mockResolvedValue(goal);
    const response = await createGoal(
      request("goals", {
        goalName: "Laptop",
        targetAmount: 1000,
        currentAmount: 100,
        targetDate: "2099-01-01",
      }),
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      success: true,
      data: { goalId: id, remainingAmount: 900, status: "ACTIVE" },
    });
    expect(mocks.db.savings_goals.create.mock.calls[0][0].data.user_id).toBe(
      userId,
    );
  });
  it("returns 404 for another user's goal without revealing ownership", async () => {
    mocks.db.savings_goals.findFirst.mockResolvedValue(null);
    const response = await getGoal(request(`goals/${id}`), context());
    expect(response.status).toBe(404);
    expect(mocks.db.savings_goals.findFirst).toHaveBeenCalledWith({
      where: { goal_id: id, user_id: userId },
    });
  });
  it("prevents editing inactive goals", async () => {
    mocks.db.savings_goals.findFirst.mockResolvedValue({
      ...goal,
      status: "COMPLETED",
    });
    const response = await patchGoal(
      request(`goals/${id}`, { goalName: "Changed" }, "PATCH"),
      context(),
    );
    expect(response.status).toBe(403);
    expect(mocks.db.savings_goals.update).not.toHaveBeenCalled();
  });
  it("allows an owned paused goal to be resumed", async () => {
    mocks.db.savings_goals.findFirst.mockResolvedValue({
      ...goal,
      status: "PAUSED",
    });
    mocks.db.savings_goals.update.mockResolvedValue(goal);
    const response = await patchGoal(
      request(`goals/${id}`, { status: "ACTIVE" }, "PATCH"),
      context(),
    );
    expect(response.status).toBe(200);
    expect(mocks.db.savings_goals.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { goal_id: id, user_id: userId },
        data: expect.objectContaining({ status: "ACTIVE" }),
      }),
    );
  });
  it("applies every list filter and scopes pagination counts", async () => {
    mocks.db.transactions.findMany.mockResolvedValue([]);
    mocks.db.transactions.count.mockResolvedValue(12);
    const response = await listTransactions(
      request(
        `transactions?type=CASH_IN&category=${id}&startDate=2030-01-01&endDate=2030-01-31&search=salary&page=2&pageSize=10`,
      ),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: [],
      meta: { page: 2, pageSize: 10, total: 12, totalPages: 2 },
    });
    const args = mocks.db.transactions.findMany.mock.calls[0][0];
    expect(args).toMatchObject({
      where: {
        user_id: userId,
        category_id: id,
        transaction_type: "CASH_IN",
        OR: expect.any(Array),
        transaction_date: {
          gte: new Date("2030-01-01"),
          lt: new Date("2030-02-01"),
        },
      },
      skip: 10,
      take: 10,
    });
    expect(mocks.db.transactions.count).toHaveBeenCalledWith({
      where: args.where,
    });
  });
  it("rejects category mismatches before creating a transaction", async () => {
    mocks.db.categories.findFirst.mockResolvedValue({
      category_type: "expense",
    });
    const response = await createTransaction(
      request("transactions", {
        categoryId: id,
        transactionType: "CASH_IN",
        amount: 100,
        transactionDate: "2030-01-01",
      }),
    );
    expect(response.status).toBe(400);
    expect(mocks.db.transactions.create).not.toHaveBeenCalled();
  });
  it("prevents deleting future Upay imports", async () => {
    mocks.db.transactions.findFirst.mockResolvedValue({
      source: "upay_future",
    });
    const response = await deleteTransaction(
      request(`transactions/${id}`),
      context(),
    );
    expect(response.status).toBe(403);
    expect(mocks.db.transactions.delete).not.toHaveBeenCalled();
  });
  it("adds contributions and completes the goal atomically", async () => {
    mocks.db.savings_goals.findFirst.mockResolvedValue(goal);
    mocks.db.goal_contributions.create.mockResolvedValue({
      contribution_id: id,
      transaction_id: null,
      amount: new Prisma.Decimal(900),
      contribution_date: new Date(),
    });
    mocks.db.savings_goals.update.mockResolvedValue({
      ...goal,
      current_amount: new Prisma.Decimal(1000),
      status: "COMPLETED",
    });
    const response = await contribute(
      request(`goals/${id}/contributions`, { amount: 900 }),
      context(),
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      data: { goal: { status: "COMPLETED", remainingAmount: 0 } },
    });
    expect(mocks.db.$transaction.mock.calls[0][1]).toEqual({
      isolationLevel: "Serializable",
    });
  });
  it("rejects a source transaction owned by another user", async () => {
    mocks.db.savings_goals.findFirst.mockResolvedValue(goal);
    mocks.db.transactions.findFirst.mockResolvedValue(null);
    const response = await contribute(
      request(`goals/${id}/contributions`, { amount: 10, transactionId: id }),
      context(),
    );
    expect(response.status).toBe(404);
    expect(mocks.db.transactions.findFirst).toHaveBeenCalledWith({
      where: { transaction_id: id, user_id: userId },
    });
    expect(mocks.db.goal_contributions.create).not.toHaveBeenCalled();
  });
  it("calculates dashboard totals in decimal and scopes all queries", async () => {
    mocks.db.transactions.aggregate
      .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal("100.10") } })
      .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal("30.20") } })
      .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal("50.10") } })
      .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal("10.20") } });
    mocks.db.savings_goals.findMany.mockResolvedValue([]);
    mocks.db.savings_goals.aggregate.mockResolvedValue({
      _sum: { current_amount: null },
      _count: 0,
    });
    mocks.db.financial_insights.findMany.mockResolvedValue([]);
    mocks.db.transactions.findMany.mockResolvedValue([]);
    const response = await dashboard(request("dashboard/summary"));
    expect(await response.json()).toMatchObject({
      data: { balance: 69.9, monthlyNetCashFlow: 39.9, totalSaved: 0 },
      meta: { timeZone: "Asia/Dhaka" },
    });
    for (const call of mocks.db.transactions.aggregate.mock.calls)
      expect(call[0].where.user_id).toBe(userId);
    expect(
      mocks.db.financial_insights.findMany.mock.calls[0][0].where.user_id,
    ).toBe(userId);
  });
  it("returns a sanitized 500 envelope for unexpected database failures", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.db.savings_goals.findFirst.mockRejectedValue(
      new Error("secret database password"),
    );
    const response = await getGoal(request(`goals/${id}`), context());
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("secret");
    log.mockRestore();
  });
});
