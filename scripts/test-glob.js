#!/usr/bin/env node
/* UTF-8 no BOM */
const { execFileSync, spawnSync } = require("node:child_process");

const patterns = process.argv.slice(2);
if (patterns.length === 0) {
  console.error("[test:core] Usage: node scripts/test-glob.js <glob> [<glob> ...]");
  process.exit(2);
}

let files = [];
try {
  const out = execFileSync("git", ["ls-files", "--", ...patterns], {
    stdio: ["ignore", "pipe", "ignore"],
  }).toString();

  files = out.split(/\r?\n/).filter(Boolean).map(f => f.replace(/\\/g, "/"));
} catch {
  files = [];
}

if (!files.length) {
  console.log("[test:core] no matching test files");
  process.exit(0);
}

const res = spawnSync("npx", ["vitest", "--run", ...files], { stdio: "inherit" });
process.exit(res.status ?? 1);