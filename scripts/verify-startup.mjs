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
// Do not relay arbitrary application error output; it may include credentials.
child.stdout.resume();
child.stderr.resume();
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
