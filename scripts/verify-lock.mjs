import { createHash } from "crypto";
import { readFileSync } from "fs";
import { spawnSync } from "child_process";

function hashFile(p) {
  try {
    const buf = readFileSync(p);
    return createHash("sha256").update(buf).digest("hex");
  } catch {
    return null;
  }
}

const before = hashFile("pnpm-lock.yaml");
spawnSync("pnpm", ["install", "--lockfile-only"], { stdio: "ignore", shell: true });
const after = hashFile("pnpm-lock.yaml");

if (before !== after) {
  console.error("\n❌ pnpm-lock.yaml changed during check.");
  console.error('   Run: git add pnpm-lock.yaml && git commit -m "chore: update lockfile"');
  process.exit(1);
}

console.log("✅ Lockfile is up to date.");
