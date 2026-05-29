'use strict';

/**
 * Generates data/questions.json from data/entities.json.
 *
 * For every city whose `country` field points to a known country entity:
 *   - one "capital_of_country" question  (country → city)
 *   - one "country_of_capital" question  (city → country)
 *
 * Usage:  node scripts/generate_questions.js
 *
 * Safe to re-run; always overwrites questions.json fully.
 */

const fs   = require('fs');
const path = require('path');

const ENTITIES_PATH  = path.join(__dirname, '../data/entities.json');
const QUESTIONS_PATH = path.join(__dirname, '../data/questions.json');

const entities = JSON.parse(fs.readFileSync(ENTITIES_PATH, 'utf8'));

const questions = [];

for (const [id, entity] of Object.entries(entities)) {
  if (entity.type !== 'city') continue;
  const countryId = entity.country;
  if (!countryId || !entities[countryId]) continue;

  questions.push({
    id: `cap_${countryId}`,
    template: 'capital_of_country',
    params: { country: countryId },
    answer: id,
  });

  questions.push({
    id: `ctry_${id}`,
    template: 'country_of_capital',
    params: { city: id },
    answer: countryId,
  });
}

// Sort for stable diffs
questions.sort((a, b) => a.id.localeCompare(b.id));

fs.writeFileSync(QUESTIONS_PATH, JSON.stringify(questions, null, 2) + '\n');
console.log(`Wrote ${questions.length} questions (${questions.length / 2} country–capital pairs) to questions.json`);
