#!/usr/bin/env node
const { execSync } = require("child_process");

const patterns = process.argv.slice(2);
if (patterns.length === 0) {
  console.error("Usage: node scripts/test-glob.js <glob> [<glob> ...]");
  process.exit(2);
}

let files = "";
try {
  // use git pathspecs to expand globs portably
  const args = patterns.map(p => `'` + p.replace(/'/g, `'\\''`) + `'`).join(" ");
  files = execSync(`git ls-files -- ${args}`, { stdio: ["ignore", "pipe", "ignore"] })
    .toString()
    .split("\n")
    .filter(Boolean)
    .map(f => f.replace(/\\/g, "/"));
} catch {
  // fall back to running vitest with the raw patterns (best effort)
  files = patterns;
}

if (!files.length) {
  console.log("No test files found for patterns:", patterns.join(", "));
  process.exit(0);
}

const cmd = `vitest --run ${files.map(f => `"${f}"`).join(" ")}`;
console.log("Running:", cmd);
execSync(cmd, { stdio: "inherit" });
