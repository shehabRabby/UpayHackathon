import { ApiError } from "./api";
import { coachDiagnostic } from "./coach-diagnostics";

// Includes Bengali letters, combining marks, digits and punctuation.
const bengaliBlock = /[\u0980-\u09ff]/u;
export function assertCoachLanguage(answer: { message: string; recommendations: { recommendationText: string }[] }, language: string) {
  if (language !== "banglish") return;
  if (bengaliBlock.test(answer.message) || answer.recommendations.some(item => bengaliBlock.test(item.recommendationText))) {
    coachDiagnostic("response", { category: "banglish_script", language: "banglish" });
    // Reject locally: no lossy replacement/transliteration and no extra API call.
    throw new ApiError(500, "AI response did not meet Banglish Latin-script requirements; no response was saved. Please try again later.");
  }
}
