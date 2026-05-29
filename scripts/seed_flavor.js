'use strict';

/**
 * Generates data/flavor.json algorithmically (no API key needed).
 * Picks 3 distractors per question from the same continent; falls back to
 * other continents when the pool is too small.
 *
 * Usage:  node scripts/seed_flavor.js
 *
 * Run generate_flavor.js afterwards to upgrade distractors with Claude.
 */

const fs   = require('fs');
const path = require('path');

const ENTITIES_PATH = path.join(__dirname, '../data/entities.json');
const QUESTIONS_PATH = path.join(__dirname, '../data/questions.json');
const FLAVOR_PATH   = path.join(__dirname, '../data/flavor.json');

const entities = JSON.parse(fs.readFileSync(ENTITIES_PATH, 'utf8'));
const questions = JSON.parse(fs.readFileSync(QUESTIONS_PATH, 'utf8'));

// ── Build continent → [capitalId] map ────────────────────────────────────────

const byContinent = {};
for (const [id, e] of Object.entries(entities)) {
  if (e.type !== 'city') continue;
  const country = entities[e.country];
  if (!country) continue;
  const cont = country.continent ?? 'XX';
  if (!byContinent[cont]) byContinent[cont] = [];
  byContinent[cont].push(id);
}

// ── Deterministic sample (LCG seeded by string hash) ─────────────────────────

function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
}

function deterministicSample(arr, n, seed) {
  const pool = [...arr].sort();
  const out  = [];
  let s = seed >>> 0;
  while (out.length < n && pool.length > 0) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const idx = s % pool.length;
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

// ── Generate ──────────────────────────────────────────────────────────────────

const existing = fs.existsSync(FLAVOR_PATH)
  ? JSON.parse(fs.readFileSync(FLAVOR_PATH, 'utf8'))
  : {};

let added = 0;

for (const q of questions) {
  if (q.template !== 'capital_of_country') continue;
  if (existing[q.id]) continue;

  const answerCountry = entities[q.params.country];
  const cont          = answerCountry?.continent ?? 'XX';
  const samePool      = (byContinent[cont] ?? []).filter(id => id !== q.answer);

  // Fill up to 3 from same continent, then from any continent
  let pool = samePool;
  if (pool.length < 3) {
    const others = Object.values(byContinent)
      .flat()
      .filter(id => id !== q.answer && !samePool.includes(id));
    pool = [...samePool, ...others];
  }

  const distractors = deterministicSample(pool, 3, hash(q.id));
  existing[q.id] = { distractors };
  added++;
}

fs.writeFileSync(FLAVOR_PATH, JSON.stringify(existing, null, 2) + '\n');
console.log(`Wrote ${Object.keys(existing).length} entries (${added} new) to flavor.json`);
console.log('Run  node scripts/generate_flavor.js  to upgrade with Claude-selected distractors.');
