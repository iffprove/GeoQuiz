'use strict';

/**
 * Upgrades data/flavor.json with Claude-selected distractors.
 * Processes questions in batches; skips entries already in flavor.json.
 * Uses prompt caching for the capital pool (constant across batches).
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/generate_flavor.js
 *   # or set the key in a .env file in the project root
 *
 * Requires: no npm packages — uses Node.js built-in https module.
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ── Env ───────────────────────────────────────────────────────────────────────

function loadDotEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const eq = line.indexOf('=');
    if (eq < 1 || line.trim().startsWith('#')) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  }
}
loadDotEnv();

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY. Add it to .env or export it.');
  process.exit(1);
}

const MODEL      = process.env.GEOTRIVIA_MODEL || 'claude-haiku-4-5-20251001';
const BATCH_SIZE = 15;
const RETRY_MAX  = 3;

// ── Paths ─────────────────────────────────────────────────────────────────────

const ENTITIES_PATH  = path.join(__dirname, '../data/entities.json');
const QUESTIONS_PATH = path.join(__dirname, '../data/questions.json');
const FLAVOR_PATH    = path.join(__dirname, '../data/flavor.json');

const entities = JSON.parse(fs.readFileSync(ENTITIES_PATH, 'utf8'));
const questions = JSON.parse(fs.readFileSync(QUESTIONS_PATH, 'utf8'));

// ── Build capital pool for the system prompt ──────────────────────────────────

const capitalPool = Object.entries(entities)
  .filter(([, e]) => e.type === 'city')
  .map(([id, e]) => {
    const country = entities[e.country] ?? {};
    return { id, name: e.labels.en, country: e.country, continent: country.continent ?? 'XX' };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

const poolText = capitalPool
  .map(c => `${c.id} | ${c.name} | ${c.country} | ${c.continent}`)
  .join('\n');

// ── API helpers ───────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function apiCall(body, attempt = 1) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req  = https.request({
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers: {
        'x-api-key':         API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta':    'prompt-caching-2024-07-31',
        'content-type':      'application/json',
        'content-length':    Buffer.byteLength(data),
      },
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode === 529 || res.statusCode >= 500) {
          reject(Object.assign(new Error(`HTTP ${res.statusCode}`), { retryable: true }));
        } else if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 300)}`));
        } else {
          try { resolve(JSON.parse(body)); }
          catch (e) { reject(new Error('JSON parse: ' + e.message)); }
        }
      });
    });
    req.on('error', e => reject(Object.assign(e, { retryable: true })));
    req.write(data);
    req.end();
  }).catch(async err => {
    if (err.retryable && attempt <= RETRY_MAX) {
      const wait = 2 ** attempt * 1000;
      console.warn(`  [retry ${attempt}/${RETRY_MAX}] ${err.message} — waiting ${wait}ms`);
      await sleep(wait);
      return apiCall(body, attempt + 1);
    }
    throw err;
  });
}

// ── Prompt ────────────────────────────────────────────────────────────────────

const SYSTEM = `You are a geography quiz designer selecting multiple-choice distractors.

For each question you receive, select exactly 3 distractor capitals from the pool below.
Rules:
- Distractors must be entity IDs from the pool (never invent new names)
- Distractors must NOT include the correct answer ID
- Prefer same continent for plausibility
- Prefer similar fame level (avoid trivially easy distractors like picking Nauru for France)
- Return valid JSON only — no prose, no markdown fences

Capital pool (id | English name | country ISO2 | continent):
${poolText}`;

async function processBatch(batch, flavor) {
  const questionsBlock = batch.map(q => {
    const country   = entities[q.params.country];
    const capital   = entities[q.answer];
    const continent = country?.continent ?? '??';
    return {
      id:           q.id,
      question:     `What is the capital of ${country?.labels?.en ?? q.params.country}?`,
      answer_id:    q.answer,
      answer_name:  capital?.labels?.en ?? q.answer,
      continent,
    };
  });

  const resp = await apiCall({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type:          'text',
        text:          SYSTEM,
        cache_control: { type: 'ephemeral' },  // cache the capital pool across batches
      },
    ],
    messages: [{
      role: 'user',
      content: `Select 3 distractors for each question. Return this exact JSON shape:
{"results":[{"id":"<question_id>","distractors":["ID1","ID2","ID3"]},...]}\n\n${JSON.stringify(questionsBlock)}`,
    }],
  });

  const text = resp.content?.[0]?.text ?? '';
  let parsed;
  try {
    // Strip any accidental markdown fences
    const clean = text.replace(/```json\s*/g,'').replace(/```\s*/g,'').trim();
    parsed = JSON.parse(clean);
  } catch (e) {
    throw new Error(`Could not parse model response: ${text.slice(0, 200)}`);
  }

  const usage = resp.usage ?? {};
  process.stdout.write(
    `  cache_read=${usage.cache_read_input_tokens ?? 0} ` +
    `cache_create=${usage.cache_creation_input_tokens ?? 0} ` +
    `out=${usage.output_tokens ?? 0}\n`
  );

  for (const item of parsed.results ?? []) {
    if (!item.id || !Array.isArray(item.distractors)) continue;
    // Validate: all distractors must exist in entities and not be the answer
    const q = batch.find(b => b.id === item.id);
    const valid = item.distractors
      .filter(d => entities[d] && d !== (q?.answer ?? ''))
      .slice(0, 3);
    if (valid.length === 3) {
      flavor[item.id] = { distractors: valid };
    } else {
      console.warn(`  Invalid distractors for ${item.id}: ${item.distractors.join(',')} — keeping existing`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const flavor = fs.existsSync(FLAVOR_PATH)
    ? JSON.parse(fs.readFileSync(FLAVOR_PATH, 'utf8'))
    : {};

  const todo = questions.filter(q =>
    q.template === 'capital_of_country' && !flavor[q.id]
  );

  if (todo.length === 0) {
    console.log('All questions already have flavor data. Nothing to do.');
    return;
  }

  console.log(`Generating distractors for ${todo.length} questions in batches of ${BATCH_SIZE}…`);
  console.log(`Model: ${MODEL}`);

  let done = 0;
  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE);
    process.stdout.write(`Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(todo.length / BATCH_SIZE)} `);
    await processBatch(batch, flavor);
    done += batch.length;
    // Save after every batch so progress isn't lost on failure
    fs.writeFileSync(FLAVOR_PATH, JSON.stringify(flavor, null, 2) + '\n');
    if (i + BATCH_SIZE < todo.length) await sleep(500);
  }

  console.log(`\nDone. ${done} questions upgraded → flavor.json`);
}

main().catch(err => { console.error('\nFatal:', err.message); process.exit(1); });
