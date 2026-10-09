import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api";
import { turnIds } from "@/lib/coach-retry";
import { createAiRateLimiter } from "@/lib/ai-rate-limit";
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  ai: vi.fn(),
  allowance: vi.fn(),
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
      updateMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.user }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }));
vi.mock("@/lib/gemini", () => ({ generateCoaching: mocks.ai }));
vi.mock("@/lib/ai-rate-limit", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/ai-rate-limit")>(),
  requireAiAllowance: mocks.allowance,
}));
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
  mocks.allowance.mockImplementation(createAiRateLimiter());
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
  it("shares the real allowance across coach and explanation, preserving calculations and user isolation", async () => {
    for (let i = 0; i < 6; i++)
      expect((await chat(request("chat", { message: "Help", language: "en" }), context())).status).toBe(201);
    mocks.db.ai_messages.create.mockClear();
    const blocked = await check(request("check", { purchaseAmount: 100, explain: true }));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBe("60");
    expect(mocks.ai).toHaveBeenCalledTimes(6);
    expect(mocks.db.ai_messages.create).not.toHaveBeenCalled();
    expect((await check(request("check", { purchaseAmount: 100, explain: false }))).status).toBe(200);
    mocks.user.mockResolvedValue("00000000-0000-4000-8000-000000000003");
    expect((await check(request("check", { purchaseAmount: 100, explain: true }))).status).toBe(200);
    expect(mocks.ai).toHaveBeenCalledTimes(7);
  });
  it("counts failed provider attempts without creating records", async () => {
    mocks.ai.mockRejectedValue(new ApiError(500, "Unavailable"));
    for (let i = 0; i < 6; i++)
      expect((await chat(request("chat", { message: "Help" }), context())).status).toBe(500);
    expect((await chat(request("chat", { message: "Help" }), context())).status).toBe(429);
    expect(mocks.ai).toHaveBeenCalledTimes(6);
    expect(mocks.db.ai_messages.create).not.toHaveBeenCalled();
    expect(mocks.db.recommendations.create).not.toHaveBeenCalled();
  });
  it("does not spend allowance on unauthorized, invalid or unowned requests", async () => {
    mocks.user.mockRejectedValueOnce(new ApiError(401, "Authentication required"));
    expect((await chat(request("chat", { message: "Help" }), context())).status).toBe(401);
    expect((await check(request("check", { purchaseAmount: -1, explain: true }))).status).toBe(400);
    mocks.db.ai_conversations.findFirst.mockResolvedValue(null);
    expect((await chat(request("chat", { message: "Help" }), context())).status).toBe(404);
    expect(mocks.allowance).not.toHaveBeenCalled();
    expect(mocks.ai).not.toHaveBeenCalled();
  });
  it.each([
    { message: "Ei calculation recorded data er upor ভিত্তি kore.", recommendations: [] },
    { message: "Valid Banglish", recommendations: [{ recommendationType: "BUDGET", recommendationText: "খরচ দেখুন", priority: "LOW" }] },
  ])("never persists a Banglish turn with Bengali leakage", async answer => {
    mocks.ai.mockResolvedValue(answer);
    const response = await chat(request("chat", { message: "Help", language: "banglish", requestId: id }), context());
    expect(response.status).toBe(500);
    expect((await response.json()).message).toContain("Banglish Latin-script requirements");
    expect(mocks.ai).toHaveBeenCalledTimes(1);
    expect(mocks.db.ai_messages.create).not.toHaveBeenCalled();
    expect(mocks.db.recommendations.create).not.toHaveBeenCalled();
    expect(mocks.db.ai_conversations.updateMany).not.toHaveBeenCalled();
  });
  it.each(["en", "bn", "banglish"] as const)("persists %s Unicode text without changing it", async language => {
    const text = language === "bn" ? "আপনার সঞ্চয় লক্ষ্য পর্যালোচনা করুন।" : language === "banglish" ? "Apnar sonchoy lokkho porjalochona korun." : "Review your savings goal.";
    mocks.ai.mockResolvedValue({ message: text, recommendations: [{ recommendationType: "GOAL", recommendationText: text, priority: "LOW" }] });
    mocks.db.recommendations.create.mockResolvedValue({ ...rec, recommendation_text: text });
    const response = await chat(request("chat", { message: text, language }), context());
    expect(response.status).toBe(201);
    expect((await response.json()).data.assistantMessage.message).toBe(text);
    expect(mocks.db.ai_messages.create.mock.calls[1][0].data.message_content).toBe(text);
    expect(mocks.db.recommendations.create.mock.calls[0][0].data.recommendation_text).toBe(text);
  });
  it("replays a committed retry without another provider call or writes", async () => {
    const input = { requestId: id, message: "বাংলা", language: "bn" };
    const ids = turnIds(userId, id, input)!;
    mocks.db.ai_messages.findMany.mockResolvedValue([
      { message_id: ids.user, conversation_id: id, role: "USER", message_content: input.message, created_at: date },
      { message_id: ids.assistant, conversation_id: id, role: "ASSISTANT", message_content: "পরামর্শ", created_at: date },
    ]);
    mocks.db.recommendations.findMany.mockResolvedValue([rec]);
    const response = await chat(request("chat", input), context());
    expect(response.status).toBe(200);
    expect((await response.json()).data.assistantMessage.message).toBe("পরামর্শ");
    expect(mocks.ai).not.toHaveBeenCalled();
    expect(mocks.allowance).not.toHaveBeenCalled();
    expect(mocks.db.ai_messages.create).not.toHaveBeenCalled();
    expect(mocks.db.recommendations.create).not.toHaveBeenCalled();
    expect(mocks.db.ai_messages.findMany.mock.calls[0][0].where.conversation.user_id).toBe(userId);
  });
  it("rejects retry-key reuse with a changed language or payload", async () => {
    const ids = turnIds(userId, id, { requestId: id, message: "Hi", language: "en" })!;
    mocks.db.ai_messages.findMany.mockResolvedValue([{ message_id: ids.user, conversation_id: id, role: "USER", message_content: "Hi", created_at: date }]);
    expect((await chat(request("chat", { requestId: id, message: "Hi", language: "bn" }), context())).status).toBe(400);
    expect(mocks.ai).not.toHaveBeenCalled();
  });
  it("rolls back messages when recommendation persistence fails, then safely retries", async () => {
    const rows: unknown[] = [];
    mocks.db.ai_messages.create.mockImplementation(async ({ data }) => { const row = { message_id: id, ...data }; rows.push(row); return row; });
    mocks.db.$transaction.mockImplementation(async operation => {
      const length = rows.length;
      try { return await operation(mocks.db); } catch (error) { rows.splice(length); throw error; }
    });
    mocks.ai.mockResolvedValue({ message: "পরামর্শ", recommendations: [{ recommendationType: "BUDGET", recommendationText: "খরচ দেখুন", priority: "LOW" }] });
    mocks.db.recommendations.create.mockRejectedValueOnce(new Error("private database detail")).mockResolvedValue(rec);
    const input = { message: "Help", language: "bn", requestId: id };
    expect((await chat(request("chat", input), context())).status).toBe(500);
    expect(rows).toHaveLength(0);
    expect((await chat(request("chat", input), context())).status).toBe(201);
    expect(rows).toHaveLength(2);
  });
  it("returns the winner of a concurrent retry after the losing transaction rolls back", async () => {
    const input = { requestId: id, message: "Hi", language: "en" };
    const ids = turnIds(userId, id, input)!;
    mocks.db.ai_messages.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([
      { message_id: ids.user, conversation_id: id, role: "USER", message_content: "Hi", created_at: date },
      { message_id: ids.assistant, conversation_id: id, role: "ASSISTANT", message_content: "Guidance", created_at: date },
    ]);
    mocks.db.recommendations.findMany.mockResolvedValue([]);
    mocks.db.ai_conversations.updateMany.mockResolvedValue({ count: 0 });
    expect((await chat(request("chat", input), context())).status).toBe(200);
    expect(mocks.db.ai_messages.create).not.toHaveBeenCalled();
  });
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
      request("chat", { message: "Ki korbo?", language: "bn" }),
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
    expect(mocks.ai.mock.calls[0][0].language).toBe("bn");
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
    mocks.db.recommendations.findFirst.mockResolvedValue(rec);
    mocks.db.recommendations.updateMany.mockResolvedValue({ count: 1 });
    expect(
      (
        await patchRecommendation(
          request("recommendations", { status: "VIEWED" }, "PATCH"),
          context(),
        )
      ).status,
    ).toBe(200);
    expect(mocks.db.recommendations.updateMany.mock.calls[0][0].where).toEqual({
      recommendation_id: id,
      user_id: userId,
      status: "NEW",
    });
    expect(mocks.db.$transaction).toHaveBeenLastCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    // Preserve the unique isolation assertion from the consolidated untracked
    // same-status case; transition/no-op coverage also lives in its own suite.
    mocks.db.recommendations.findFirst.mockResolvedValue({ ...rec, status: "COMPLETED" });
    mocks.db.recommendations.updateMany.mockClear();
    expect((await patchRecommendation(
      request("recommendations", { status: "COMPLETED" }, "PATCH"), context(),
    )).status).toBe(200);
    expect(mocks.db.recommendations.updateMany).not.toHaveBeenCalled();
    expect(mocks.db.$transaction).toHaveBeenLastCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
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
  it("allows calculation-only recovery after an optional explanation fails", async () => {
    mocks.ai.mockRejectedValue(new ApiError(500, "AI service is unavailable; please try again later"));
    const failed = await check(request("check", { purchaseAmount: 100, explain: true }));
    expect(failed.status).toBe(500);
    expect(await failed.json()).toMatchObject({ success: false, data: null });
    const calculated = mocks.ai.mock.calls[0][0].context.assessment;

    const recovered = await check(request("check", { purchaseAmount: 100, explain: false }));
    expect(recovered.status).toBe(200);
    expect((await recovered.json()).data).toEqual({ ...calculated, explanation: null });
    expect(mocks.ai).toHaveBeenCalledTimes(1);
    expect(mocks.db.ai_messages.create).not.toHaveBeenCalled();
    expect(mocks.db.recommendations.create).not.toHaveBeenCalled();
    expect(mocks.db.ai_conversations.updateMany).not.toHaveBeenCalled();
  });
  it("keeps every calculated fact unchanged when AI prose falsely approves the purchase", async () => {
    const baseline = (await (await check(request("check", { purchaseAmount: 100 }))).json()).data;
    mocks.ai.mockResolvedValue({ message: "AFFORDABLE: I verified your live wallet and guarantee this purchase is safe.", recommendations: [] });
    const response = await check(request("check", { purchaseAmount: 100, explain: true }));
    expect(response.status).toBe(200);
    const { explanation, ...facts } = (await response.json()).data;
    expect({ ...facts, explanation: null }).toEqual(baseline);
    expect(facts.decision).toBe("INSUFFICIENT_DATA");
    expect(explanation).toContain("AFFORDABLE");
    expect(mocks.ai.mock.calls[0][0].context.assessment.decision).toBe("INSUFFICIENT_DATA");
    expect(mocks.db.ai_messages.create).not.toHaveBeenCalled();
    expect(mocks.db.recommendations.create).not.toHaveBeenCalled();
    expect(mocks.db.ai_conversations.updateMany).not.toHaveBeenCalled();
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
