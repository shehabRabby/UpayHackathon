import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api";
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  ai: vi.fn(),
  db: {
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    users: { findUnique: vi.fn() },
    ai_conversations: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    ai_messages: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    savings_goals: { findFirst: vi.fn(), aggregate: vi.fn() },
    transactions: { aggregate: vi.fn() },
    recommendations: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.user }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }));
vi.mock("@/lib/gemini", () => ({ generateCoaching: mocks.ai }));
import {
  POST as chat,
  GET as messages,
} from "@/app/api/v1/coach/conversations/[id]/messages/route";
import { POST as createConversation } from "@/app/api/v1/coach/conversations/route";
import { DELETE as deleteConversation } from "@/app/api/v1/coach/conversations/[id]/route";
import { GET as recommendations } from "@/app/api/v1/recommendations/route";
import { PATCH as patchRecommendation } from "@/app/api/v1/recommendations/[id]/route";
import { POST as simulator } from "@/app/api/v1/simulator/what-if/route";
import { POST as check } from "@/app/api/v1/affordability/check/route";

const userId = "00000000-0000-4000-8000-000000000002",
  id = "00000000-0000-4000-8000-000000000001";
const date = new Date("2026-10-02"),
  context = () => ({ params: Promise.resolve({ id }) });
const request = (path: string, input?: unknown, method?: string) =>
  new Request(`http://localhost/api/v1/${path}`, {
    method: method ?? (input === undefined ? "GET" : "POST"),
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
  });
const rec = {
  recommendation_id: id,
  user_id: userId,
  recommendation_type: "BUDGET",
  recommendation_text: "Review spending",
  priority: "LOW",
  status: "NEW",
  created_at: date,
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue(userId);
  mocks.db.$transaction.mockImplementation(async (operation: unknown) =>
    typeof operation === "function"
      ? operation(mocks.db)
      : Promise.all(operation as Promise<unknown>[]),
  );
  mocks.db.$queryRaw.mockResolvedValue([]);
  mocks.db.users.findUnique.mockResolvedValue({ preferred_language: "bn-BD" });
  mocks.db.savings_goals.aggregate.mockResolvedValue({
    _sum: { current_amount: new Prisma.Decimal(0) },
    _count: 0,
  });
  mocks.db.ai_conversations.findFirst.mockResolvedValue({
    conversation_id: id,
    user_id: userId,
    updated_at: date,
  });
  mocks.db.ai_conversations.updateMany.mockResolvedValue({ count: 1 });
  mocks.db.ai_messages.findMany.mockResolvedValue([]);
  mocks.db.ai_messages.create.mockImplementation(
    async ({ data }: { data: object }) => ({ message_id: id, ...data }),
  );
  mocks.ai.mockResolvedValue({
    message: "Budget guidance",
    recommendations: [],
  });
  mocks.db.transactions.aggregate.mockResolvedValue({
    _sum: { amount: null },
    _count: 0,
  });
});

describe("Phase 5/6 route guarantees", () => {
  it.each([
    [
      "chat",
      () =>
        chat(
          request("coach/conversations/" + id + "/messages", { message: "Hi" }),
          context(),
        ),
    ],
    ["recommendations", () => recommendations(request("recommendations"))],
    [
      "recommendation patch",
      () =>
        patchRecommendation(
          request("recommendations/" + id, { status: "VIEWED" }, "PATCH"),
          context(),
        ),
    ],
    ["simulator", () => simulator(request("simulator/what-if", {}))],
    ["affordability", () => check(request("affordability/check", {}))],
  ])("returns an unauthenticated envelope for %s", async (_, call) => {
    mocks.user.mockRejectedValue(new ApiError(401, "Authentication required"));
    const response = await (call as () => Promise<Response>)();
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ success: false, data: null });
    expect(mocks.ai).not.toHaveBeenCalled();
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });
  it("checks conversation ownership before Gemini or message writes", async () => {
    mocks.db.ai_conversations.findFirst.mockResolvedValue(null);
    expect(
      (await chat(request("chat", { message: "Hi" }), context())).status,
    ).toBe(404);
    expect(mocks.db.ai_conversations.findFirst).toHaveBeenCalledWith({
      where: { conversation_id: id, user_id: userId },
    });
    expect(mocks.ai).not.toHaveBeenCalled();
    expect(mocks.db.ai_messages.create).not.toHaveBeenCalled();
  });
  it("atomically persists both messages and generated recommendations", async () => {
    mocks.ai.mockResolvedValue({
      message: "পরামর্শ",
      recommendations: [
        {
          recommendationType: "BUDGET",
          recommendationText: "Review spending",
          priority: "LOW",
        },
      ],
    });
    mocks.db.recommendations.create.mockResolvedValue(rec);
    const response = await chat(
      request("chat", { message: "Ki korbo?", language: "banglish" }),
      context(),
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      data: {
        assistantMessage: { role: "ASSISTANT", message: "পরামর্শ" },
        recommendations: [{ status: "NEW" }],
      },
    });
    expect(mocks.db.ai_messages.create).toHaveBeenCalledTimes(2);
    expect(mocks.db.recommendations.create.mock.calls[0][0].data.user_id).toBe(
      userId,
    );
    expect(mocks.ai.mock.calls[0][0].language).toBe("banglish");
    expect(mocks.db.$transaction.mock.calls[1][1]).toEqual({
      isolationLevel: "Serializable",
    });
  });
  it("limits context and history without account IDs or contact details", async () => {
    mocks.db.ai_messages.findMany.mockResolvedValue([
      { role: "USER", message_content: "x".repeat(3000) },
    ]);
    await chat(request("chat", { message: "Help" }), context());
    const sent = mocks.ai.mock.calls[0][0];
    expect(sent.history[0].content).toHaveLength(2000);
    expect(JSON.stringify(sent.context)).not.toContain(userId);
    expect(JSON.stringify(sent.context)).not.toContain(id);
    expect(mocks.db.users.findUnique).toHaveBeenCalledWith({
      where: { user_id: userId },
      select: { preferred_language: true },
    });
    expect(mocks.db.ai_messages.findMany.mock.calls[0][0]).toMatchObject({
      take: 6,
      where: { conversation: { user_id: userId } },
    });
  });
  it("does not persist a partial turn on provider failure", async () => {
    mocks.ai.mockRejectedValue(new ApiError(500, "AI unavailable"));
    const response = await chat(request("chat", { message: "Hi" }), context());
    expect(response.status).toBe(500);
    expect(mocks.db.ai_conversations.updateMany).not.toHaveBeenCalled();
    expect(mocks.db.ai_messages.create).not.toHaveBeenCalled();
  });
  it("prevents committing a response generated against a stale conversation", async () => {
    mocks.db.ai_conversations.updateMany.mockResolvedValue({ count: 0 });
    expect(
      (await chat(request("chat", { message: "Hi" }), context())).status,
    ).toBe(400);
    expect(mocks.db.ai_messages.create).not.toHaveBeenCalled();
  });
  it("enforces selected goal ownership before sending context externally", async () => {
    mocks.db.savings_goals.findFirst.mockResolvedValue(null);
    expect(
      (await chat(request("chat", { message: "Help", goalId: id }), context()))
        .status,
    ).toBe(404);
    expect(mocks.ai).not.toHaveBeenCalled();
  });
  it("creates owned conversations and scopes deletion and message reads", async () => {
    mocks.db.ai_conversations.create.mockResolvedValue({
      conversation_id: id,
      conversation_title: "Chat",
      created_at: date,
      updated_at: date,
    });
    expect(
      (await createConversation(request("conversations", { title: "Chat" })))
        .status,
    ).toBe(201);
    expect(mocks.db.ai_conversations.create.mock.calls[0][0].data.user_id).toBe(
      userId,
    );
    mocks.db.ai_conversations.deleteMany.mockResolvedValue({ count: 0 });
    expect(
      (await deleteConversation(request("conversations/" + id), context()))
        .status,
    ).toBe(404);
    mocks.db.ai_messages.count.mockResolvedValue(0);
    expect((await messages(request("messages"), context())).status).toBe(200);
    expect(mocks.db.ai_messages.count.mock.calls[0][0].where).toMatchObject({
      conversation_id: id,
      conversation: { user_id: userId },
    });
  });
  it("scopes recommendation lists, counts, and status updates to their owner", async () => {
    mocks.db.recommendations.findMany.mockResolvedValue([rec]);
    mocks.db.recommendations.count.mockResolvedValue(1);
    expect(
      (
        await recommendations(
          request("recommendations?status=NEW&priority=LOW"),
        )
      ).status,
    ).toBe(200);
    expect(mocks.db.recommendations.count).toHaveBeenCalledWith({
      where: { user_id: userId, status: "NEW", priority: "LOW" },
    });
    mocks.db.recommendations.findFirst.mockResolvedValue(null);
    expect(
      (
        await patchRecommendation(
          request("recommendations", { status: "VIEWED" }, "PATCH"),
          context(),
        )
      ).status,
    ).toBe(404);
    expect(mocks.db.recommendations.update).not.toHaveBeenCalled();
    mocks.db.recommendations.findFirst.mockResolvedValue({
      recommendation_id: id,
    });
    mocks.db.recommendations.update.mockResolvedValue({
      ...rec,
      status: "VIEWED",
    });
    expect(
      (
        await patchRecommendation(
          request("recommendations", { status: "VIEWED" }, "PATCH"),
          context(),
        )
      ).status,
    ).toBe(200);
    expect(mocks.db.recommendations.update.mock.calls[0][0].where).toEqual({
      recommendation_id: id,
      user_id: userId,
    });
  });
  it("simulates without writes, even when no goal is selected", async () => {
    const response = await simulator(
      request("simulator/what-if", {
        monthlyIncome: 1000,
        monthlyExpenses: 600,
        monthlySaving: 300,
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: { projectedMonthlySaving: 300, monthsToGoal: null },
    });
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
    expect(mocks.ai).not.toHaveBeenCalled();
  });
  it("rejects a differently owned goal in simulator and affordability", async () => {
    mocks.db.savings_goals.findFirst.mockResolvedValue(null);
    expect(
      (
        await simulator(
          request("simulator", {
            monthlyIncome: 100,
            monthlyExpenses: 0,
            monthlySaving: 100,
            goalId: id,
          }),
        )
      ).status,
    ).toBe(404);
    expect(
      (await check(request("check", { purchaseAmount: 10, goalId: id })))
        .status,
    ).toBe(404);
    expect(
      mocks.db.savings_goals.findFirst.mock.calls[0][0].where.user_id,
    ).toBe(userId);
    expect(mocks.ai).not.toHaveBeenCalled();
  });
  it("calculates affordability without external calls or financial writes by default", async () => {
    const response = await check(request("check", { purchaseAmount: 100 }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: { decision: "INSUFFICIENT_DATA", explanation: null },
    });
    expect(mocks.ai).not.toHaveBeenCalled();
    expect(mocks.db.ai_messages.create).not.toHaveBeenCalled();
    for (const call of mocks.db.transactions.aggregate.mock.calls)
      expect(call[0].where.user_id).toBe(userId);
  });
  it("explains a fixed backend affordability decision without storing AI output", async () => {
    const response = await check(
      request("check", { purchaseAmount: 100, explain: true, language: "en" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: { explanation: "Budget guidance", decision: "INSUFFICIENT_DATA" },
    });
    expect(mocks.ai.mock.calls[0][0]).toMatchObject({
      language: "en",
      context: { assessment: { decision: "INSUFFICIENT_DATA" } },
    });
    expect(mocks.db.recommendations.create).not.toHaveBeenCalled();
  });
  it("rejects malformed or unknown request fields before calling Gemini", async () => {
    expect(
      (await chat(request("chat", { message: "Hi", userId }), context()))
        .status,
    ).toBe(400);
    const malformed = new Request("http://localhost/api/v1/simulator/what-if", {
      method: "POST",
      body: "{",
    });
    expect((await simulator(malformed)).status).toBe(400);
    expect(mocks.ai).not.toHaveBeenCalled();
  });
});
