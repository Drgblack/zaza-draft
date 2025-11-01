#!/usr/bin/env node
/* UTF-8 no BOM */
const { execSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");

const args = process.argv.slice(2);
const isVerbose = args.includes("--verbose");
const isLast = args.includes("--last");
const isStaged = args.includes("--staged");

const TEST_GLOBS = [
  "__tests__/**/*.test.ts",
  "app/**/*.test.ts"
];

function sh(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
}

function listRepoTests() {
  // Uses git to find matching files cross-platform
  const files = sh(`git ls-files -- ${TEST_GLOBS.join(" ")}`).split(/\r?\n/).filter(Boolean);
  return files;
}

function vitestRun(files) {
  const quoted = files.map(f => `"${f}"`).join(" ");
  const full = `npx vitest --run ${quoted}`;
  if (isVerbose) {
    console.log(`[vitest] ${full}`);
  }
  const code = require("node:child_process").spawnSync("npx", ["vitest", "--run", ...files], { stdio: "inherit" }).status ?? 1;
  process.exit(code);
}

function pickChangedTests() {
  // Collect candidates from several sources
  let names = [];

  try {
    if (isStaged) {
      // Only staged changes
      const staged = sh(`git diff --name-only --cached -- ${TEST_GLOBS.join(" ")}`);
      names.push(...staged.split(/\r?\n/).filter(Boolean));
      if (isVerbose) console.log(`[detect] staged changed tests: ${names.length}`);
    } else if (isLast) {
      // Files from the last commit
      const last = sh(`git show --pretty= --name-only HEAD -- ${TEST_GLOBS.join(" ")}`);
      names.push(...last.split(/\r?\n/).filter(Boolean));
      if (isVerbose) console.log(`[detect] last commit tests: ${names.length}`);
    } else {
      // Working tree changes first
      const wt = sh(`git ls-files -m -- ${TEST_GLOBS.join(" ")}`);
      names.push(...wt.split(/\r?\n/).filter(Boolean));
      if (isVerbose) console.log(`[detect] working tree modified tests: ${wt ? wt.split(/\r?\n/).filter(Boolean).length : 0}`);

      // If none, fall back to staged
      if (names.length === 0) {
        const staged = sh(`git diff --name-only --cached -- ${TEST_GLOBS.join(" ")}`);
        names.push(...staged.split(/\r?\n/).filter(Boolean));
        if (isVerbose) console.log(`[detect] fallback staged changed tests: ${names.length}`);
      }

      // If still none, fall back to last commit
      if (names.length === 0) {
        const last = sh(`git show --pretty= --name-only HEAD -- ${TEST_GLOBS.join(" ")}`);
        names.push(...last.split(/\r?\n/).filter(Boolean));
        if (isVerbose) console.log(`[detect] fallback last commit tests: ${names.length}`);
      }
    }
  } catch (e) {
    if (isVerbose) console.error(`[detect] error while discovering tests: ${e.message}`);
  }

  // De-dup and keep only existing files
  const uniq = Array.from(new Set(names)).filter(f => f && existsSync(path.resolve(process.cwd(), f)));
  return uniq;
}

// Main
const selected = pickChangedTests();
if (selected.length > 0) {
  if (isVerbose) console.log(`[detect] final test set: ${selected.length}`);
  vitestRun(selected);
} else {
  // If we truly have none, print a clear message and exit 0
  const reason = isStaged
    ? "No staged test changes detected."
    : isLast
    ? "No test files in the last commit."
    : "No modified or staged test files found. Nothing to run.";
  console.log(`[test:changed] ${reason}`);
  // Optional fallback: run a fast smoke if you prefer
  process.exit(0);
}
