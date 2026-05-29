'use strict';

const { renderQuestion, checkAnswer, entityLabel, ui } = require('./localization');
const questions = require('./data/questions.json');

const LOCALES = ['en', 'es', 'fr', 'ja', 'pt'];

// Pick the first question (capital of France) for the multilingual render demo.
const q = questions[0];

console.log('=== GeoTrivia — multilingual render demo ===\n');

for (const locale of LOCALES) {
  const { text, answer } = renderQuestion(q, locale);
  console.log(`[${locale}] ${text}`);
  console.log(`    Answer entity : ${answer} (${entityLabel(answer, locale)})`);
}

console.log('\n=== Fuzzy answer-checking demo ===\n');

const testCases = [
  { input: 'PARÍS',     locale: 'es', entity: 'PARIS' },
  { input: 'brasilia',  locale: 'en', entity: 'BRASILIA' },
  { input: '東京',       locale: 'ja', entity: 'TOKYO' },
  { input: 'Tokio',     locale: 'en', entity: 'TOKYO' },
  { input: 'tokyo',     locale: 'fr', entity: 'TOKYO' },
  { input: 'berlin',    locale: 'de', entity: 'BERLIN' },  // 'de' not in data → falls back to 'en'
  { input: 'Berlim',    locale: 'pt', entity: 'BERLIN' },
  { input: 'Le Caire',  locale: 'fr', entity: 'CAIRO' },
  { input: 'Wrong',     locale: 'en', entity: 'PARIS' },
];

for (const { input, locale, entity } of testCases) {
  const ok = checkAnswer(input, entity, locale);
  const mark = ok ? '✓' : '✗';
  console.log(`  ${mark}  input="${input}"  locale=${locale}  entity=${entity}`);
}

console.log('\n=== UI strings demo ===\n');

const demoLocales = ['en', 'es', 'ja'];
for (const locale of demoLocales) {
  console.log(`[${locale}]`);
  console.log(`  ${ui('correct', locale)}`);
  console.log(`  ${ui('wrong', locale, { answer: entityLabel('PARIS', locale) })}`);
  console.log(`  ${ui('score', locale, { score: 3, total: 5 })}`);
}
