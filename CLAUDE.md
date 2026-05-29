# GeoTrivia — Claude Code context

## Architecture

Three-layer design. Never collapse the layers.

1. **Data layer** (`data/`) — JSON only, no logic. All entity IDs are uppercase
   strings (e.g. `FR`, `PARIS`). Answers in questions.json are always entity IDs,
   never display strings.
2. **Engine layer** (`localization.js`) — pure functions, no I/O. Unicode
   normalization (NFD + diacritic strip) before any string comparison.
3. **App layer** (`demo.js`, future front-end) — calls engine, never reads data
   files directly.

## Invariants to preserve

- **Answers are entity IDs.** `questions.json#answer` is always an entity ID like
  `PARIS`, never a display string like `"Paris"`.
- **Locale fallback is always English.** If a locale key is missing anywhere
  (entity label, alias list, template, UI string), fall back to `en`. Never
  throw on a missing locale.
- **LLM writes flavor, never facts.** If an LLM is used to generate commentary or
  distractors, it reads from `entities.json` for factual claims — it does not
  invent country names, capitals, or coordinates.

## Adding content

- **New entity:** add to `data/entities.json` with `labels` and `aliases` for all
  supported locales.
- **New question type:** add template to `question_templates.json`, add instances
  to `questions.json`.
- **New locale:** add the locale key to every entity's `labels`+`aliases`, every
  template, and every UI string. No code changes required.

## Running

```bash
node demo.js
```

No dependencies. Requires Node.js 18+.
