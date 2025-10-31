#!/usr/bin/env node
const { execFileSync, execSync } = require("child_process");

const patterns = process.argv.slice(2);
if (patterns.length === 0) {
  console.error("Usage: node scripts/test-glob.js <glob> [<glob> ...]");
  process.exit(2);
}

let files = [];
try {
  // Use execFileSync to avoid shell quoting issues on Windows
  const out = execFileSync("git", ["ls-files", "--", ...patterns], {
    stdio: ["ignore", "pipe", "ignore"],
  }).toString();

  files = out
    .split("\n")
    .filter(Boolean)
    .map((f) => f.replace(/\\/g, "/"));
} catch {
  // Fallback: run Vitest with raw patterns (best effort)
  files = [];
}

if (!files.length) {
  console.log("No test files found for patterns:", patterns.join(", "));
  process.exit(0);
}

const cmd = `vitest --run ${files.map((f) => `"${f}"`).join(" ")}`;
console.log("Running:", cmd);
execSync(cmd, { stdio: "inherit" });
