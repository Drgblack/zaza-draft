const fs = require('fs');
const path = require('path');

const checks = [];

function pass(msg) {
  checks.push({ ok: true, msg });
  console.log(`OK: ${msg}`);
}

function fail(msg, hint) {
  checks.push({ ok: false, msg, hint });
  console.error(`FAIL: ${msg}` + (hint ? ` â€” ${hint}` : ''));
}

console.log('Running release preflight checks...');

// Required env presence
const required = [
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'FIREBASE_PRIVATE_KEY',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_BASE_URL',
];
for (const k of required) {
  if (!process.env[k]) {
    fail(`Missing env var: ${k}`, `Set ${k} in your CI/project secrets`);
  } else {
    pass(`env ${k} present`);
  }
}

// FIREBASE_PROJECT_ID (server) matches NEXT_PUBLIC_FIREBASE_PROJECT_ID (client)
const serverProject = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
if (!serverProject) {
  fail('Missing server project id', 'Set FIREBASE_PROJECT_ID or GCLOUD_PROJECT in your server environment secrets');
} else if (serverProject !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  fail('Server project id mismatch', 'Ensure FIREBASE_PROJECT_ID/GCLOUD_PROJECT (server) matches NEXT_PUBLIC_FIREBASE_PROJECT_ID (client)');
} else {
  pass('Server project id matches NEXT_PUBLIC_FIREBASE_PROJECT_ID');
}

// NEXT_PUBLIC_BASE_URL validation: HTTPS and not localhost in CI non-test runs
const base = process.env.NEXT_PUBLIC_BASE_URL || '';
const isCI = !!process.env.CI;
const isProductionNode = process.env.NODE_ENV === 'production';
const isTestMode = (process.env.TEST_MODE || '').toLowerCase() === 'true';
if (!base) {
  fail('NEXT_PUBLIC_BASE_URL not set', 'Set NEXT_PUBLIC_BASE_URL to the production app URL, e.g. https://app.example.com');
} else {
  try {
    const u = new URL(base);
    if (isCI && !isTestMode && isProductionNode) {
      if (u.protocol !== 'https:') {
        fail('NEXT_PUBLIC_BASE_URL is not HTTPS', 'Use https:// in production CI (avoid http:// or file://)');
      } else if (/localhost|127\.0\.0\.1/.test(u.hostname)) {
        fail('NEXT_PUBLIC_BASE_URL points to localhost in production CI', 'Use your deployed HTTPS URL in CI');
      } else {
        pass('NEXT_PUBLIC_BASE_URL is HTTPS and non-localhost');
      }
    } else {
      pass('NEXT_PUBLIC_BASE_URL parseable');
    }
  } catch (e) {
    fail('NEXT_PUBLIC_BASE_URL is not a valid URL', 'Ensure NEXT_PUBLIC_BASE_URL is a full URL, e.g. https://app.example.com');
  }
}

// TEST_MODE should be false/unset in production CI
if (isCI && isProductionNode) {
  if (isTestMode) {
    fail('TEST_MODE is true in production CI', 'Unset TEST_MODE or set it to false for production runs');
  } else {
    pass('TEST_MODE is not enabled in production CI');
  }
} else {
  pass('TEST_MODE check skipped (not production CI)');
}

// Stripe key patterns
const sk = process.env.STRIPE_SECRET_KEY || '';
const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
const wh = process.env.STRIPE_WEBHOOK_SECRET || '';
if (!sk) {
  fail('STRIPE_SECRET_KEY missing', 'Set STRIPE_SECRET_KEY (starts with sk_) in secrets');
} else if (!/^sk_/.test(sk)) {
  fail('STRIPE_SECRET_KEY does not look valid', 'Secret keys should start with sk_');
} else {
  pass('STRIPE_SECRET_KEY looks valid');
}
if (!pk) {
  fail('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY missing', 'Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (starts with pk_)');
} else if (!/^pk_/.test(pk)) {
  fail('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY does not look valid', 'Publishable keys should start with pk_');
} else {
  pass('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY looks valid');
}
if (!wh) {
  fail('STRIPE_WEBHOOK_SECRET missing', 'Set STRIPE_WEBHOOK_SECRET to your Stripe webhook signing secret');
} else {
  pass('STRIPE_WEBHOOK_SECRET present');
}

// Check for scheduled function file
const fnPath = path.resolve(__dirname, '../functions/src/usage/reset-monthly.ts');
if (!fs.existsSync(fnPath)) {
  fail('Scheduled monthly reset function not found', `Expected file at ${fnPath}. If you keep functions elsewhere, update scripts/release-check.js`);
} else {
  pass('scheduled function file exists');
}

// Check firestore.rules exists
const rulesPath = path.resolve(__dirname, '../firestore.rules');
if (!fs.existsSync(rulesPath)) {
  fail('Firestore rules file (firestore.rules) not found', 'Add a firestore.rules file to the project root');
} else {
  pass('firestore.rules exists');
}

// Summary & exit
const failed = checks.filter((c) => !c.ok);
const passed = checks.filter((c) => c.ok);
console.log('\nRelease preflight summary:');
console.log(`  Passed: ${passed.length}`);
console.log(`  Failed: ${failed.length}`);
if (failed.length > 0) {
  console.error('\nOne or more release preflight checks failed. Remediation hints:');
  for (const f of failed) {
    console.error(` - ${f.msg}` + (f.hint ? ` -> ${f.hint}` : ''));
  }
  process.exit(1);
}

console.log('\nAll release preflight checks passed. Validated items:');
for (const p of passed) console.log(` - ${p.msg}`);
process.exit(0);
