import { geminiEnvironmentSummary } from "./gemini-env";
import assert from "node:assert/strict";
import { generateCoaching } from "../lib/gemini";

// One provider call using invented demo context; no database or user records.
try {
  console.log("Gemini environment", geminiEnvironmentSummary());
  const response = await generateCoaching({
    message:
      "Give one short budgeting tip for this synthetic demo. Do not calculate anything.",
    language: "banglish",
    context: {
      purpose: "synthetic_integration_test",
      currency: "BDT",
      noUserRecords: true,
    },
  });
  assert.ok(response.message.length > 0);
  assert.ok(response.recommendations.length <= 3);
  console.log(
    "Live Gemini SDK check passed: validated structured response, no user data sent",
  );
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Gemini verification failed",
  );
  process.exitCode = 1;
}
