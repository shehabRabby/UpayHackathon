import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

// OFFLINE simulated financial-write evidence. The in-memory fixture models
// snapshot conflicts and rollback; PostgreSQL/Supabase are never contacted.
// Coach/recommendation guards remain in phase56-routes and recommendation-transitions.
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  db: {
    $transaction: vi.fn(),
    savings_goals: { findFirst: vi.fn(), update: vi.fn() },
    transactions: { findFirst: vi.fn() },
    goal_contributions: { create: vi.fn(), aggregate: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.user }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }));
import { POST as contribute } from "@/app/api/v1/goals/[id]/contributions/route";

const userId = "00000000-0000-4000-8000-000000000001";
const goalId = "00000000-0000-4000-8000-000000000002";
const otherGoalId = "00000000-0000-4000-8000-000000000003";
const txId = "00000000-0000-4000-8000-000000000005";
const date = new Date("2026-10-02T10:00:00.000Z");

function goalRow(current = 500, status: "ACTIVE" | "PAUSED" | "COMPLETED" = "ACTIVE", id = goalId) {
  return {
    goal_id: id, user_id: userId, goal_name: "Emergency fund", status,
    target_amount: new Prisma.Decimal(1000), current_amount: new Prisma.Decimal(current),
    target_date: new Date("2099-01-01"), created_at: date, updated_at: date,
  };
}
type GoalRow = ReturnType<typeof goalRow>;
type ContributionRow = {
  contribution_id: string; goal_id: string; transaction_id: string | null;
  amount: Prisma.Decimal; contribution_date: Date;
};
const send = (amount: number, id = goalId, transactionId?: string) =>
  contribute(new Request(`http://localhost/api/v1/goals/${id}/contributions`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ amount, ...(transactionId ? { transactionId } : {}) }),
  }), { params: Promise.resolve({ id }) });
const conflict = () => new Prisma.PrismaClientKnownRequestError(
  "private simulated database serialization detail", { code: "P2034", clientVersion: "synthetic" },
);

// Both requests finish their real handler work against the same snapshot before
// either fixture commit. Later retries do not wait at this barrier.
function firstTwoCommits() {
  let arrivals = 0, release!: () => void;
  const ready = new Promise<void>(resolve => { release = resolve; });
  return async () => {
    arrivals++;
    if (arrivals === 2) release();
    if (arrivals <= 2) await ready;
  };
}

function simulatedStore(initialGoals: GoalRow[], beforeCommit = async () => {}) {
  let state: { goals: GoalRow[]; contributions: ContributionRow[] } = {
    goals: initialGoals.map(goal => ({ ...goal })), contributions: [],
  };
  let version = 0, failure: "insert" | "update" | "commit" | null = null;
  const attempts = { inserts: 0, updates: 0 };
  mocks.db.$transaction.mockImplementation(async operation => {
    const readVersion = version;
    const snapshot = {
      goals: state.goals.map(goal => ({ ...goal })),
      contributions: [...state.contributions],
    };
    const tx = {
      ...mocks.db,
      savings_goals: {
        findFirst: async ({ where }: { where: { goal_id: string; user_id: string } }) =>
          snapshot.goals.find(goal => goal.goal_id === where.goal_id && goal.user_id === where.user_id) ?? null,
        update: async ({ where, data }: { where: { goal_id: string; user_id: string }; data: { current_amount: Prisma.Decimal; status: GoalRow["status"] } }) => {
          attempts.updates++;
          if (failure === "update") { failure = null; throw new Error("private simulated goal-update failure"); }
          const index = snapshot.goals.findIndex(goal => goal.goal_id === where.goal_id && goal.user_id === where.user_id);
          snapshot.goals[index] = { ...snapshot.goals[index], ...data };
          return snapshot.goals[index];
        },
      },
      goal_contributions: {
        aggregate: async ({ where }: { where: { transaction_id: string } }) => ({
          _sum: { amount: snapshot.contributions
            .filter(row => row.transaction_id === where.transaction_id)
            .reduce((sum, row) => sum.plus(row.amount), new Prisma.Decimal(0)) },
        }),
        create: async ({ data }: { data: Omit<ContributionRow, "contribution_id"> }) => {
          attempts.inserts++;
          if (failure === "insert") { failure = null; throw new Error("private simulated contribution-insert failure"); }
          const row = { contribution_id: `synthetic-${snapshot.contributions.length + 1}`, ...data };
          snapshot.contributions.push(row);
          return row;
        },
      },
    };
    const result = await operation(tx);
    await beforeCommit();
    if (failure === "commit") { failure = null; throw conflict(); }
    if (version !== readVersion) throw conflict();
    // Only publish writes on success. A thrown operation/conflict discards its snapshot.
    state = snapshot;
    version++;
    return result;
  });
  return {
    get state() { return state; }, attempts,
    failNext(stage: NonNullable<typeof failure>) { failure = stage; },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Offline financial-write tests forbid network access"));
  mocks.user.mockResolvedValue(userId);
  mocks.db.$transaction.mockImplementation(async operation => operation(mocks.db));
  mocks.db.savings_goals.findFirst.mockResolvedValue(goalRow());
  mocks.db.savings_goals.update.mockImplementation(async ({ data }) => ({ ...goalRow(), ...data }));
  mocks.db.goal_contributions.create.mockImplementation(async ({ data }) => ({
    contribution_id: "synthetic-contribution", ...data,
  }));
  mocks.db.transactions.findFirst.mockResolvedValue({
    transaction_id: txId, user_id: userId, amount: new Prisma.Decimal(200),
  });
  mocks.db.goal_contributions.aggregate.mockResolvedValue({ _sum: { amount: new Prisma.Decimal(0) } });
});
afterEach(() => {
  try { expect(globalThis.fetch).not.toHaveBeenCalled(); }
  finally { vi.restoreAllMocks(); }
});

describe("Offline simulated financial-write conflicts and recovery", () => {
  it("keeps contribution insertion and goal update inside a Serializable transaction", async () => {
    const response = await send(100);
    expect(response.status).toBe(201);
    expect((await response.json()).data.goal.currentAmount).toBe(600);
    expect(mocks.db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(mocks.db.goal_contributions.create).toHaveBeenCalledTimes(1);
    expect(mocks.db.savings_goals.update).toHaveBeenCalledTimes(1);
  });

  it("rejects a contribution against a refreshed goal with insufficient remaining capacity", async () => {
    mocks.db.savings_goals.findFirst.mockResolvedValue(goalRow(950));
    const response = await send(150);
    expect(response.status).toBe(400);
    expect((await response.json()).message).toContain("Contribution exceeds the remaining goal amount");
    expect(mocks.db.goal_contributions.create).not.toHaveBeenCalled();
    expect(mocks.db.savings_goals.update).not.toHaveBeenCalled();
  });

  it("rejects exhausted source-transaction capacity without financial writes", async () => {
    mocks.db.goal_contributions.aggregate.mockResolvedValue({ _sum: { amount: new Prisma.Decimal(150) } });
    const response = await send(100, goalId, txId);
    expect(response.status).toBe(400);
    expect((await response.json()).message).toContain("Contributions exceed the source transaction amount");
    expect(mocks.db.goal_contributions.create).not.toHaveBeenCalled();
    expect(mocks.db.savings_goals.update).not.toHaveBeenCalled();
  });

  it.each(["PAUSED", "COMPLETED"] as const)("rejects a contribution after goal status becomes %s", async status => {
    mocks.db.savings_goals.findFirst.mockResolvedValue(goalRow(500, status));
    const response = await send(50);
    expect(response.status).toBe(403);
    expect((await response.json()).message).toContain("Contributions require an active goal");
    expect(mocks.db.goal_contributions.create).not.toHaveBeenCalled();
    expect(mocks.db.savings_goals.update).not.toHaveBeenCalled();
  });

  it("returns one simulated conflict for competing goal writes, then revalidates an explicit retry", async () => {
    const store = simulatedStore([goalRow(800)], firstTwoCommits());
    const responses = await Promise.all([send(150), send(150)]);
    expect(responses.map(response => response.status).sort()).toEqual([201, 400]);
    expect(await responses.find(response => response.status === 400)!.json()).toMatchObject({
      success: false, data: null,
      message: "The request conflicts with the current data; refresh and try again",
    });
    expect(mocks.db.$transaction).toHaveBeenCalledTimes(2); // No automatic financial-write retry.
    expect(store.attempts).toEqual({ inserts: 2, updates: 2 });
    expect(store.state.contributions).toHaveLength(1);
    expect(store.state.goals[0].current_amount.toNumber()).toBe(950);
    const retry = await send(150);
    expect(retry.status).toBe(400);
    expect((await retry.json()).message).toContain("Contribution exceeds the remaining goal amount");
    expect(store.state.contributions).toHaveLength(1);
    expect(store.state.goals[0].current_amount.toNumber()).toBe(950);
  });

  it("prevents simulated shared-source over-allocation across two goals and rechecks the winning allocation", async () => {
    const store = simulatedStore([goalRow(0), goalRow(0, "ACTIVE", otherGoalId)], firstTwoCommits());
    const responses = await Promise.all([send(150, goalId, txId), send(150, otherGoalId, txId)]);
    expect(responses.map(response => response.status).sort()).toEqual([201, 400]);
    expect(store.state.contributions).toHaveLength(1);
    expect(store.state.contributions[0].amount.toNumber()).toBe(150);
    expect(store.state.goals.reduce((sum, goal) => sum + goal.current_amount.toNumber(), 0)).toBe(150);
    const losingGoal = store.state.goals.find(goal => goal.current_amount.isZero())!;
    const retry = await send(150, losingGoal.goal_id, txId);
    expect(retry.status).toBe(400);
    expect((await retry.json()).message).toContain("Contributions exceed the source transaction amount");
    expect(store.state.contributions).toHaveLength(1);
    expect(losingGoal.current_amount.toNumber()).toBe(0);
  });

  it.each(["insert", "update", "commit"] as const)("discards simulated staged writes after %s failure and allows a safe explicit retry", async stage => {
    const store = simulatedStore([goalRow()]);
    store.failNext(stage);
    const response = await send(100);
    expect(response.status).toBe(stage === "commit" ? 400 : 500);
    const payload = await response.json();
    expect(payload).toMatchObject({ success: false, data: null });
    expect(payload.message).toBe(stage === "commit"
      ? "The request conflicts with the current data; refresh and try again"
      : "An unexpected server error occurred");
    expect(JSON.stringify(payload)).not.toContain("private simulated");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("private simulated");
    expect(store.state.contributions).toHaveLength(0);
    expect(store.state.goals[0].current_amount.toNumber()).toBe(500);
    expect(store.attempts).toEqual({ inserts: 1, updates: stage === "insert" ? 0 : 1 });

    const recovered = await send(100);
    expect(recovered.status).toBe(201);
    expect(store.state.contributions).toHaveLength(1);
    expect(store.state.goals[0].current_amount.toNumber()).toBe(600);
    expect(mocks.db.$transaction).toHaveBeenCalledTimes(2);
  });
});
