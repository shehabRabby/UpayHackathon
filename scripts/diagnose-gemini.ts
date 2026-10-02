import { geminiEnvironmentSummary } from "./gemini-env";
import {
  createGeminiClient,
  GEMINI_ENDPOINT,
  GEMINI_TOTAL_TIMEOUT_MS,
  geminiHttpOptions,
} from "../lib/gemini-client";

// Print only allowlisted diagnostics, never raw provider errors or credentials.
const started = Date.now();
const attempts: { status: number; elapsedMs: number }[] = [];
try {
  const { ai, model, abortSignal } = createGeminiClient(async (input, init) => {
    const attemptStarted = Date.now();
    const response = await fetch(input, init);
    attempts.push({
      status: response.status,
      elapsedMs: Date.now() - attemptStarted,
    });
    return response;
  });
  console.log("Gemini configuration", {
    ...geminiEnvironmentSummary(),
    endpoint: GEMINI_ENDPOINT,
    model,
    timeoutMs: geminiHttpOptions.timeout,
    totalTimeoutMs: GEMINI_TOTAL_TIMEOUT_MS,
    maxAttempts: geminiHttpOptions.retryOptions?.attempts,
  });
  await ai.models.generateContent({
    model,
    contents: "Say OK. This is a synthetic authentication check.",
    config: { maxOutputTokens: 128, abortSignal },
  });
  console.log("Gemini authentication succeeded", {
    elapsedMs: Date.now() - started,
    attempts,
  });
} catch (error) {
  const message = error instanceof Error ? error.message : "";
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? error.status
      : undefined;
  const reasons = [...message.matchAll(/"reason"\s*:\s*"([A-Z_]+)"/g)].map(
    (match) => match[1],
  );
  console.error(
    JSON.stringify({
      status,
      elapsedMs: Date.now() - started,
      attempts,
      httpGatewayTimeout: status === 504,
      localTimeout:
        error instanceof Error &&
        ["AbortError", "TimeoutError"].includes(error.name),
      networkFailure:
        error instanceof TypeError && /fetch failed/i.test(message),
      reasons: [...new Set(reasons)],
      leakedKey: /reported as leaked|leaked key/i.test(message),
      disabledApi: /has not been used|is disabled|SERVICE_DISABLED/i.test(
        message,
      ),
      invalidKey: /API_KEY_INVALID|API key not valid/i.test(message),
      blockedKey: /blocked|revoked/i.test(message),
      insufficientPermissions: /permission|IAM_PERMISSION_DENIED/i.test(
        message,
      ),
      unregisteredCaller:
        /unregistered callers|without established identity/i.test(message),
      missingCredential: /missing.*credential|CREDENTIALS_MISSING/i.test(
        message,
      ),
      serviceAccountDisabled: /service account.*disabled/i.test(message),
      apiKeyServiceBlocked: /API_KEY_SERVICE_BLOCKED/i.test(message),
      permissionNames: [
        ...new Set(
          [
            ...message.matchAll(
              /\b(?:generativelanguage|serviceusage|aiplatform)\.[a-zA-Z.]+/g,
            ),
          ].map((match) => match[0]),
        ),
      ],
    }),
  );
  process.exitCode = 1;
}
