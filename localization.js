'use strict';

const entities = require('./data/entities.json');
const templates = require('./data/question_templates.json');
const uiStrings = require('./data/ui_strings.json');

const FALLBACK_LOCALE = 'en';

// Normalize a string for fuzzy comparison: lowercase, strip diacritics, collapse whitespace.
function normalize(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// Get a localized value from a per-locale map, falling back to FALLBACK_LOCALE.
function localize(map, locale) {
  return map[locale] ?? map[FALLBACK_LOCALE];
}

// Get the display label for an entity in the given locale.
function entityLabel(entityId, locale) {
  const entity = entities[entityId];
  if (!entity) throw new Error(`Unknown entity: ${entityId}`);
  return localize(entity.labels, locale);
}

// Get all accepted answer aliases for an entity in the given locale.
// Merges locale aliases with en aliases (deduped by normalized form) so
// cross-locale spellings like "Brasilia"/"Brasília" both match everywhere.
function entityAliases(entityId, locale) {
  const entity = entities[entityId];
  if (!entity) throw new Error(`Unknown entity: ${entityId}`);
  const localeAliases = entity.aliases[locale] ?? [];
  const enAliases = entity.aliases[FALLBACK_LOCALE] ?? [];
  const seen = new Set();
  const merged = [];
  for (const alias of [...localeAliases, ...enAliases]) {
    const key = normalize(alias);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(alias);
    }
  }
  return merged;
}

// Check whether a player's input matches an entity, fuzzy and diacritic-insensitive.
function checkAnswer(input, entityId, locale) {
  const inputNorm = normalize(input);
  const aliases = entityAliases(entityId, locale);
  return aliases.some(alias => normalize(alias) === inputNorm);
}

// Render a question template for a given question definition and locale.
// Returns { text, answer } where answer is an entity ID.
function renderQuestion(question, locale) {
  const templateMap = templates[question.template];
  if (!templateMap) throw new Error(`Unknown template: ${question.template}`);
  let text = localize(templateMap, locale);
  for (const [key, entityId] of Object.entries(question.params)) {
    text = text.replace(`{${key}}`, entityLabel(entityId, locale));
  }
  return { text, answer: question.answer };
}

// Render a UI string, substituting {key} placeholders from the vars object.
function ui(key, locale, vars = {}) {
  const map = uiStrings[key];
  if (!map) throw new Error(`Unknown UI string: ${key}`);
  let str = localize(map, locale);
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(`{${k}}`, v);
  }
  return str;
}

module.exports = { entityLabel, entityAliases, checkAnswer, renderQuestion, ui, normalize };
