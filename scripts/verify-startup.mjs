import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:net";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const port = 3117;
const base = `http://127.0.0.1:${port}`;
// Refuse to reuse a server owned by another task.
const probe = createServer();
await new Promise((resolve, reject) => {
  probe.once("error", reject);
  probe.listen(port, "127.0.0.1", resolve);
});
await new Promise((resolve) => probe.close(resolve));
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  },
);
// Inspect runtime failures without relaying application output or user data.
const runtimeFindings = new Set();
for (const stream of [child.stdout, child.stderr]) {
  stream.on("data", chunk => {
    const text = chunk.toString();
    for (const [label, pattern] of [
      ["unhandled exception", /unhandledRejection|uncaughtException/i],
      ["missing module", /Cannot find module|Module not found/i],
      ["React runtime warning", /hydration|Invalid hook call|Each child.*key/i],
      ["component boundary failure", /cannot be imported from a Client Component|server-only.*Client Component/i],
    ]) if (pattern.test(text)) runtimeFindings.add(label);
  });
}
let exitCode;
child.on("exit", (code) => {
  exitCode = code;
});
try {
  const deadline = Date.now() + 25_000;
  let ready = false;
  while (Date.now() < deadline && exitCode === undefined) {
    try {
      const response = await fetch(base, { signal: AbortSignal.timeout(1500) });
      assert.equal(response.status, 200);
      assert.ok((await response.text()).includes("Upay Financial Coach"));
      ready = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  assert.ok(ready, "Production server did not become ready");
  console.log("Production startup and home page verified: HTTP 200");
  for (const path of ["/login", "/signup", "/dashboard", "/transactions", "/goals", "/analytics", "/coach", "/planning", "/profile"]) {
    const response = await fetch(base + path, { signal: AbortSignal.timeout(10_000) });
    assert.equal(response.status, 200, `Production page ${path}`);
    assert.ok((await response.text()).includes("Upay Financial Coach"), `Production HTML ${path}`);
  }
  const callback = await fetch(`${base}/auth/callback`, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
  assert.equal(callback.status, 307);
  const callbackTarget = new URL(callback.headers.get("location"));
  // Next normalizes the local request origin to localhost on this server.
  assert.ok(["127.0.0.1", "localhost"].includes(callbackTarget.hostname));
  assert.equal(callbackTarget.protocol, "http:");
  assert.equal(callbackTarget.port, String(port));
  assert.equal(callbackTarget.pathname, "/login");
  assert.equal(callbackTarget.search, "?confirmation=failed");
  console.log("Production public/protected page shells and safe callback redirect verified");
  await new Promise((resolve, reject) => {
    const smoke = spawn(process.execPath, ["scripts/smoke.mjs", base], {
      cwd: root,
      stdio: "inherit",
      windowsHide: true,
    });
    smoke.once("error", reject);
    smoke.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error("HTTP smoke checks failed")),
    );
  });
  const invalid = await fetch(`${base}/api/v1/categories`, {
    headers: { authorization: "Bearer deliberately-invalid-audit-token" },
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(invalid.status, 401);
  assert.equal((await invalid.json()).success, false);
  console.log("Live API rejects invalid bearer tokens with a 401 envelope");
  assert.deepEqual([...runtimeFindings], [], "Production runtime diagnostics failed");
  console.log("Production logs: no detected unhandled, import, component-boundary or React failures");
} finally {
  if (child.pid && exitCode === undefined) {
    if (process.platform === "win32")
      execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    else child.kill("SIGTERM");
  }
  console.log("Temporary production server stopped");
}
