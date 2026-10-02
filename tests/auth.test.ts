import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), createClient: vi.fn(), findUnique: vi.fn(), cookies: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.createClient }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/lib/prisma", () => ({ prisma: { users: { findUnique: mocks.findUnique } } }));
import { authenticatedUser, requireUser } from "@/lib/auth";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("SUPBASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPBASE_PUBLISHABLE_KEY", "test-publishable-key");
  mocks.createClient.mockReturnValue({ auth: { getUser: mocks.getUser } });
  mocks.cookies.mockResolvedValue({ getAll: () => [], set: vi.fn() });
});

describe("Verified authentication", () => {
  it("verifies the bearer token with Supabase before looking up a profile", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "verified-id" } }, error: null });
    mocks.findUnique.mockResolvedValue({ user_id: "verified-id" });
    const id = await requireUser(new Request("http://localhost", { headers: { authorization: "Bearer token" } }));
    expect(id).toBe("verified-id");
    expect(mocks.getUser).toHaveBeenCalledWith("token");
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { user_id: "verified-id" }, select: { user_id: true } });
  });
  it("rejects an invalid bearer session without querying the database", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { status: 401 } });
    await expect(requireUser(new Request("http://localhost", { headers: { authorization: "Bearer forged" } }))).rejects.toMatchObject({ status: 401 });
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
  it("rejects malformed Authorization headers", async () => {
    await expect(authenticatedUser(new Request("http://localhost", { headers: { authorization: "Basic abc" } }))).rejects.toMatchObject({ status: 401 });
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
  it("returns 403 if the authenticated user has not synced a profile", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "verified-id" } }, error: null });
    mocks.findUnique.mockResolvedValue(null);
    await expect(requireUser(new Request("http://localhost", { headers: { authorization: "Bearer token" } }))).rejects.toMatchObject({ status: 403 });
  });
  it("supports a verified SSR cookie session", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "cookie-user" } }, error: null });
    expect(await authenticatedUser(new Request("http://localhost"))).toEqual({ id: "cookie-user" });
    expect(mocks.cookies).toHaveBeenCalled();
    expect(mocks.getUser).toHaveBeenCalledWith();
  });
});
