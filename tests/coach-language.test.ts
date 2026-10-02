import { afterEach, describe, expect, it, vi } from "vitest";
import { assertCoachLanguage } from "@/lib/coach-language";
afterEach(() => vi.restoreAllMocks());
const answer = (message: string, recommendationText = "Khoroch review korun.") => ({ message, recommendations: [{ recommendationText }] });
describe("Deterministic Banglish script contract", () => {
  it.each(["Apnar target achieve korte aro BDT 30,000 save korte hobe.", "BDT 30,000 by 2026-12-31.", "Ei calculation recorded data er upor vitti kore."])("accepts valid Latin text without modifying amounts or dates", text => {
    const value = answer(text), original = JSON.stringify(value);
    expect(() => assertCoachLanguage(value, "banglish")).not.toThrow();
    expect(JSON.stringify(value)).toBe(original);
  });
  it.each(["Ei calculation recorded data er upor ভিত্তি kore.", "আপনার সঞ্চয় লক্ষ্য পর্যালোচনা করুন।", "BDT ৩০,০০০", "Latin \u0980", "Latin \u09ff"])("rejects arbitrary Bengali block leakage", text => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => assertCoachLanguage(answer(text), "banglish")).toThrow("Banglish Latin-script requirements");
  });
  it("checks every recommendation and emits only sanitized diagnostics", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const value = { message: "Valid", recommendations: [{ recommendationText: "Valid" }, { recommendationText: "খরচ দেখুন" }] };
    expect(() => assertCoachLanguage(value, "banglish")).toThrow();
    expect(log).toHaveBeenCalledWith("Coach diagnostic", { stage: "response", category: "banglish_script", language: "banglish" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("খরচ");
  });
  it.each(["bn", "en"])("does not add restrictions to %s", language => {
    expect(() => assertCoachLanguage(answer("বাংলা", "বাংলা"), language)).not.toThrow();
  });
});
