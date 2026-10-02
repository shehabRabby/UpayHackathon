import "server-only";
import { GoogleGenAI, type Fetch, type HttpOptions } from "@google/genai";
import { ApiError } from "./api";

export const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com";
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
export const GEMINI_TOTAL_TIMEOUT_MS = 45_000;
export const geminiHttpOptions: HttpOptions = {
  baseUrl: GEMINI_ENDPOINT,
  timeout: 30_000,
  // One retry for transient HTTP errors. Do not retry invalid credentials or
  // free-tier quota errors. The overall abort signal bounds both attempts.
  retryOptions: {
    attempts: 2,
    initialDelay: 1,
    maxDelay: 1,
    jitter: 0,
    httpStatusCodes: [408, 500, 502, 503, 504],
  },
};

export function assertGeminiConfigured() {
  const key =
    process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  // Both authorization (AQ.Ab...) and standard keys use x-goog-api-key.
  if (!key || /^(your_|replace_|placeholder)/i.test(key)) {
    throw new ApiError(
      500,
      "Set a valid server-side GEMINI_API_KEY or GOOGLE_API_KEY to use AI coaching",
    );
  }
  return key;
}

export function createGeminiClient(fetch?: Fetch, options: { singleAttempt?: boolean } = {}) {
  const apiKey = assertGeminiConfigured();
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  if (!/^[a-zA-Z0-9._-]+$/.test(model))
    throw new ApiError(500, "GEMINI_MODEL must be a Gemini model ID");
  // Project association is carried by the key. Pin the official Gemini endpoint
  // and backend so ambient Cloud/base-URL variables cannot redirect credentials.
  const ai = new GoogleGenAI({
    apiKey,
    vertexai: false,
    apiVersion: "v1beta",
    httpOptions: { ...geminiHttpOptions,
      ...(options.singleAttempt ? { retryOptions: { ...geminiHttpOptions.retryOptions, attempts: 1 } } : {}),
      ...(fetch ? { fetch } : {}) },
  });
  return {
    ai,
    model,
    abortSignal: AbortSignal.timeout(GEMINI_TOTAL_TIMEOUT_MS),
  };
}
