import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGeminiClient, DEFAULT_GEMINI_MODEL } from "@/lib/gemini-client";

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "AQ.Ab.synthetic-test-credential");
  vi.stubEnv("GEMINI_MODEL", "");
});
afterEach(() => vi.unstubAllEnvs());
const ok = () =>
  Response.json({
    candidates: [{ content: { role: "model", parts: [{ text: "OK" }] } }],
  });
const failed = (status: number) =>
  Response.json(
    { error: { code: status, message: "Synthetic provider failure" } },
    { status },
  );

describe("Real Gemini SDK transport (no network)", () => {
  it("selects Flash-Lite by default and preserves an explicit model override", () => {
    expect(createGeminiClient().model).toBe("gemini-3.5-flash-lite");
    vi.stubEnv("GEMINI_MODEL", "synthetic-test-model");
    expect(createGeminiClient().model).toBe("synthetic-test-model");
  });
  it("makes only one HTTP attempt in quota-safe verification mode", async () => {
    const transport = vi.fn().mockResolvedValue(failed(503));
    const { ai, model, abortSignal } = createGeminiClient(transport, { singleAttempt: true });
    await expect(ai.models.generateContent({ model, contents: "Synthetic", config: { abortSignal } })).rejects.toMatchObject({ status: 503 });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("retries HTTP 504 once and keeps auth keys on the official endpoint", async () => {
    vi.stubEnv("GOOGLE_GEMINI_BASE_URL", "https://unexpected.example");
    vi.stubEnv("GOOGLE_GENAI_USE_VERTEXAI", "true");
    const transport = vi
      .fn()
      .mockResolvedValueOnce(failed(504))
      .mockResolvedValueOnce(ok());
    const { ai, model, abortSignal } = createGeminiClient(transport);
    const response = await ai.models.generateContent({
      model,
      contents: "Synthetic test",
      config: { abortSignal },
    });
    expect(response.text).toBe("OK");
    expect(transport).toHaveBeenCalledTimes(2);
    expect(String(transport.mock.calls[0][0])).toBe(
      `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_GEMINI_MODEL}:generateContent`,
    );
    expect(
      new Headers(transport.mock.calls[0][1].headers).get("x-goog-api-key"),
    ).toBe("AQ.Ab.synthetic-test-credential");
  });
  it.each([403, 429])(
    "does not retry permission/quota status %s",
    async (status) => {
      const transport = vi.fn().mockResolvedValue(failed(status));
      const { ai, model, abortSignal } = createGeminiClient(transport);
      await expect(
        ai.models.generateContent({
          model,
          contents: "Synthetic test",
          config: { abortSignal },
        }),
      ).rejects.toMatchObject({ status });
      expect(transport).toHaveBeenCalledTimes(1);
    },
  );
  it("stops after two transient HTTP failures", async () => {
    const transport = vi.fn().mockImplementation(async () => failed(504));
    const { ai, model, abortSignal } = createGeminiClient(transport);
    await expect(
      ai.models.generateContent({
        model,
        contents: "Synthetic test",
        config: { abortSignal },
      }),
    ).rejects.toMatchObject({ status: 504 });
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it("rejects a malformed model before calling the SDK", () => {
    vi.stubEnv("GEMINI_MODEL", "https://unexpected.example/model");
    expect(() => createGeminiClient()).toThrow(
      "GEMINI_MODEL must be a Gemini model ID",
    );
  });
});
