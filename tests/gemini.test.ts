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
  it.each([
    { message: "Ei calculation recorded data er upor ভিত্তি kore.", recommendations: [] },
    { message: "আপনার লক্ষ্য", recommendations: [] },
    { message: "Valid Banglish", recommendations: [{ recommendationType: "BUDGET", recommendationText: "খরচ দেখুন", priority: "LOW" }] },
  ])("rejects Bengali leakage without regenerating or changing output", async answer => {
    mocks.generateContent.mockResolvedValue({ text: JSON.stringify(answer) });
    await expect(generateCoaching({ message: "Synthetic", language: "banglish", context: {} })).rejects.toMatchObject({ status: 500, message: expect.stringContaining("Banglish Latin-script requirements") });
    expect(mocks.generateContent).toHaveBeenCalledTimes(1);
  });
  it.each([
    ["en", "Review your spending", "English"],
    ["bn", "আপনার খরচ পর্যালোচনা করুন।", "Bangla using Bengali script"],
    ["banglish", "Apnar khoroch porjalochona korun.", "Banglish (Bangla transliterated into Latin script)"],
  ] as const)("preserves %s text and recommendations through JSON validation", async (language, message, instruction) => {
    const answer = { message, recommendations: [{ recommendationType: "BUDGET", recommendationText: message, priority: "LOW" }] };
    mocks.generateContent.mockResolvedValue({ text: JSON.stringify(answer) });
    expect(await generateCoaching({ message, language, context: {} })).toEqual(answer);
    expect(mocks.generateContent.mock.calls[0][0].config.systemInstruction).toContain(instruction);
    if (language === "banglish") expect(mocks.generateContent.mock.calls[0][0].config.systemInstruction).toContain("Both message and recommendationText must use Latin script; never Bengali script");
  });
  it.each([500, 502, 503])("classifies upstream %s without leaking response data", async status => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.generateContent.mockRejectedValue({ status, message: "private prompt and credential" });
    await expect(generateCoaching({ message: "Private", language: "bn", context: {} })).rejects.toMatchObject({ message: "AI service is temporarily busy or unavailable; please try again later" });
    expect(log).toHaveBeenCalledWith("Coach diagnostic", expect.objectContaining({ status, category: "upstream_5xx" }));
    expect(JSON.stringify(log.mock.calls)).not.toContain("private prompt");
    log.mockRestore();
  });
  it("classifies local timeout", async () => {
    mocks.generateContent.mockRejectedValue(new DOMException("private detail", "TimeoutError"));
    await expect(generateCoaching({ message: "Help", language: "banglish", context: {} })).rejects.toMatchObject({ message: "Gemini request timed out; please try again later" });
  });
  it.each([["bad JSON", "json_parse"], [JSON.stringify({ message: "", recommendations: [] }), "structured_schema"], [JSON.stringify({ message: "বাংলা", recommendations: [{ priority: "INVALID" }] }), "recommendation_schema"]])("distinguishes output failure %s", async (text, category) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.generateContent.mockResolvedValue({ text });
    await expect(generateCoaching({ message: "Help", language: "bn", context: {} })).rejects.toMatchObject({ status: 500 });
    expect(log).toHaveBeenCalledWith("Coach diagnostic", expect.objectContaining({ category }));
    log.mockRestore();
  });
  it("rejects unsupported language before transport", async () => {
    await expect(generateCoaching({ message: "Help", language: "fr" as "en", context: {} })).rejects.toMatchObject({ status: 400 });
    expect(mocks.generateContent).not.toHaveBeenCalled();
  });
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
