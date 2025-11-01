#!/usr/bin/env node
/* UTF-8 no BOM */
const { execSync, spawnSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");

const args = process.argv.slice(2);
const isVerbose = args.includes("--verbose");
const isLast = args.includes("--last");
const isStaged = args.includes("--staged");

const TEST_GLOBS = [
  "__tests__/**/*.test.ts",
  "app/**/*.test.ts",
];

function sh(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
}

function vitestRun(files) {
  const res = spawnSync("npx", ["vitest", "--run", ...files], { stdio: "inherit" });
  process.exit(res.status ?? 1);
}

function dedupeExisting(names) {
  const abs = new Set();
  const out = [];
  for (const f of names) {
    if (!f) continue;
    const p = path.resolve(process.cwd(), f);
    if (!existsSync(p)) continue;
    if (abs.has(p)) continue;
    abs.add(p);
    out.push(f);
  }
  return out;
}

function pickChangedTests() {
  let names = [];

  try {
    if (isStaged) {
      // Staged (index) changes only
      const staged = sh(`git diff --name-only --cached -- ${TEST_GLOBS.join(" ")}`);
      const list = staged ? staged.split(/\r?\n/).filter(Boolean) : [];
      names.push(...list);
      if (isVerbose) console.log(`[detect] staged changed tests: ${list.length}`);
    } else if (isLast) {
      // Files from the last commit
      const last = sh(`git show --pretty= --name-only HEAD -- ${TEST_GLOBS.join(" ")}`);
      const list = last ? last.split(/\r?\n/).filter(Boolean) : [];
      names.push(...list);
      if (isVerbose) console.log(`[detect] last commit tests: ${list.length}`);
    } else {
      // Working tree modified (tracked)
      const wt = sh(`git ls-files -m -- ${TEST_GLOBS.join(" ")}`);
      const wtList = wt ? wt.split(/\r?\n/).filter(Boolean) : [];
      names.push(...wtList);
      if (isVerbose) console.log(`[detect] working tree modified tests: ${wtList.length}`);

      // Include UNTRACKED but not ignored tests (brand-new files)
      const untracked = sh(`git ls-files -o --exclude-standard -- ${TEST_GLOBS.join(" ")}`);
      const untrackedList = untracked ? untracked.split(/\r?\n/).filter(Boolean) : [];
      if (untrackedList.length) {
        names.push(...untrackedList);
        if (isVerbose) console.log(`[detect] untracked tests: ${untrackedList.length}`);
      }

      // If none yet, fall back to staged
      if (names.length === 0) {
        const staged = sh(`git diff --name-only --cached -- ${TEST_GLOBS.join(" ")}`);
        const list = staged ? staged.split(/\r?\n/).filter(Boolean) : [];
        names.push(...list);
        if (isVerbose) console.log(`[detect] fallback staged changed tests: ${list.length}`);
      }

      // If still none, fall back to last commit
      if (names.length === 0) {
        const last = sh(`git show --pretty= --name-only HEAD -- ${TEST_GLOBS.join(" ")}`);
        const list = last ? last.split(/\r?\n/).filter(Boolean) : [];
        names.push(...list);
        if (isVerbose) console.log(`[detect] fallback last commit tests: ${list.length}`);
      }
    }
  } catch (e) {
    if (isVerbose) console.error(`[detect] error: ${e.message}`);
  }

  return dedupeExisting(names);
}

// ---- main
const selected = pickChangedTests();
if (selected.length > 0) {
  if (isVerbose) console.log(`[detect] final test set: ${selected.length}\n[vitest] npx vitest --run ${selected.map(s => `"${s}"`).join(" ")}`);
  vitestRun(selected);
} else {
  const reason = isStaged
    ? "No staged test changes detected."
    : isLast
    ? "No test files in the last commit."
    : "No modified, untracked, or staged test files found. Nothing to run.";
  console.log(`[test:changed] ${reason}`);
  process.exit(0);
}