import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.user }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: async (operation: (tx: unknown) => unknown) => operation({ recommendations: mocks }) } }));
import { PATCH } from "@/app/api/v1/recommendations/[id]/route";
const id = "00000000-0000-4000-8000-000000000001", userId = "00000000-0000-4000-8000-000000000002";
let row: { recommendation_id: string; user_id: string; status: string; recommendation_type: string; recommendation_text: string; priority: string; created_at: Date };
const patch = (status: string) => PATCH(new Request("http://localhost/api/v1/recommendations/" + id, { method: "PATCH", body: JSON.stringify({ status }) }), { params: Promise.resolve({ id }) });
beforeEach(() => {
  vi.resetAllMocks(); mocks.user.mockResolvedValue(userId);
  row = { recommendation_id: id, user_id: userId, status: "NEW", recommendation_type: "BUDGET", recommendation_text: "Preserve this বাংলা content exactly.", priority: "HIGH", created_at: new Date("2026-10-02") };
  mocks.findFirst.mockImplementation(async ({ where }) => where.user_id === row.user_id ? { ...row } : null);
  mocks.updateMany.mockImplementation(async ({ where, data }) => {
    if (where.user_id !== row.user_id || where.recommendation_id !== row.recommendation_id || where.status !== row.status) return { count: 0 };
    row.status = data.status; return { count: 1 };
  });
});
describe("Recommendation API transitions", () => {
  it.each([["NEW", "VIEWED"], ["NEW", "COMPLETED"], ["NEW", "DISMISSED"], ["VIEWED", "COMPLETED"], ["VIEWED", "DISMISSED"]])("allows %s -> %s, changing only status", async (from, to) => {
    row.status = from; const original = { ...row };
    expect((await patch(to)).status).toBe(200);
    expect(row).toEqual({ ...original, status: to });
    expect(mocks.updateMany).toHaveBeenCalledWith({ where: { recommendation_id: id, user_id: userId, status: from }, data: { status: to } });
  });
  it.each([["COMPLETED", "VIEWED"], ["COMPLETED", "DISMISSED"], ["DISMISSED", "VIEWED"], ["DISMISSED", "COMPLETED"]])("rejects %s -> %s without a write", async (from, to) => {
    row.status = from; const original = { ...row };
    expect((await patch(to)).status).toBe(400);
    expect(row).toEqual(original); expect(mocks.updateMany).not.toHaveBeenCalled();
  });
  it.each(["VIEWED", "COMPLETED", "DISMISSED"])("repeating %s is a successful no-op", async status => {
    expect((await patch(status)).status).toBe(200);
    const original = { ...row }; mocks.updateMany.mockClear();
    expect((await patch(status)).status).toBe(200);
    expect(row).toEqual(original); expect(mocks.updateMany).not.toHaveBeenCalled();
  });
  it("allows only one of competing terminal actions to commit", async () => {
    const results = await Promise.all([patch("COMPLETED"), patch("DISMISSED")]);
    expect(results.map(result => result.status).sort()).toEqual([200, 400]);
    expect(row.status).toBe("COMPLETED");
    expect((await patch("DISMISSED")).status).toBe(400);
    expect(row.status).toBe("COMPLETED");
  });
  it("rejects a stale expected status without overwriting the winner", async () => {
    mocks.updateMany.mockImplementationOnce(async () => { row.status = "DISMISSED"; return { count: 0 }; });
    expect((await patch("COMPLETED")).status).toBe(400);
    expect(row.status).toBe("DISMISSED");
  });
  it("preserves ownership protection", async () => {
    mocks.user.mockResolvedValue(id);
    expect((await patch("COMPLETED")).status).toBe(404);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
  it("cannot reset a recommendation to NEW", async () => {
    expect((await patch("NEW")).status).toBe(400);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});
