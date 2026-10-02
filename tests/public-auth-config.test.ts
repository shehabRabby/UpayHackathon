import { afterEach, describe, expect, it, vi } from "vitest";
import { publicAuthConfig } from "@/lib/public-auth-config";
afterEach(() => vi.unstubAllEnvs());
describe("Public credential boundary", () => {
  it("returns only URL and publishable key", () => {
    vi.stubEnv("SUPBASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPBASE_PUBLISHABLE_KEY", "sb_publishable_synthetic");
    vi.stubEnv("GEMINI_API_KEY", "synthetic-private");
    expect(publicAuthConfig()).toEqual({
      url: "https://example.supabase.co",
      key: "sb_publishable_synthetic",
    });
  });
  it.each([
    "sb_secret_synthetic",
    `header.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.signature`,
    "invalid-key",
  ])("refuses unsafe or invalid public credentials", (key) => {
    vi.stubEnv("SUPBASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPBASE_PUBLISHABLE_KEY", key);
    expect(publicAuthConfig()).toBeNull();
  });
});
