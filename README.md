# GeoTrivia (working title)

A multilingual geography trivia game built so that **adding a language is a data
task, not a code change**.

## Design in one breath

- **`data/entities.json`** — the single source of truth. Every place is a stable
  ID (`FR`, `PARIS`) with per-locale labels and accepted-answer aliases.
- **`data/question_templates.json` + `data/questions.json`** — phrasing and
  question instances. Questions reference entity IDs only; answers are entity IDs.
- **`data/ui_strings.json`** — UI chrome per locale.
- **`localization.js`** — the engine: locale fallback, Unicode normalization,
  locale-aware answer checking, template rendering.

## Run it

```bash
node demo.js
```

You'll see one question rendered in five languages and fuzzy, diacritic-insensitive
answer checking (`PARÍS`, `brasilia`, `東京`, the `Tokio` alias all match).

## Add a language

1. Add the locale's label + aliases to each entity in `entities.json`.
2. Add the locale's phrasing to each template in `question_templates.json`.
3. Add the locale's chrome to `ui_strings.json`.

No code changes. Anything missing falls back to English automatically.

## License

MIT — see `LICENSE`.
