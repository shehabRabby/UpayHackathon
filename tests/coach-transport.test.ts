import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateCoaching } from "@/lib/gemini";
const response = (message: string) => Response.json({ candidates: [{ finishReason: "STOP", content: { role: "model", parts: [{ text: JSON.stringify({ message, recommendations: [{ recommendationType: "BUDGET", recommendationText: message, priority: "LOW" }] }) }] } }] });
beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "synthetic-test-key");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe("Actual SDK multilingual coaching transport", () => {
  it.each([["en", "Review spending."], ["bn", "আপনার খরচ পর্যালোচনা করুন।"], ["banglish", "Apnar khoroch porjalochona korun."]] as const)("round-trips %s through UTF-8 SDK JSON and schema", async (language, message) => {
    const transport = vi.fn().mockResolvedValue(response(message));
    const answer = await generateCoaching({ message, language, context: { synthetic: true } }, transport);
    expect(answer.message).toBe(message);
    expect(answer.recommendations[0].recommendationText).toBe(message);
    const body = JSON.parse(transport.mock.calls[0][1].body);
    expect(JSON.parse(body.contents[0].parts[0].text).userMessage).toBe(message);
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("recovers from one 503 without changing the multilingual payload", async () => {
    const transport = vi.fn().mockResolvedValueOnce(Response.json({ error: { code: 503, message: "Synthetic busy" } }, { status: 503 })).mockResolvedValueOnce(response("বাংলা পরামর্শ"));
    expect((await generateCoaching({ message: "সাহায্য করুন", language: "bn", context: {} }, transport)).message).toBe("বাংলা পরামর্শ");
    expect(transport).toHaveBeenCalledTimes(2);
    expect(transport.mock.calls[0][1].body).toBe(transport.mock.calls[1][1].body);
  });
  it("preserves rate-limit classification and does not retry 429", async () => {
    const transport = vi.fn().mockResolvedValue(Response.json({ error: { code: 429, message: "Synthetic quota" } }, { status: 429 }));
    await expect(generateCoaching({ message: "Help", language: "banglish", context: {} }, transport)).rejects.toMatchObject({ message: "Gemini quota or rate limit reached; please try again later" });
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
