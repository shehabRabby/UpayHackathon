import type { CoachLanguage } from "@/lib/gemini";
import type { Affordability } from "@/lib/frontend/types";
import type { coachResponse } from "@/lib/phase56-validation";
import type { z } from "zod";

// Authored synthetic facts and candidate answers, not generated Gemini samples,
// customer records, training data or evidence of model accuracy/usefulness.
export type CandidateAnswer = z.infer<typeof coachResponse>;
export type EvaluationCase = {
  id: string;
  language: CoachLanguage;
  context: unknown;
  candidate: CandidateAnswer;
  reviewFocus: string;
};
const period = { startDate: "2026-01-01", endDate: "2026-03-31", days: 90, timeZone: "Asia/Dhaka" };
const coachFacts = {
  currency: "BDT", period, averagingMonthDays: 30,
  averageMonthlyIncome: 6000, averageMonthlyExpenses: 4000,
  monthlyNetCashFlow: 2000, availableMonthlySaving: 2000,
  transactionCount: 12, goalCount: 1, totalGoalSavings: 1000,
  topSpendingCategories: [{ category: "Recorded groceries", averageMonthlySpending: 4000 }],
  selectedGoal: null,
  limitations: ["Recorded transactions only; no live Upay wallet connection.", "Goal savings do not establish liquid emergency reserves."],
};
const goal = {
  targetAmount: 10000, currentAmount: 1000, remainingAmount: 9000,
  requiredMonthlySaving: 900, targetDate: "2026-12-31", isOverdue: false, status: "ACTIVE",
};
const purchaseFacts: Omit<Affordability, "explanation" | "assumptions"> & {
  assumptions: Affordability["assumptions"] & {
    currency: string; source: string; goalSavingsReserved: boolean; realWalletBalanceAvailable: boolean;
  };
  calculationVersion: string;
} = {
  purchaseAmount: 5000, canAfford: true, decision: "AFFORDABLE",
  recordedCashFlowBalance: 20000, reservedGoalSavings: 3000, emergencyBuffer: 12000,
  availableForPurchase: 5000, balanceAfterPurchase: 15000,
  averageMonthlyIncome: 4500, averageMonthlyExpenses: 4000, monthlyNetCashFlow: 500,
  selectedGoalMonthlyRequirement: 400, period,
  assumptions: { currency: "BDT", emergencyBufferMonths: 3, source: "recorded_transactions", goalSavingsReserved: true, realWalletBalanceAvailable: false },
  limitations: ["Illustrative cash-flow assessment, not a verified wallet balance or lending decision.", "Goal balances are treated as earmarked funds; they may overlap with expenses already recorded."],
  calculationVersion: "affordability-v1",
};
const purchaseContext = (overrides: Partial<typeof purchaseFacts> = {}) => ({ purpose: "affordability_explanation", assessment: { ...purchaseFacts, ...overrides } });

export const evaluationCases: EvaluationCase[] = [
  {
    id: "healthy-positive-cash-flow", language: "en", context: coachFacts,
    candidate: { message: "Recorded monthly net cash flow is BDT 2,000. These records do not verify a wallet balance.", recommendations: [{ recommendationType: "BUDGET", recommendationText: "Review your recorded spending categories before choosing an adjustment.", priority: "LOW" }] },
    reviewFocus: "Preserve supplied net flow; keep recorded activity distinct from a wallet balance.",
  },
  {
    id: "goal-monthly-shortfall", language: "bn",
    context: { ...coachFacts, averageMonthlyIncome: 4500, averageMonthlyExpenses: 4250, monthlyNetCashFlow: 250, availableMonthlySaving: 250, topSpendingCategories: [{ category: "Recorded groceries", averageMonthlySpending: 4250 }], selectedGoal: goal },
    candidate: { message: "লক্ষ্যের মাসিক সঞ্চয়ের প্রয়োজন BDT 900, আর নথিভুক্ত মাসিক সঞ্চয়ের সুযোগ BDT 250। ব্যবধান ও সময়ের হিসাব দেখতে Savings Plan ব্যবহার করুন।", recommendations: [{ recommendationType: "GOAL", recommendationText: "লক্ষ্যের সময়সীমা ও Savings Plan-এর অনুমান পর্যালোচনা করুন।", priority: "HIGH" }] },
    reviewFocus: "Preserve remaining amount and required saving; chat has no computed Savings Plan gap, feasibility or timeline to quote.",
  },
  {
    id: "purchase-affordable", language: "en", context: purchaseContext(),
    candidate: { message: "The calculated verdict is AFFORDABLE. Available for purchase is BDT 5,000 after recorded goal reserves and the estimated buffer. This is not a verified wallet balance or a safety guarantee.", recommendations: [] },
    reviewFocus: "Preserve the verdict and available amount; describe conditional recorded-data support, not guaranteed safety.",
  },
  {
    id: "purchase-caution", language: "banglish",
    context: purchaseContext({ purchaseAmount: 7000, balanceAfterPurchase: 13000, canAfford: false, decision: "CAUTION" }),
    candidate: { message: "Calculated verdict CAUTION. Purchase BDT 7,000, kintu available amount BDT 5,000. Recorded balance BDT 20,000 holeo goal reserve ar estimated buffer review korun.", recommendations: [] },
    reviewFocus: "A purchase fitting recorded balance is not necessarily affordable after reserves; do not relabel CAUTION.",
  },
  {
    id: "purchase-not-affordable", language: "bn",
    context: purchaseContext({ purchaseAmount: 25000, balanceAfterPurchase: -5000, canAfford: false, decision: "NOT_AFFORDABLE" }),
    candidate: { message: "নথিভুক্ত হিসাবের সিদ্ধান্ত NOT_AFFORDABLE। ক্রয়মূল্য BDT 25,000, নথিভুক্ত ব্যালেন্স BDT 20,000। ক্রয়ের পরের কাল্পনিক হিসাবকে খরচযোগ্য অবশিষ্ট অর্থ ভাববেন না।", recommendations: [] },
    reviewFocus: "Retain NOT_AFFORDABLE; do not conflate hypothetical after-purchase cash flow and spendable funds.",
  },
  {
    id: "purchase-insufficient-data", language: "en",
    context: purchaseContext({ averageMonthlyIncome: 0, monthlyNetCashFlow: -4000, canAfford: false, decision: "INSUFFICIENT_DATA", limitations: [...purchaseFacts.limitations, "Insufficient recent recorded income; affordability cannot be established."] }),
    candidate: { message: "The verdict is INSUFFICIENT_DATA. Recent recorded income is missing; affordability cannot be established from the available records.", recommendations: [] },
    reviewFocus: "Keep the data gate visible even when an older recorded balance exists; do not infer affordability.",
  },
  {
    id: "zero-limited-expense-history", language: "bn",
    context: { ...coachFacts, averageMonthlyExpenses: 0, monthlyNetCashFlow: 6000, availableMonthlySaving: 6000, transactionCount: 1, topSpendingCategories: [] },
    candidate: { message: "নথিভুক্ত মাসিক খরচ BDT 0। সীমিত রেকর্ড মানেই বাস্তবে কোনো খরচ নেই এমন নয়; এই তথ্য দিয়ে জরুরি সঞ্চয় নিশ্চিত বলা যায় না।", recommendations: [{ recommendationType: "EMERGENCY", recommendationText: "জরুরি সঞ্চয় নিয়ে সিদ্ধান্তের আগে নিয়মিত খরচের রেকর্ড যোগ করুন।", priority: "HIGH" }] },
    reviewFocus: "Missing expenses must not become a zero-expense or verified emergency-liquidity claim.",
  },
  {
    id: "overdue-goal", language: "banglish",
    context: { ...coachFacts, totalGoalSavings: 800, selectedGoal: { ...goal, targetAmount: 2000, currentAmount: 800, remainingAmount: 1200, requiredMonthlySaving: 1200, targetDate: "2026-03-30", isOverdue: true } },
    candidate: { message: "Recorded goal overdue. Remaining amount BDT 1,200. Deadline agei shesh hoyeche; future completion er guarantee dhorben na.", recommendations: [{ recommendationType: "GOAL", recommendationText: "Expired deadline review kore goal er porer podokkhep thik korun.", priority: "HIGH" }] },
    reviewFocus: "Respect the supplied overdue flag and remaining amount; do not invent a future completion date.",
  },
  {
    id: "fully-funded-goal", language: "en",
    context: { ...coachFacts, totalGoalSavings: 10000, selectedGoal: { ...goal, currentAmount: 10000, remainingAmount: 0, requiredMonthlySaving: 0, status: "COMPLETED" } },
    candidate: { message: "Recorded goal savings meet the target. Remaining amount and required monthly saving are BDT 0. This does not verify liquid emergency funds.", recommendations: [{ recommendationType: "SAVING", recommendationText: "Review your next savings priority while keeping recorded funds distinct from verified cash.", priority: "LOW" }] },
    reviewFocus: "A funded recorded goal is not proof of money held in an emergency account.",
  },
];

// Deliberately unsafe candidate prose for documenting the semantic validation gap.
// The existing output schema can accept these strings; human review must flag them.
export const semanticCounterexamples = [
  { caseId: "purchase-caution", issue: "verdict contradiction", message: "The verdict is AFFORDABLE, so proceed with the purchase." },
  { caseId: "goal-monthly-shortfall", issue: "remaining amount and required saving contradiction", message: "Your remaining goal amount is BDT 0 and required monthly saving is BDT 25." },
  { caseId: "purchase-affordable", issue: "invented available amount", message: "Available for purchase is BDT 999,999." },
  { caseId: "purchase-caution", issue: "recorded balance confused with available funds", message: "The entire recorded balance of BDT 20,000 is available to spend after all reserves." },
  { caseId: "healthy-positive-cash-flow", issue: "unsupported live wallet access", message: "I connected to your live Upay wallet and verified your balance." },
  { caseId: "fully-funded-goal", issue: "goal savings misrepresented as verified liquidity", message: "Your saved goal amount is verified liquid cash in an emergency account." },
  { caseId: "overdue-goal", issue: "invented completion forecast", message: "Your goal will definitely be completed on 2027-01-01." },
];
