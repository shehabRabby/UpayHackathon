import "dotenv/config";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

// Read-only service checks: no accounts, sessions, or database rows are created.
try {
  const url =
    process.env.SUPBASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const key =
    process.env.SUPBASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  assert.ok(url && key, "Supabase Auth configuration missing");
  const response = await fetch(new URL("/auth/v1/settings", url), {
    headers: { apikey: key },
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(response.status, 200, "Supabase Auth settings check failed");
  await response.body?.cancel();
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }),
    },
  });
  const result = await client.auth.getUser("deliberately-invalid-audit-token");
  assert.ok(
    result.error && !result.data.user,
    "Invalid bearer token must be rejected",
  );
  assert.ok(
    result.error.status === 401 || result.error.status === 403,
    "Unexpected Auth rejection status",
  );
  console.log(
    "Supabase Auth verified: settings HTTP 200; invalid bearer token rejected; no records changed",
  );
} catch {
  console.error(
    "Supabase Auth verification failed; check configuration, service availability, and network access",
  );
  process.exitCode = 1;
}
