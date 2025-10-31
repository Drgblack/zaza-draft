#!/usr/bin/env node
const { execSync } = require('child_process');

const mode = process.argv.includes('--staged') ? 'staged'
           : process.argv.includes('--last')   ? 'last'
           : null;

if (!mode) {
  console.error('Usage: node scripts/test-changed.js --staged | --last');
  process.exit(2);
}

const gitCmd = mode === 'staged'
  ? 'git diff --name-only --cached'
  : 'git diff --name-only HEAD~1';

const files = execSync(gitCmd, { stdio: ['ignore', 'pipe', 'ignore'] })
  .toString()
  .split('\n')
  .filter(Boolean)
  .filter(f => /\.(test|spec)\.(c|m)?[jt]sx?$/.test(f));

if (files.length === 0) {
  console.log('No changed test files. Exiting.');
  process.exit(0);
}

// Quote each path for Windows and keep forward slashes
const args = files.map(f => `"${f.replace(/\\/g, '/')}"`).join(' ');
const cmd = `vitest --run ${args}`;

console.log(`Running: ${cmd}`);
execSync(cmd, { stdio: 'inherit' });