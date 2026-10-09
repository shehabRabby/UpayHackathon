import { describe, expect, it } from "vitest";
import { AI_REQUEST_LIMIT, AI_WINDOW_MS, createAiRateLimiter } from "@/lib/ai-rate-limit";
import { failure } from "@/lib/api";

describe("Process-local AI allowance", () => {
  it("allows six attempts, rejects the seventh and isolates verified identities", async () => {
    const limit = createAiRateLimiter(() => 0);
    for (let i = 0; i < AI_REQUEST_LIMIT; i++) limit("private-user-a");
    expect(() => limit("user-b")).not.toThrow();
    try { limit("private-user-a"); throw new Error("Expected rejection"); }
    catch (error) {
      const response = failure(error);
      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).toBe("60");
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      const payload = await response.json();
      expect(payload).toMatchObject({ success: false, data: null });
      expect(JSON.stringify(payload)).not.toContain("private-user-a");
    }
  });
  it("uses a rolling window and expires at the exact boundary", () => {
    let time = 0;
    const limit = createAiRateLimiter(() => time);
    limit("a");
    time = 10_000;
    for (let i = 1; i < AI_REQUEST_LIMIT; i++) limit("a");
    time = AI_WINDOW_MS - 1;
    expect(() => limit("a")).toThrow();
    time = AI_WINDOW_MS;
    expect(() => limit("a")).not.toThrow();
    expect(() => limit("a")).toThrow();
  });
  it("fails closed at capacity without evicting active identities, then cleans expired entries", () => {
    let time = 0;
    const limit = createAiRateLimiter(() => time, 1);
    limit("a");
    expect(() => limit("b")).toThrow();
    expect(() => limit("a")).not.toThrow();
    time = AI_WINDOW_MS;
    expect(() => limit("b")).not.toThrow();
  });
});
