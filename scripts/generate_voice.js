'use strict';

/**
 * Generates per-locale host commentary, hints, and fun-facts for flavor.json.
 * Processes one locale at a time; skips entries that already have voice data
 * for that locale. Saves after every batch so progress isn't lost on failure.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/generate_voice.js [options]
 *
 * Options:
 *   --locale <code>    Target locale: en|es|fr|ja|pt  (default: en)
 *   --limit  <n>       Max entries to generate        (default: all pending)
 *   --review           Run a second-pass QA review    (default: off)
 *   --batch  <n>       Places per API call            (default: 8)
 *
 * Pilot workflow (from flavor_prompts.md):
 *   node scripts/generate_voice.js --locale en --limit 10
 *   # Read every entry. Tune voice spec in VOICE_SPECS below if needed.
 *   # Then scale:
 *   node scripts/generate_voice.js --locale en
 *   node scripts/generate_voice.js --locale es
 *   # ...etc for fr, ja, pt
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

// Use a strong model for quality voice generation; override via env var.
const GEN_MODEL    = process.env.GEOTRIVIA_VOICE_MODEL || 'claude-opus-4-8';
const REVIEW_MODEL = process.env.GEOTRIVIA_VOICE_MODEL || 'claude-sonnet-4-6';
const PROMPT_VER   = '1.0';
const RETRY_MAX    = 3;

// ── Args ──────────────────────────────────────────────────────────────────────

const args   = process.argv.slice(2);
const getArg = (flag, def) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : def; };

const LOCALE     = getArg('--locale', 'en');
const LIMIT      = parseInt(getArg('--limit', '0'), 10) || Infinity;
const DO_REVIEW  = args.includes('--review');
const BATCH_SIZE = parseInt(getArg('--batch', '8'), 10);

const VALID_LOCALES = ['en', 'es', 'fr', 'ja', 'pt'];
if (!VALID_LOCALES.includes(LOCALE)) {
  console.error(`Unknown locale "${LOCALE}". Valid: ${VALID_LOCALES.join(', ')}`);
  process.exit(1);
}

// ── Voice specs (from flavor_prompts.md) ─────────────────────────────────────

const VOICE_SPECS = {
  en: { language: 'English',               voice: 'Dry, understated, a touch of deadpan wit. Confident but never loud.' },
  es: { language: 'Spanish (neutral LatAm)',voice: 'Lively and warm, friendly exclamation, encouraging energy.' },
  fr: { language: 'French',                 voice: 'Elegant and lightly wry; gentle irony, a little cheeky, never cruel.' },
  ja: { language: 'Japanese',               voice: 'Polite, upbeat, and encouraging; playful in a gentle, friendly register.' },
  pt: { language: 'Portuguese (Brazil)',    voice: 'Warm, enthusiastic, casual and fun; like a friend cheering you on.' },
};

const { language: LANGUAGE_NAME, voice: VOICE_SPEC } = VOICE_SPECS[LOCALE];

// ── Paths ─────────────────────────────────────────────────────────────────────

const ENTITIES_PATH  = path.join(__dirname, '../data/entities.json');
const QUESTIONS_PATH = path.join(__dirname, '../data/questions.json');
const FLAVOR_PATH    = path.join(__dirname, '../data/flavor.json');

const entities  = JSON.parse(fs.readFileSync(ENTITIES_PATH,  'utf8'));
const questions = JSON.parse(fs.readFileSync(QUESTIONS_PATH, 'utf8'));

// ── Prompts ───────────────────────────────────────────────────────────────────

const GEN_SYSTEM = `You are the host and writer of GeoTrivia, a geography quiz game. You write short, \
characterful lines in ${LANGUAGE_NAME}, exactly as a witty native writer of that language would — \
you are NOT translating from English. Idiom, rhythm, and humour must feel native to ${LANGUAGE_NAME}.

YOUR VOICE FOR THIS LANGUAGE:
${VOICE_SPEC}

You will receive a batch of places. For each, produce:
- commentary.correct: the host's reaction when the player got it right.
- commentary.wrong: the host's reaction when the player got it wrong. This is the signature line — make it land, never mean-spirited.
- hint: a nudge shown to a struggling player. Must NOT contain or rhyme with the answer. Do not just give the first letter. Point at something characteristic (region, a neighbour, a notable feature).
- funFact: one genuinely interesting, true, widely-documented fact about the place.

HARD RULES:
- Invent no geography. If you are not highly confident a fun fact is true and well-documented, return null for funFact — a missing fact is far better than a wrong one.
- commentary and hint are flavour and may be playful; funFact is a factual claim and must be conservative and verifiable.
- Lengths: commentary ≤ 12 words each, hint ≤ 15 words, funFact one sentence ≤ 30 words.
- Never reference politics, religion, war, border or territorial disputes, or national/ethnic stereotypes. Never disparage any country. Appropriate for all ages.
- Write only in ${LANGUAGE_NAME}. Do not include English unless the run language is English.
- Return null (JSON null, not the string "null") if you withhold funFact.

Output STRICT JSON array only — no markdown fences, no prose outside the array:
[{"id":"<cap_XX>","commentary":{"correct":"","wrong":""},"hint":"","funFact":""},...]`;

const REVIEW_SYSTEM = `You are a native-level editor and safety reviewer for ${LANGUAGE_NAME} \
reviewing generated content for a geography game. You are strict.

You will receive a batch of flavor entries (commentary, hint, funFact) for geography places.
For each entry evaluate and return STRICT JSON array only:

[{"id":"<cap_XX>","nativeness":1-5,"tone_match":1-5,"safety":"pass"|"fail","fact_check":"ok"|"flag"|"fail","hint_leaks_answer":true|false,"verdict":"accept"|"revise"|"reject","reason":"one short line"},...]

nativeness: 5=reads as written by a native speaker, 1=translated English
tone_match: does it match host voice for this language?
safety: fail if politics, religion, war, territorial dispute, stereotype, disparagement, or age-inappropriate
fact_check: ok=confident & documented, flag=cannot verify, fail=likely false. Use "ok" for null funFacts.
hint_leaks_answer: true if hint contains, rhymes with, or directly implies the answer

Promote to production only if: nativeness ≥ 4, tone_match ≥ 4, safety = pass, fact_check = ok, hint_leaks_answer = false.`;

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
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 400)}`));
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

// ── Entity helpers ────────────────────────────────────────────────────────────

function loc(map, locale) { return map[locale] ?? map.en; }

function placePayload(q) {
  const country = entities[q.params.country];
  const capital = entities[q.answer];
  const tmplText = loc(
    {
      en: `What is the capital of {country}?`,
      es: `¿Cuál es la capital de {country}?`,
      fr: `Quelle est la capitale de {country} ?`,
      ja: `{country}の首都はどこですか？`,
      pt: `Qual é a capital de {country}?`,
    },
    LOCALE
  ).replace('{country}', loc(country.labels, LOCALE));

  return {
    id:       q.id,
    country:  loc(country.labels, LOCALE),
    capital:  loc(capital.labels, LOCALE),
    question: tmplText,
  };
}

// ── Generation pass ───────────────────────────────────────────────────────────

async function generateBatch(batch) {
  const payload = batch.map(q => placePayload(q));

  const resp = await apiCall({
    model:       GEN_MODEL,
    max_tokens:  2048,
    temperature: 0.7,
    system: [{
      type:          'text',
      text:          GEN_SYSTEM,
      cache_control: { type: 'ephemeral' },
    }],
    messages: [{
      role:    'user',
      content: `Generate flavor for each place below. Return the JSON array only.\n\n${JSON.stringify(payload)}`,
    }],
  });

  const text  = resp.content?.[0]?.text ?? '';
  const usage = resp.usage ?? {};
  process.stdout.write(
    `  gen cache_read=${usage.cache_read_input_tokens ?? 0}` +
    ` cache_create=${usage.cache_creation_input_tokens ?? 0}` +
    ` out=${usage.output_tokens ?? 0}\n`
  );

  let parsed;
  try {
    const clean = text.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'').trim();
    parsed = JSON.parse(clean);
  } catch {
    throw new Error(`Could not parse generation response: ${text.slice(0, 300)}`);
  }
  return Array.isArray(parsed) ? parsed : (parsed.results ?? []);
}

// ── Review pass ───────────────────────────────────────────────────────────────

async function reviewBatch(batch, generated, flavor) {
  const payload = generated.map(item => {
    const q = batch.find(b => b.id === item.id);
    if (!q) return null;
    return {
      id:         item.id,
      country:    loc(entities[q.params.country].labels, LOCALE),
      capital:    loc(entities[q.answer].labels, LOCALE),
      commentary: item.commentary,
      hint:       item.hint,
      funFact:    item.funFact,
    };
  }).filter(Boolean);

  const resp = await apiCall({
    model:       REVIEW_MODEL,
    max_tokens:  1024,
    temperature: 0,
    system: [{
      type:          'text',
      text:          REVIEW_SYSTEM,
      cache_control: { type: 'ephemeral' },
    }],
    messages: [{
      role:    'user',
      content: `Review these entries for ${LANGUAGE_NAME}.\n\n${JSON.stringify(payload)}`,
    }],
  });

  const text  = resp.content?.[0]?.text ?? '';
  const usage = resp.usage ?? {};
  process.stdout.write(
    `  rev cache_read=${usage.cache_read_input_tokens ?? 0}` +
    ` out=${usage.output_tokens ?? 0}\n`
  );

  let reviews;
  try {
    const clean = text.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'').trim();
    reviews = JSON.parse(clean);
  } catch {
    console.warn(`  Could not parse review response — skipping review for this batch`);
    return;
  }

  const reviewMap = Object.fromEntries((Array.isArray(reviews) ? reviews : []).map(r => [r.id, r]));
  for (const item of generated) {
    const r = reviewMap[item.id];
    if (!r) continue;
    if (r.verdict !== 'accept') {
      console.warn(`  [review] ${item.id} → ${r.verdict}: ${r.reason}`);
      // Remove from flavor if already written by a previous step
      const entry = flavor[item.id];
      if (entry) {
        const loc_commentary = entry.commentary?.[LOCALE];
        if (loc_commentary) {
          delete entry.commentary[LOCALE];
          if (Object.keys(entry.commentary).length === 0) delete entry.commentary;
        }
        if (entry.hint?.[LOCALE]) {
          delete entry.hint[LOCALE];
          if (Object.keys(entry.hint).length === 0) delete entry.hint;
        }
        if (entry.funFact?.[LOCALE]) {
          delete entry.funFact[LOCALE];
          if (Object.keys(entry.funFact).length === 0) delete entry.funFact;
        }
      }
    } else {
      if (r.nativeness < 4) console.warn(`  [review] ${item.id} nativeness=${r.nativeness} (below threshold but accepted)`);
    }
  }
}

// ── Merge into flavor ─────────────────────────────────────────────────────────

function mergeResults(batch, results, flavor) {
  let saved = 0;
  for (const item of results) {
    if (!item.id || !item.commentary?.correct || !item.commentary?.wrong || !item.hint) {
      console.warn(`  Incomplete result for ${item.id} — skipping`);
      continue;
    }
    const q = batch.find(b => b.id === item.id);
    if (!q) { console.warn(`  Unknown id ${item.id} — skipping`); continue; }

    const entry = flavor[item.id] ?? {};

    // commentary
    entry.commentary        = entry.commentary ?? {};
    entry.commentary[LOCALE] = { correct: item.commentary.correct, wrong: item.commentary.wrong };

    // hint
    entry.hint        = entry.hint ?? {};
    entry.hint[LOCALE] = item.hint;

    // funFact
    entry.funFact        = entry.funFact ?? {};
    entry.funFact[LOCALE] = item.funFact ?? null;

    // metadata
    entry._voice_meta        = entry._voice_meta ?? {};
    entry._voice_meta[LOCALE] = {
      model:       GEN_MODEL,
      promptVer:   PROMPT_VER,
      generatedAt: new Date().toISOString().slice(0, 10),
    };

    flavor[item.id] = entry;
    saved++;
  }
  return saved;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const flavor = fs.existsSync(FLAVOR_PATH)
    ? JSON.parse(fs.readFileSync(FLAVOR_PATH, 'utf8'))
    : {};

  // Questions that need voice data for this locale
  const todo = questions
    .filter(q => q.template === 'capital_of_country' && flavor[q.id])
    .filter(q => !flavor[q.id]?.commentary?.[LOCALE])
    .slice(0, LIMIT === Infinity ? undefined : LIMIT);

  if (todo.length === 0) {
    console.log(`No pending entries for locale "${LOCALE}". Run generate_flavor.js first to seed distractors.`);
    return;
  }

  console.log(`Locale: ${LOCALE} (${LANGUAGE_NAME})`);
  console.log(`Model: ${GEN_MODEL}${DO_REVIEW ? ` + review: ${REVIEW_MODEL}` : ''}`);
  console.log(`Generating voice for ${todo.length} entries in batches of ${BATCH_SIZE}…\n`);

  let done = 0;
  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const total    = Math.ceil(todo.length / BATCH_SIZE);
    process.stdout.write(`Batch ${batchNum}/${total} (${batch.map(q => q.id).join(', ')})\n`);

    let results;
    try {
      results = await generateBatch(batch);
    } catch (err) {
      console.error(`  Generation failed: ${err.message}`);
      continue;
    }

    const saved = mergeResults(batch, results, flavor);
    fs.writeFileSync(FLAVOR_PATH, JSON.stringify(flavor, null, 2) + '\n');

    if (DO_REVIEW && results.length > 0) {
      try {
        await reviewBatch(batch, results.filter(r => flavor[r.id]?.commentary?.[LOCALE]), flavor);
        fs.writeFileSync(FLAVOR_PATH, JSON.stringify(flavor, null, 2) + '\n');
      } catch (err) {
        console.warn(`  Review pass failed: ${err.message}`);
      }
    }

    done += saved;
    if (i + BATCH_SIZE < todo.length) await sleep(300);
  }

  console.log(`\nDone. ${done} entries updated → data/flavor.json (locale: ${LOCALE})`);
}

main().catch(err => { console.error('\nFatal:', err.message); process.exit(1); });
