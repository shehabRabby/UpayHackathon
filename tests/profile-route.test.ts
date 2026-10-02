import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ authenticatedUser: mocks.user }));
vi.mock("@/lib/prisma", () => ({
  prisma: { users: { findUnique: mocks.findUnique, upsert: mocks.upsert } },
}));
import { GET, POST } from "@/app/api/v1/auth/profile/route";
const id = "00000000-0000-4000-8000-000000000001";
const profile = {
  user_id: id,
  full_name: "Demo",
  email: "verified@example.test",
  phone: null,
  preferred_language: "en",
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id, email: profile.email });
});
describe("Verified profile ownership", () => {
  it("reads only the verified user's profile", async () => {
    mocks.findUnique.mockResolvedValue(profile);
    const response = await GET(
      new Request("http://localhost/api/v1/auth/profile?userId=another-user"),
    );
    expect(response.status).toBe(200);
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { user_id: id } });
    expect(await response.json()).toMatchObject({
      data: { userId: id, preferredLanguage: "en" },
    });
  });
  it("returns the missing-profile status consumed by synchronization", async () => {
    mocks.findUnique.mockResolvedValue(null);
    expect(
      (await GET(new Request("http://localhost/api/v1/auth/profile"))).status,
    ).toBe(403);
  });
  it("rejects user-ID/email injection in profile writes", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/auth/profile", {
        method: "POST",
        body: JSON.stringify({
          fullName: "Demo",
          userId: "another-user",
          email: "forged@example.test",
        }),
      }),
    );
    expect(response.status).toBe(400);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("takes ID/email exclusively from verified authentication when saving", async () => {
    mocks.upsert.mockResolvedValue(profile);
    const response = await POST(
      new Request("http://localhost/api/v1/auth/profile", {
        method: "POST",
        body: JSON.stringify({ fullName: "Demo", preferredLanguage: "en" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: id },
        create: expect.objectContaining({ user_id: id, email: profile.email }),
      }),
    );
  });
});
