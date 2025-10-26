/*
  Minimal smoke test for Zaza Draft API.
  Usage:
    BASE_URL=http://localhost:3011 node scripts/smoke-draft.mjs
*/

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function req(path, opts) {
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json, text };
}

async function main() {
  let failures = 0;

  // Health
  const health = await req('/api/health');
  if (health.status !== 200 || !health.json?.ok) {
    console.error('Health FAIL', health.status, health.text);
    failures++;
  } else {
    console.log('Health OK');
  }

  // Happy path
  const happy = await req('/api/draft/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      notes: 'Student improving in group work; needs help starting writing.',
      tone: 'warm',
      language: 'en',
    }),
  });
  const happyOk = happy.status === 200 && typeof happy.json?.opening_line === 'string' && happy.json?.meta?.language === 'en';
  if (!happyOk) {
    console.error('Generate (happy) FAIL', happy.status, happy.text);
    failures++;
  } else {
    console.log('Generate (happy) OK');
  }

  // Invalid tone
  const bad = await req('/api/draft/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ notes: 'x', tone: 'angry', language: 'en' }),
  });
  if (bad.status !== 400) {
    console.error('Generate (invalid tone) FAIL', bad.status, bad.text);
    failures++;
  } else {
    console.log('Generate (invalid tone) OK');
  }

  if (failures) process.exit(1);
  console.log('Smoke tests passed');
}

main().catch((e) => { console.error('Smoke error', e); process.exit(1); });

