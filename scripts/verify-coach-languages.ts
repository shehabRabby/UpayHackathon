import "./gemini-env";
import { generateCoaching, type CoachLanguage } from "../lib/gemini";
// One application call per language, each using the existing bounded strategy.
// No database, account IDs, chat history, or actual financial data are used.
const requested = process.argv.slice(2);
const languages = requested.length ? requested : ["en", "bn", "banglish"];
if (languages.some(value => !["en", "bn", "banglish"].includes(value))) throw new Error("Use en, bn, or banglish only");
for (const language of languages as CoachLanguage[]) {
  try {
    const answer = await generateCoaching({ language,
      message: "Using these synthetic backend metrics, explain the requiredMonthlySaving and give three practical spending suggestions. Do not calculate anything.",
      context: { currency: "BDT", averageMonthlyIncome: 50000, averageMonthlyExpenses: 30000,
        selectedGoal: { targetAmount: 40000, currentAmount: 10000, remainingAmount: 30000, requiredMonthlySaving: 5000 }, synthetic: true } });
    const bengaliScript = /[\u0980-\u09ff]/u.test(answer.message);
    const scriptMatches = language === "bn" ? bengaliScript : !bengaliScript;
    console.log("Coach language verification", { language, passed: scriptMatches,
      bengaliScript, recommendations: answer.recommendations.length });
    if (!scriptMatches) { process.exitCode = 1; break; }
  } catch {
    console.error("Coach language verification", { language, passed: false });
    process.exitCode = 1;
    // Stop on failure rather than repeatedly hitting an unavailable provider.
    break;
  }
}
