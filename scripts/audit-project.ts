import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, relative, join } from "node:path";
import { execFileSync } from "node:child_process";
import { parse } from "dotenv";
import ts from "typescript";

// Local read-only inventory. Findings contain names/locations only, never values.
const root = resolve(import.meta.dirname, "..");
const files: string[] = [];
function walk(dir: string) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (
      [
        "node_modules",
        ".next",
        ".git",
        ".codex",
        ".agents",
        ".aws",
        "coverage",
      ].includes(item.name)
    )
      continue;
    const path = join(dir, item.name);
    if (item.isDirectory()) walk(path);
    else files.push(path);
  }
}
walk(root);
const sources = files.filter(
  (path) => /\.(?:ts|tsx|mjs)$/.test(path) && !path.endsWith("next-env.d.ts"),
);
const envText = readFileSync(join(root, ".env"), "utf8");
const env = parse(envText),
  example = parse(readFileSync(join(root, ".env.example")));
const references = new Set<string>();
for (const path of sources) {
  for (const match of readFileSync(path, "utf8").matchAll(
    /process\.env\.([A-Z][A-Z0-9_]*)/g,
  ))
    references.add(match[1]);
}
const keys = [
  ...envText.matchAll(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/gm),
].map((match) => match[1]);
const duplicates = [
  ...new Set(keys.filter((key, i) => keys.indexOf(key) !== i)),
];
const names = [...new Set([...Object.keys(env), ...references])].sort();
console.log(
  "Environment inventory",
  names.map((name) => ({
    name,
    status: env[name]?.trim()
      ? "PRESENT"
      : process.env[name]?.trim()
        ? "PRESENT_IN_PROCESS"
        : "MISSING",
    inExample: name in example,
    referenced: references.has(name),
  })),
);
console.log("Duplicate environment names", duplicates);
for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
  let valid = false;
  try {
    const url = new URL(env[name] || process.env[name] || "");
    valid =
      ["postgres:", "postgresql:"].includes(url.protocol) &&
      Boolean(url.hostname && url.username && url.pathname !== "/");
  } catch {
    /* masked */
  }
  console.log(`${name} URL structure`, valid ? "VALID" : "INVALID_OR_MISSING");
}
const configFile = ts.readConfigFile(
  join(root, "tsconfig.json"),
  ts.sys.readFile,
);
const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);
const packageJson = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
);
const declared = new Set([
  ...Object.keys(packageJson.dependencies),
  ...Object.keys(packageJson.devDependencies),
]);
const imports: { file: string; module: string }[] = [],
  casing: string[] = [];
const edges = new Map<string, string[]>();
function exactCase(path: string) {
  const rel = relative(root, path);
  let current = root;
  for (const part of rel.split(/[\\/]/)) {
    if (!readdirSync(current).includes(part)) return false;
    current = join(current, part);
  }
  return true;
}
for (const path of sources) {
  const text = readFileSync(path, "utf8");
  const modules = [
    ...text.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g),
  ].map((match) => match[1]);
  const localEdges: string[] = [];
  for (const module of modules) {
    if (module.startsWith("node:")) continue;
    // TypeScript does not resolve stylesheet imports. Verify the actual asset.
    if (module.startsWith(".") && module.endsWith(".css")) {
      const asset = resolve(path, "..", module);
      if (!existsSync(asset))
        imports.push({ file: relative(root, path), module });
      else if (!exactCase(asset)) casing.push(relative(root, path));
      continue;
    }
    const resolution = ts.resolveModuleName(
      module,
      path,
      parsed.options,
      ts.sys,
    ).resolvedModule;
    if (!resolution) imports.push({ file: relative(root, path), module });
    else if (!resolution.isExternalLibraryImport) {
      localEdges.push(resolve(resolution.resolvedFileName));
      if (!exactCase(resolution.resolvedFileName))
        casing.push(relative(root, path));
    }
    if (!module.startsWith(".") && !module.startsWith("@/")) {
      const name = module.startsWith("@")
        ? module.split("/").slice(0, 2).join("/")
        : module.split("/")[0];
      if (!declared.has(name))
        imports.push({
          file: relative(root, path),
          module: `UNDECLARED:${name}`,
        });
    }
  }
  edges.set(resolve(path), localEdges);
}
const visited = new Set<string>(),
  stack: string[] = [],
  cycles: string[][] = [];
function visit(path: string) {
  if (stack.includes(path)) {
    cycles.push(
      [...stack.slice(stack.indexOf(path)), path].map((p) => relative(root, p)),
    );
    return;
  }
  if (visited.has(path)) return;
  stack.push(path);
  for (const child of edges.get(path) ?? []) visit(child);
  stack.pop();
  visited.add(path);
}
for (const path of sources) visit(path);
console.log("Import audit", {
  sourceFiles: sources.length,
  unresolvedOrUndeclared: imports,
  caseMismatches: casing,
  cycles,
});
const secretPattern =
  /sb_secret_[A-Za-z0-9_-]{10,}|AIza[A-Za-z0-9_-]{30,}|AQ\.Ab[A-Za-z0-9._-]{25,}|postgres(?:ql)?:\/\/[^\s"']+:[^\s"'@]+@/;
const locations: { file: string; line: number }[] = [];
for (const path of files) {
  if (
    relative(root, path).startsWith(".env") ||
    path.endsWith("tsbuildinfo") ||
    path.endsWith("package-lock.json") ||
    !/\.(?:ts|tsx|mjs|md|json|sql)$/.test(path)
  )
    continue;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    if (
      secretPattern.test(line) &&
      !/USER:PASSWORD|synthetic-test|secretPattern/.test(line)
    )
      locations.push({ file: relative(root, path), line: i + 1 });
  });
}
const git = (...args: string[]) =>
  execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
const trackedEnvs = git("ls-files")
  .split(/\r?\n/)
  .filter(
    (path) => /(^|\/)\.env(?:$|\.)/.test(path) && path !== ".env.example",
  );
const historicalEnvs = [
  ...new Set(
    git("log", "--all", "--format=", "--name-only", "--", ".env", ".env.*")
      .split(/\r?\n/)
      .filter((path) => path && path !== ".env.example"),
  ),
];
const historySecrets: { commit: string; file: string; line: number }[] = [];
const commits = git("rev-list", "--all").split(/\r?\n/).filter(Boolean);
for (const commit of commits) {
  let candidates = "";
  try {
    candidates = git(
      "grep",
      "-l",
      "-I",
      "-E",
      "sb_secret_[A-Za-z0-9_-]{10,}|AIza[A-Za-z0-9_-]{30,}|AQ\\.Ab[A-Za-z0-9._-]{25,}|postgres(ql)?://",
      commit,
    );
  } catch {
    continue;
  }
  for (const candidate of candidates.split(/\r?\n/).filter(Boolean)) {
    const path = candidate.slice(commit.length + 1);
    const lines = git("show", `${commit}:${path}`).split(/\r?\n/);
    lines.forEach((line, i) => {
      if (
        secretPattern.test(line) &&
        !/USER:PASSWORD|synthetic-test|secretPattern/.test(line)
      )
        historySecrets.push({
          commit: commit.slice(0, 8),
          file: path,
          line: i + 1,
        });
    });
  }
}
console.log("Secret scan", {
  locations,
  trackedEnvs,
  historicalEnvs,
  historySecrets,
  commitsChecked: commits.length,
  envIgnored: Boolean(git("check-ignore", ".env")),
});
console.log("Application inventory", {
  packages: files
    .filter((path) => path.endsWith("package.json"))
    .map((path) => relative(root, path)),
  apiRoutes: files.filter(
    (path) => /app[\\/]api/.test(path) && path.endsWith("route.ts"),
  ).length,
  migrationDirectoryPresent: existsSync(join(root, "prisma/migrations")),
});
if (
  imports.length ||
  casing.length ||
  duplicates.length ||
  locations.length ||
  trackedEnvs.length ||
  historySecrets.length
)
  process.exitCode = 1;
