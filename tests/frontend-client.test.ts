import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, queryPath } from "@/lib/frontend/api-client";
import { syncProfile } from "@/lib/frontend/profile-sync";
import { transactionPayload, numeric } from "@/lib/frontend/forms";
import { transactionCreate, transactionPatch } from "@/lib/validation";
import type { Session } from "@supabase/supabase-js";
afterEach(() => vi.unstubAllGlobals());
const envelope = (data: unknown) =>
  Response.json({ success: true, message: "OK", data });
describe("Browser API contracts", () => {
  it("sends same-origin JSON with the current bearer token and parses the envelope", async () => {
    const transport = vi.fn().mockResolvedValue(envelope({ goalId: "test" }));
    vi.stubGlobal("fetch", transport);
    expect(
      (
        await apiRequest("/goals", {
          method: "POST",
          token: "synthetic-token",
          body: { goalName: "Test" },
        })
      ).data,
    ).toEqual({ goalId: "test" });
    expect(transport.mock.calls[0][0]).toBe("/api/v1/goals");
    expect(transport.mock.calls[0][1]).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer synthetic-token",
        "Content-Type": "application/json",
      },
      body: '{"goalName":"Test"}',
    });
  });
  it.each([400, 401, 403, 404, 409, 422, 429, 500, 504])(
    "preserves HTTP %s error envelopes without retries",
    async (status) => {
      const transport = vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { success: false, message: "Safe error", data: null },
            { status },
          ),
        );
      vi.stubGlobal("fetch", transport);
      await expect(apiRequest("/goals")).rejects.toMatchObject({
        status,
        message: "Safe error",
      });
      expect(transport).toHaveBeenCalledTimes(1);
    },
  );
  it("safely handles non-JSON gateway responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("private gateway stack", { status: 502 }),
        ),
    );
    await expect(apiRequest("/goals")).rejects.toMatchObject({
      message: "The server returned an unreadable response. Please try again.",
      status: 502,
    });
  });
  it("does not expose raw network errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("secret-token connection details")),
    );
    await expect(apiRequest("/goals")).rejects.toMatchObject({
      message: "Cannot connect. Check your connection and try again.",
    });
  });
  it("rejects external URLs without transmitting tokens", async () => {
    const transport = vi.fn();
    vi.stubGlobal("fetch", transport);
    await expect(
      apiRequest("//other.example", { token: "synthetic-token" }),
    ).rejects.toThrow("Invalid API path");
    expect(transport).not.toHaveBeenCalled();
  });
  it("encodes filters and omits empty options", () => {
    expect(
      queryPath("/transactions", {
        search: "food & travel",
        category: "",
        page: 2,
      }),
    ).toBe("/transactions?search=food+%26+travel&page=2");
  });
});
describe("Profile synchronization", () => {
  const session = {
    access_token: "synthetic-token",
    user: {
      id: "verified-id",
      email: "demo@example.test",
      user_metadata: { full_name: "New name" },
    },
  } as unknown as Session;
  it("reads an existing profile without overwriting user preferences", async () => {
    const transport = vi
      .fn()
      .mockResolvedValue(
        envelope({ fullName: "Existing name", preferredLanguage: "en" }),
      );
    vi.stubGlobal("fetch", transport);
    expect(await syncProfile(session)).toMatchObject({
      fullName: "Existing name",
      preferredLanguage: "en",
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("creates only a missing profile through the owner-verified endpoint", async () => {
    const transport = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          { success: false, message: "Missing profile", data: null },
          { status: 403 },
        ),
      )
      .mockResolvedValueOnce(envelope({ fullName: "New name" }));
    vi.stubGlobal("fetch", transport);
    await syncProfile(session);
    expect(JSON.parse(transport.mock.calls[1][1].body)).toEqual({
      fullName: "New name",
      preferredLanguage: "bn-BD",
    });
  });
  it("does not turn database/service failures into profile writes", async () => {
    const transport = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { success: false, message: "Service unavailable", data: null },
          { status: 500 },
        ),
      );
    vi.stubGlobal("fetch", transport);
    await expect(syncProfile(session)).rejects.toMatchObject({ status: 500 });
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
describe("Transaction form serialization", () => {
  function form() {
    const fields = new FormData();
    for (const [key, value] of Object.entries({
      categoryId: "00000000-0000-4000-8000-000000000001",
      transactionType: "CASH_IN",
      amount: "120.50",
      transactionDate: "2026-10-02",
      merchantName: "",
      description: "Test income",
    }))
      fields.set(key, value);
    return fields;
  }
  it("produces an accepted creation body with manual source and nullable merchant", () => {
    const body = transactionPayload(form(), false);
    expect(transactionCreate.safeParse(body).success).toBe(true);
    expect(body).toMatchObject({
      amount: 120.5,
      merchantName: null,
      source: "manual",
    });
  });
  it("preserves date-time edits and omits immutable source", () => {
    const fields = form();
    fields.set("transactionDate", "2026-10-02T10:30");
    const body = transactionPayload(fields, true);
    expect(transactionPatch.safeParse(body).success).toBe(true);
    expect(body).not.toHaveProperty("source");
  });
  it("rejects empty numeric fields instead of silently sending zero", () => {
    expect(() => numeric(new FormData(), "amount")).toThrow(
      "Enter a valid number",
    );
  });
});
