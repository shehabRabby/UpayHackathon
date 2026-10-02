import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
  constructor: vi.fn(),
}));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    constructor(options: unknown) {
      mocks.constructor(options);
    }
    models = { generateContent: mocks.generateContent };
  },
}));
import { generateCoaching } from "@/lib/gemini";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "test-server-key");
  vi.stubEnv("GOOGLE_API_KEY", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("Server-side Gemini", () => {
  it("uses project-bound authorization keys without switching to Vertex or OAuth", async () => {
    vi.stubEnv("GEMINI_API_KEY", " AQ.Ab.synthetic-test-credential ");
    vi.stubEnv("GOOGLE_GENAI_USE_VERTEXAI", "true");
    vi.stubEnv("GOOGLE_GENAI_USE_ENTERPRISE", "true");
    vi.stubEnv("GOOGLE_CLOUD_PROJECT", "gen-lang-client-0619208689");
    mocks.generateContent.mockResolvedValue({
      text: JSON.stringify({ message: "Guidance", recommendations: [] }),
    });
    await generateCoaching({ message: "Help", language: "en", context: {} });
    expect(mocks.constructor).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "AQ.Ab.synthetic-test-credential",
        vertexai: false,
      }),
    );
  });
  it("accepts GOOGLE_API_KEY when GEMINI_API_KEY is absent", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GOOGLE_API_KEY", "AQ.Ab.synthetic-test-credential");
    mocks.generateContent.mockResolvedValue({
      text: JSON.stringify({ message: "Guidance", recommendations: [] }),
    });
    await generateCoaching({ message: "Help", language: "en", context: {} });
    expect(mocks.constructor).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "AQ.Ab.synthetic-test-credential",
        vertexai: false,
      }),
    );
  });
  it.each(["bn", "banglish", "en"] as const)(
    "requests %s and validates a structured response",
    async (language) => {
      mocks.generateContent.mockResolvedValue({
        text: JSON.stringify({
          message: "Budget guidance",
          recommendations: [],
        }),
      });
      expect(
        await generateCoaching({
          message: "Help",
          language,
          context: { income: 100 },
        }),
      ).toEqual({ message: "Budget guidance", recommendations: [] });
      const args = mocks.generateContent.mock.calls[0][0];
      expect(args.config.systemInstruction).toContain(
        "Never perform arithmetic",
      );
      expect(args.config.responseMimeType).toBe("application/json");
      expect(mocks.constructor.mock.calls[0][0].httpOptions.timeout).toBe(
        30000,
      );
      expect(args.contents[0].parts[0].text).not.toContain("test-server-key");
    },
  );
  it("rejects a placeholder key before making a network call", async () => {
    vi.stubEnv("GEMINI_API_KEY", "your_gemini_api_key");
    await expect(
      generateCoaching({ message: "Help", language: "en", context: {} }),
    ).rejects.toMatchObject({ status: 500 });
    expect(mocks.generateContent).not.toHaveBeenCalled();
  });
  it("sanitizes provider errors without leaking keys or prompts", async () => {
    mocks.generateContent.mockRejectedValue(
      new Error("secret-key sensitive context"),
    );
    await expect(
      generateCoaching({ message: "Help", language: "en", context: {} }),
    ).rejects.toMatchObject({
      status: 500,
      message: "AI service is unavailable; please try again later",
    });
  });
  it.each([
    [404, "Configured Gemini model is unavailable; check GEMINI_MODEL"],
    [
      403,
      "Gemini access denied; check the key's bound service account permissions, Generative Language API access, and key restrictions in its Google Cloud project",
    ],
    [429, "Gemini quota or rate limit reached; please try again later"],
    [504, "Gemini request timed out; please try again later"],
  ])(
    "maps provider status %s to a safe server error",
    async (status, message) => {
      mocks.generateContent.mockRejectedValue({ status });
      await expect(
        generateCoaching({ message: "Help", language: "en", context: {} }),
      ).rejects.toMatchObject({ status: 500, message });
    },
  );
  it.each([
    "not-json",
    JSON.stringify({ message: "", recommendations: [] }),
    JSON.stringify({ message: "Hi", recommendations: [{ priority: "ADMIN" }] }),
  ])("rejects invalid provider output", async (text) => {
    mocks.generateContent.mockResolvedValue({ text });
    await expect(
      generateCoaching({ message: "Help", language: "en", context: {} }),
    ).rejects.toMatchObject({ status: 500 });
  });
});
