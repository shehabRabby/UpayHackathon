import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  // Audit existing effect patterns without requiring an unrelated rewrite
  // of the established auth and resource hooks in this stabilization pass.
  { rules: { "react-hooks/set-state-in-effect": "warn" } },
  globalIgnores([".next/**", "node_modules/**", "next-env.d.ts", "test-results/**", "playwright-report/**"]),
]);
