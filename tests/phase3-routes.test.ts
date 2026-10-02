import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  db: {
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
    savings_goals: { findFirst: vi.fn(), findMany: vi.fn() },
    financial_insights: { create: vi.fn() },
    financial_health: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }));
import { GET as spending } from "@/app/api/v1/analytics/spending/route";
import { POST as refresh } from "@/app/api/v1/analytics/refresh/route";
import { POST as plan } from "@/app/api/v1/goals/[id]/savings-plan/route";
import { GET as health } from "@/app/api/v1/financial-health/route";
import { POST as refreshHealth } from "@/app/api/v1/financial-health/refresh/route";

const userId = "00000000-0000-4000-8000-000000000002",
  id = "00000000-0000-4000-8000-000000000001";
const context = () => ({ params: Promise.resolve({ id }) });
const request = (path: string, value?: unknown) =>
  new Request(`http://localhost/api/v1/${path}`, {
    method: value === undefined ? "GET" : "POST",
    ...(value !== undefined ? { body: JSON.stringify(value) } : {}),
  });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireUser.mockResolvedValue(userId);
  mocks.db.$queryRaw.mockResolvedValue([]);
  mocks.db.savings_goals.findMany.mockResolvedValue([]);
  mocks.db.$transaction.mockImplementation(async (operation: unknown) =>
    typeof operation === "function"
      ? operation(mocks.db)
      : Promise.all(operation as Promise<unknown>[]),
  );
});

describe("Phase 3 protected endpoints", () => {
  it.each([
    ["spending", () => spending(request("analytics/spending"))],
    ["refresh", () => refresh(request("analytics/refresh", {}))],
    ["plan", () => plan(request(`goals/${id}/savings-plan`, {}), context())],
    ["health", () => health(request("financial-health"))],
    [
      "health refresh",
      () => refreshHealth(request("financial-health/refresh", {})),
    ],
  ])(
    "rejects unauthenticated %s calls with the standard envelope",
    async (_, call) => {
      mocks.requireUser.mockRejectedValue(
        new ApiError(401, "Authentication required"),
      );
      const response = await (call as () => Promise<Response>)();
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        success: false,
        message: "Authentication required",
        data: null,
      });
      expect(mocks.db.$transaction).not.toHaveBeenCalled();
    },
  );
  it("scopes both SQL aggregation windows by authenticated user and UTC bounds", async () => {
    const response = await spending(
      request("analytics/spending?startDate=2026-01-01&endDate=2026-01-31"),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      data: { totalIncome: 0, totalExpenses: 0 },
    });
    expect(mocks.db.$queryRaw).toHaveBeenCalledTimes(2);
    expect(mocks.db.$queryRaw.mock.calls[0].slice(1)).toEqual([
      userId,
      new Date("2025-12-31T18:00:00Z"),
      new Date("2026-01-31T18:00:00Z"),
    ]);
    expect(mocks.db.$queryRaw.mock.calls[1][1]).toBe(userId);
    expect(mocks.db.$transaction.mock.calls[0][1]).toEqual({
      isolationLevel: "RepeatableRead",
    });
  });
  it("rejects invalid ranges, future dates, and body injection without querying transactions", async () => {
    expect(
      (
        await spending(
          request("analytics/spending?startDate=2026-02-01&endDate=2026-01-01"),
        )
      ).status,
    ).toBe(400);
    expect(
      (await spending(request("analytics/spending?endDate=2099-01-01"))).status,
    ).toBe(400);
    expect(
      (await refresh(request("analytics/refresh", { userId }))).status,
    ).toBe(400);
    expect(mocks.db.$queryRaw).not.toHaveBeenCalled();
  });
  it("refreshes analytics and persists only this user's calculated summary", async () => {
    mocks.db.financial_insights.create.mockResolvedValue({
      insight_id: id,
      created_at: new Date("2026-10-02"),
    });
    const response = await refresh(request("analytics/refresh", {}));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: { insightId: id, calculationVersion: "spending-v1" },
    });
    expect(
      mocks.db.financial_insights.create.mock.calls[0][0].data,
    ).toMatchObject({
      user_id: userId,
      insight_type: "spending_summary",
      metadata: { totalExpenses: 0 },
    });
  });
  it("returns 404 for a missing or differently owned savings goal", async () => {
    mocks.db.savings_goals.findFirst.mockResolvedValue(null);
    const response = await plan(
      request(`goals/${id}/savings-plan`, {}),
      context(),
    );
    expect(response.status).toBe(404);
    expect(mocks.db.savings_goals.findFirst).toHaveBeenCalledWith({
      where: { goal_id: id, user_id: userId },
    });
    expect(mocks.db.$queryRaw).not.toHaveBeenCalled();
  });
  it("returns 403 for a nonactive goal", async () => {
    mocks.db.savings_goals.findFirst.mockResolvedValue({ status: "PAUSED" });
    expect(
      (await plan(request(`goals/${id}/savings-plan`, {}), context())).status,
    ).toBe(403);
    expect(mocks.db.$queryRaw).not.toHaveBeenCalled();
  });
  it("generates a plan without writes or an LLM", async () => {
    mocks.db.savings_goals.findFirst.mockResolvedValue({
      goal_id: id,
      user_id: userId,
      goal_name: "Laptop",
      target_amount: new Prisma.Decimal(1000),
      current_amount: new Prisma.Decimal(0),
      target_date: new Date("2099-01-01"),
      status: "ACTIVE",
      created_at: new Date(),
      updated_at: new Date(),
    });
    const response = await plan(
      request(`goals/${id}/savings-plan`, {}),
      context(),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: { remainingAmount: 1000, generatedBy: "backend" },
    });
    expect(mocks.db.financial_insights.create).not.toHaveBeenCalled();
    expect(mocks.db.financial_health.create).not.toHaveBeenCalled();
  });
  it("calculates current wellness without storing a snapshot", async () => {
    const response = await health(request("financial-health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: {
        healthScore: 0,
        stored: false,
        scoreType: "illustrative_wellness",
      },
    });
    expect(mocks.db.savings_goals.findMany).toHaveBeenCalledWith({
      where: { user_id: userId, status: { not: "CANCELLED" } },
    });
    expect(mocks.db.financial_health.create).not.toHaveBeenCalled();
  });
  it("supports optional health storage and stores server-calculated scores only", async () => {
    expect(
      (
        await refreshHealth(
          request("financial-health/refresh", { store: false }),
        )
      ).status,
    ).toBe(200);
    expect(mocks.db.financial_health.create).not.toHaveBeenCalled();
    mocks.db.financial_health.create.mockResolvedValue({ health_id: id });
    const response = await refreshHealth(
      request("financial-health/refresh", {}),
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      data: { healthId: id, stored: true },
    });
    expect(
      mocks.db.financial_health.create.mock.calls[0][0].data,
    ).toMatchObject({ user_id: userId, health_score: 0, savings_score: 0 });
  });
  it("scopes historical scores and pagination to the current user", async () => {
    mocks.db.financial_health.findMany.mockResolvedValue([]);
    mocks.db.financial_health.count.mockResolvedValue(0);
    const response = await health(
      request(
        "financial-health?mode=history&startDate=2026-01-01&endDate=2026-02-01&page=2&pageSize=10",
      ),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: [],
      meta: { page: 2, total: 0 },
    });
    const args = mocks.db.financial_health.findMany.mock.calls[0][0];
    expect(args).toMatchObject({
      where: {
        user_id: userId,
        assessment_date: {
          gte: new Date("2026-01-01"),
          lte: new Date("2026-02-01"),
        },
      },
      skip: 10,
      take: 10,
    });
    expect(mocks.db.financial_health.count).toHaveBeenCalledWith({
      where: args.where,
    });
    expect(mocks.db.$queryRaw).not.toHaveBeenCalled();
  });
  it("rejects malformed refresh JSON and caller-calculated scores", async () => {
    const malformed = new Request(
      "http://localhost/api/v1/financial-health/refresh",
      { method: "POST", body: "{" },
    );
    expect((await refreshHealth(malformed)).status).toBe(400);
    expect(
      (
        await refreshHealth(
          request("financial-health/refresh", { healthScore: 100 }),
        )
      ).status,
    ).toBe(400);
    expect(mocks.db.financial_health.create).not.toHaveBeenCalled();
  });
});
