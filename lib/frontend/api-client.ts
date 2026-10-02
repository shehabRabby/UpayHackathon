import type { Meta } from "./types";

export class ClientError extends Error {
  constructor(
    message: string,
    public status = 0,
    public issues: { path: (string | number)[]; message: string }[] = [],
  ) {
    super(message);
  }
}
export type ApiOptions = {
  token?: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
};
export type Envelope<T> = {
  success: true;
  message: string;
  data: T;
  meta?: Meta;
};
export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {},
): Promise<Envelope<T>> {
  if (!path.startsWith("/") || path.startsWith("//"))
    throw new ClientError("Invalid API path");
  const deadline = AbortSignal.timeout(options.timeoutMs ?? 20_000);
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method: options.method ?? "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      ...(options.body !== undefined
        ? { body: JSON.stringify(options.body) }
        : {}),
      signal: options.signal
        ? AbortSignal.any([options.signal, deadline])
        : deadline,
    });
  } catch {
    if (options.signal?.aborted)
      throw new DOMException("Request cancelled", "AbortError");
    throw new ClientError(
      deadline.aborted
        ? "The request took too long. Refresh the data before retrying a change."
        : "Cannot connect. Check your connection and try again.",
    );
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new ClientError(
      "The server returned an unreadable response. Please try again.",
      response.status,
    );
  }
  if (
    !payload ||
    typeof payload.success !== "boolean" ||
    typeof payload.message !== "string" ||
    !("data" in payload)
  ) {
    throw new ClientError(
      "The server returned an unexpected response.",
      response.status,
    );
  }
  if (!response.ok || !payload.success) {
    const fallback =
      response.status === 401
        ? "Your session expired. Please sign in again."
        : response.status === 429
          ? "Too many requests. Please wait before trying again."
          : "The request could not be completed.";
    throw new ClientError(
      payload.message || fallback,
      response.status,
      Array.isArray(payload.meta?.issues) ? payload.meta.issues : [],
    );
  }
  return payload as Envelope<T>;
}
export function queryPath(
  path: string,
  values: Record<string, string | number | undefined>,
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value !== undefined && String(value) !== "")
      query.set(key, String(value));
  return `${path}${query.size ? `?${query}` : ""}`;
}
