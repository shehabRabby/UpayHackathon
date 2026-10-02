// Only fixed classifications and numeric HTTP statuses may enter logs.
export function providerFailure(error: unknown, aborted = false) {
  const value = error as { status?: unknown; name?: unknown; message?: unknown; cause?: { code?: unknown } } | null;
  const status = typeof value?.status === "number" && Number.isInteger(value.status) ? value.status : undefined;
  const timeout = aborted || value?.name === "AbortError" || value?.name === "TimeoutError";
  return { status, category: timeout ? "timeout" : status === 429 ? "rate_limit" : status && status >= 500 ? "upstream_5xx" : status ? "provider_http" : value?.name === "SyntaxError" ? "provider_response_json" : "transport_or_sdk",
    networkFailure: value?.cause?.code === "ENOTFOUND" || value?.cause?.code === "ECONNRESET" || value?.cause?.code === "ETIMEDOUT",
  };
}
export function coachDiagnostic(stage: string, fields: { category?: string; status?: number; language?: string; elapsedMs?: number; networkFailure?: boolean } = {}) {
  console.error("Coach diagnostic", { stage, ...fields });
}
