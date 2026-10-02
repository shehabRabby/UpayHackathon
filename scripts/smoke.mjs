import assert from "node:assert/strict";

const base =
  process.argv[2] ?? process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const cases = [
  ["/api/v1/auth/profile", "GET", 401],
  [
    "/api/v1/coach/conversations/00000000-0000-4000-8000-000000000001",
    "DELETE",
    401,
  ],
  ["/api/v1/goals/00000000-0000-4000-8000-000000000001", "PATCH", 401],
  ["/api/v1/goals/00000000-0000-4000-8000-000000000001", "DELETE", 401],
  [
    "/api/v1/goals/00000000-0000-4000-8000-000000000001/contributions",
    "GET",
    401,
  ],
  ["/api/v1/transactions/00000000-0000-4000-8000-000000000001", "GET", 401],
  ["/api/v1/transactions/00000000-0000-4000-8000-000000000001", "PATCH", 401],
  ["/api/v1/transactions/00000000-0000-4000-8000-000000000001", "DELETE", 401],
  ["/api/v1/coach/conversations", "GET", 401],
  ["/api/v1/coach/conversations", "POST", 401],
  [
    "/api/v1/coach/conversations/00000000-0000-4000-8000-000000000001/messages",
    "GET",
    401,
  ],
  [
    "/api/v1/coach/conversations/00000000-0000-4000-8000-000000000001/messages",
    "POST",
    401,
  ],
  ["/api/v1/recommendations", "GET", 401],
  [
    "/api/v1/recommendations/00000000-0000-4000-8000-000000000001",
    "PATCH",
    401,
  ],
  ["/api/v1/simulator/what-if", "POST", 401],
  ["/api/v1/affordability/check", "POST", 401],
  ["/api/v1/simulator/what-if", "GET", 400],
  ["/api/v1/affordability/check", "GET", 400],
  ["/api/v1/analytics/spending", "GET", 401],
  ["/api/v1/analytics/refresh", "POST", 401],
  ["/api/v1/financial-health", "GET", 401],
  ["/api/v1/financial-health/refresh", "POST", 401],
  [
    "/api/v1/goals/00000000-0000-4000-8000-000000000001/savings-plan",
    "POST",
    401,
  ],
  ["/api/v1/analytics/spending", "POST", 400],
  ["/api/v1/analytics/refresh", "GET", 400],
  ["/api/v1/financial-health", "POST", 400],
  [
    "/api/v1/goals/00000000-0000-4000-8000-000000000001/savings-plan",
    "GET",
    400,
  ],
  ["/api/v1/goals", "GET", 401],
  ["/api/v1/goals", "POST", 401],
  ["/api/v1/transactions", "GET", 401],
  ["/api/v1/transactions", "POST", 401],
  ["/api/v1/dashboard/summary", "GET", 401],
  ["/api/v1/categories", "GET", 401],
  ["/api/v1/auth/profile", "POST", 401],
  ["/api/v1/goals/00000000-0000-4000-8000-000000000001", "GET", 401],
  [
    "/api/v1/goals/00000000-0000-4000-8000-000000000001/contributions",
    "POST",
    401,
  ],
  ["/api/v1/goals", "PUT", 400],
  ["/api/v1/does-not-exist", "GET", 404],
  ["/api/v1", "GET", 404],
];
for (const [path, method, status] of cases) {
  const response = await fetch(base + path, {
    method,
    signal: AbortSignal.timeout(15_000),
    ...(method === "POST"
      ? { body: "{}", headers: { "Content-Type": "application/json" } }
      : {}),
  });
  assert.equal(response.status, status, `${method} ${path}`);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.equal(typeof body.message, "string");
  assert.equal(body.data, null);
  assert.equal(response.headers.get("cache-control"), "no-store");
  console.log(`${method} ${path}: ${status}, valid envelope`);
}
console.log(`${cases.length} live HTTP checks passed`);
