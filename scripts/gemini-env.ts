import { config, parse } from "dotenv";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Resolve from the script, not the caller's working directory. Preserve explicit
// process environment overrides, just as dotenv/config did previously.
const envPath = fileURLToPath(new URL("../.env", import.meta.url));
config({ path: envPath, quiet: true });

export function geminiEnvironmentSummary() {
  let fileEnv: Record<string, string> = {};
  try {
    fileEnv = parse(readFileSync(envPath));
  } catch {
    /* environment-only deployments */
  }
  const source = process.env.GEMINI_API_KEY?.trim()
    ? "GEMINI_API_KEY"
    : "GOOGLE_API_KEY";
  const key = process.env[source]?.trim();
  return {
    keyVariable: source,
    keyPresent: Boolean(key),
    matchesDotEnv: Boolean(key && key === fileEnv[source]?.trim()),
    proxyEnvironmentPresent: [
      "HTTP_PROXY",
      "HTTPS_PROXY",
      "ALL_PROXY",
      "NODE_USE_ENV_PROXY",
    ].some((name) => Boolean(process.env[name])),
    baseUrlOverridePresent: Boolean(process.env.GOOGLE_GEMINI_BASE_URL),
    // Never print keys, lengths, prefixes, proxy URLs, or other .env contents.
  };
}
