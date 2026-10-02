import "./gemini-env";
import { generateCoaching, type CoachLanguage } from "../lib/gemini";
import { createGeminiClient, DEFAULT_GEMINI_MODEL } from "../lib/gemini-client";
const selectedModel = createGeminiClient().model;
if (selectedModel !== DEFAULT_GEMINI_MODEL) throw new Error("Verification model override differs from the intended primary model");
console.log("Verification model", { model: selectedModel, attemptsPerLanguage: 1 });
// At most one HTTP request per language; verification disables SDK retries.
// No database, account IDs, chat history, or actual financial data are used.
const requested = process.argv.slice(2);
const languages = requested.length ? requested : ["en", "bn", "banglish"];
if (languages.some(value => !["en", "bn", "banglish"].includes(value))) throw new Error("Use en, bn, or banglish only");
for (const language of languages as CoachLanguage[]) {
  try {
    const answer = await generateCoaching({ language,
      message: "Using these synthetic backend metrics, explain the requiredMonthlySaving and give three practical spending suggestions. Do not calculate anything.",
      context: { currency: "BDT", averageMonthlyIncome: 50000, averageMonthlyExpenses: 30000,
        selectedGoal: { targetAmount: 40000, currentAmount: 10000, remainingAmount: 30000, requiredMonthlySaving: 5000 }, synthetic: true } }, undefined, { singleAttempt: true });
    const bengaliScript = /[\u0980-\u09ff]/u.test(answer.message);
    const texts = [answer.message, ...answer.recommendations.map(item => item.recommendationText)];
    const scriptMatches = texts.every(text => language === "bn" ? /[\u0980-\u09ff]/u.test(text) : !/[\u0980-\u09ff]/u.test(text));
    console.log("Coach language verification", { language, passed: scriptMatches && answer.recommendations.length > 0,
      bengaliScript, recommendations: answer.recommendations.length });
    if (!scriptMatches || answer.recommendations.length === 0) { process.exitCode = 1; break; }
  } catch {
    console.error("Coach language verification", { language, passed: false });
    process.exitCode = 1;
    // Stop on failure rather than repeatedly hitting an unavailable provider.
    break;
  }
}
