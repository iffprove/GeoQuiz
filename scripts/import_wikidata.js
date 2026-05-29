'use strict';

/**
 * Pulls sovereign countries + capitals from Wikidata and writes data/entities.json.
 *
 * Usage:  node scripts/import_wikidata.js
 *
 * Phases:
 *   1. SPARQL: get (country QID, ISO-3166-1 alpha-2, capital QID) for all ~200 countries.
 *   2. SPARQL: fetch rdfs:label in en/es/fr/ja/pt for every collected QID (batched, 80/req).
 *   3. SPARQL: fetch skos:altLabel in en/es/fr/ja/pt for every QID (batched, 80/req).
 *   4. Build entities, merge with existing data (new wins), write with .bak backup.
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const LOCALES       = ['en', 'es', 'fr', 'ja', 'pt'];
const ENTITIES_PATH = path.join(__dirname, '../data/entities.json');
const BATCH         = 80;   // QIDs per SPARQL VALUES clause
const RETRY_MAX     = 4;
const USER_AGENT    = 'GeoTrivia-importer/1.0 (https://github.com/iffprove/geoquiz; educational)';

// ── HTTP helpers ─────────────────────────────────────────────────────────────

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/sparql-results+json', ...headers },
    };
    const req = https.request(options, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode === 429 || res.statusCode >= 500) {
          reject(Object.assign(new Error(`HTTP ${res.statusCode}`), { retryable: true }));
        } else if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
        } else {
          try { resolve(JSON.parse(body)); }
          catch (e) { reject(new Error(`JSON parse: ${e.message}`)); }
        }
      });
    });
    req.on('error', e => reject(Object.assign(e, { retryable: true })));
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function sparql(query, attempt = 1) {
  const url = 'https://query.wikidata.org/sparql?' + new URLSearchParams({ query, format: 'json' });
  try {
    return await httpsGet(url);
  } catch (err) {
    if (err.retryable && attempt <= RETRY_MAX) {
      const wait = 2 ** attempt * 1000;
      console.warn(`  [retry ${attempt}/${RETRY_MAX}] ${err.message} — waiting ${wait}ms`);
      await sleep(wait);
      return sparql(query, attempt + 1);
    }
    throw err;
  }
}

// ── Entity-ID helpers ────────────────────────────────────────────────────────

function toEntityId(str) {
  return str
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function qid(uri) { return uri.split('/').pop(); }

// ── SPARQL queries ───────────────────────────────────────────────────────────

async function fetchPairs() {
  console.log('Phase 1: fetching country–capital pairs…');
  // P31=Q6256 (sovereign state), P297=ISO-3166-1-alpha-2, P36=capital
  // Exclude items where the "capital" property points to multiple values by
  // taking DISTINCT; Wikidata sometimes has rank-deprecated extras.
  const result = await sparql(`
    SELECT DISTINCT ?country ?iso2 ?capital WHERE {
      ?country wdt:P31  wd:Q6256 ;
               wdt:P297 ?iso2    ;
               wdt:P36  ?capital .
    }
    ORDER BY ?iso2
  `);
  const pairs = result.results.bindings.map(r => ({
    countryQid: qid(r.country.value),
    iso2:       r.iso2.value.toUpperCase(),
    capitalQid: qid(r.capital.value),
  }));
  console.log(`  → ${pairs.length} pairs found.`);
  return pairs;
}

async function fetchLabels(qids) {
  console.log(`Phase 2: fetching labels for ${qids.length} entities (${Math.ceil(qids.length / BATCH)} batches)…`);
  const map = {};
  const langList = LOCALES.map(l => `"${l}"`).join(', ');
  let done = 0;
  for (let i = 0; i < qids.length; i += BATCH) {
    const chunk = qids.slice(i, i + BATCH);
    const vals  = chunk.map(q => `wd:${q}`).join(' ');
    const res   = await sparql(`
      SELECT ?entity ?label WHERE {
        VALUES ?entity { ${vals} }
        ?entity rdfs:label ?label .
        FILTER(LANG(?label) IN (${langList}))
      }
    `);
    for (const row of res.results.bindings) {
      const q = qid(row.entity.value);
      const lang = row.label['xml:lang'];
      if (!map[q]) map[q] = {};
      map[q][lang] = row.label.value;
    }
    done += chunk.length;
    process.stdout.write(`  → ${done}/${qids.length}\r`);
    await sleep(600);
  }
  console.log();
  return map;
}

async function fetchAliases(qids) {
  console.log(`Phase 3: fetching aliases for ${qids.length} entities (${Math.ceil(qids.length / BATCH)} batches)…`);
  const map = {};
  const langList = LOCALES.map(l => `"${l}"`).join(', ');
  let done = 0;
  for (let i = 0; i < qids.length; i += BATCH) {
    const chunk = qids.slice(i, i + BATCH);
    const vals  = chunk.map(q => `wd:${q}`).join(' ');
    const res   = await sparql(`
      SELECT ?entity ?alias WHERE {
        VALUES ?entity { ${vals} }
        ?entity skos:altLabel ?alias .
        FILTER(LANG(?alias) IN (${langList}))
      }
    `);
    for (const row of res.results.bindings) {
      const q = qid(row.entity.value);
      const lang = row.alias['xml:lang'];
      if (!map[q])       map[q]       = {};
      if (!map[q][lang]) map[q][lang] = [];
      map[q][lang].push(row.alias.value);
    }
    done += chunk.length;
    process.stdout.write(`  → ${done}/${qids.length}\r`);
    await sleep(600);
  }
  console.log();
  return map;
}

// ── Build + merge ────────────────────────────────────────────────────────────

function buildEntity(type, extra, labelsMap, aliasMap, qidKey) {
  const labelsOut  = {};
  const aliasesOut = {};
  for (const locale of LOCALES) {
    const label = labelsMap[qidKey]?.[locale]
               ?? labelsMap[qidKey]?.['en']
               ?? '';
    labelsOut[locale] = label;
    const raw = aliasMap[qidKey]?.[locale] ?? [];
    // Deduplicate: label first, then aliases (normalized comparison)
    const seen  = new Set([label.toLowerCase()]);
    const clean = [label];
    for (const a of raw) {
      const k = a.toLowerCase();
      if (!seen.has(k)) { seen.add(k); clean.push(a); }
    }
    aliasesOut[locale] = clean;
  }
  return { type, ...extra, labels: labelsOut, aliases: aliasesOut };
}

async function main() {
  const pairs    = await fetchPairs();
  const allQids  = [...new Set([...pairs.map(p => p.countryQid), ...pairs.map(p => p.capitalQid)])];
  const labelsMap = await fetchLabels(allQids);
  const aliasMap  = await fetchAliases(allQids);

  console.log('Phase 4: building entities…');
  const existing   = fs.existsSync(ENTITIES_PATH)
    ? JSON.parse(fs.readFileSync(ENTITIES_PATH, 'utf8'))
    : {};

  const newEntities   = {};
  const capitalIdUsed = {};   // capitalQid → entityId (dedup shared capitals)
  let skipped = 0;

  for (const { countryQid, iso2, capitalQid } of pairs) {
    const capitalEnLabel = labelsMap[capitalQid]?.['en'];
    if (!capitalEnLabel) {
      console.warn(`  skip ${iso2}: no English label for capital ${capitalQid}`);
      skipped++;
      continue;
    }

    // Country
    newEntities[iso2] = buildEntity('country', {}, labelsMap, aliasMap, countryQid);

    // Capital (handle rare shared capitals by reusing the same entity ID)
    let capitalId = capitalIdUsed[capitalQid];
    if (!capitalId) {
      capitalId = toEntityId(capitalEnLabel);
      capitalIdUsed[capitalQid] = capitalId;
    }
    newEntities[capitalId] = buildEntity('city', { country: iso2 }, labelsMap, aliasMap, capitalQid);
  }

  const merged = { ...existing, ...newEntities };

  if (fs.existsSync(ENTITIES_PATH)) {
    fs.copyFileSync(ENTITIES_PATH, ENTITIES_PATH + '.bak');
    console.log('  Backup written to entities.json.bak');
  }

  fs.writeFileSync(ENTITIES_PATH, JSON.stringify(merged, null, 2) + '\n');

  const countries = Object.values(merged).filter(e => e.type === 'country').length;
  const cities    = Object.values(merged).filter(e => e.type === 'city').length;
  console.log(`\nDone. ${countries} countries, ${cities} cities written (${skipped} skipped).`);
  console.log(`Run  node scripts/generate_questions.js  to rebuild questions.json.`);
}

main().catch(err => { console.error('\nFatal:', err.message); process.exit(1); });
