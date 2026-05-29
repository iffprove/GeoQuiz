# GeoTrivia — Positioning Guide for Developers

This is not marketing copy. It's the decision filter for what we build and what
we refuse to build. When you're unsure whether a feature is worth it, this
document answers the question. Read it alongside `CLAUDE.md` (which covers *how*
the code is structured); this covers *why the product exists*.

---

## The one line

**GeoTrivia is the geography game that feels like a local made it — in your
language, with your humour.**

Everything below is downstream of that sentence. If a feature doesn't make that
sentence more true, it's a distraction.

---

## The wedge (why we can win)

The geo-quiz genre is crowded and the big mechanics are already owned:

- Country-silhouette guessing → owned by Worldle
- Distance / hot-cold globe guessing → owned by Globle
- "Name the countries between A and B" → owned by Travle
- The green-square share grid → owned by Wordle and every clone

We do **not** compete on mechanic. We will lose that fight — those products have
years of habit, SEO, and community we can't out-execute from behind.

We compete on the one thing they structurally can't copy: **they are English-first,
single-voice products.** We are multilingual and locally-voiced by design. A game
that roasts a Brazilian player in idiomatic Portuguese and a Japanese player in a
completely different register — with hints and facts that land *culturally*, not
just translated — is a different product, not a better clone.

The five-language switcher is not a bonus feature. **It is the headline.**

---

## The decision filter (use this every time)

Before building anything, ask:

> **Does this make the game feel more native and alive in each language?**

- **Yes** → it's on-strategy. Prioritise it.
- **No, but it's standard retention hygiene** (streaks, fun facts) → fine, do it
  cheaply, don't over-invest.
- **No, it's a mechanic an incumbent already owns** → stop. Building it makes us a
  worse version of someone else.

If you ever catch yourself justifying a feature with "because [Worldle/Globle]
has it," that is the signal to *not* build it.

---

## What this means in the codebase

This positioning is already baked into the architecture — protect it:

- **The LLM flavor layer is the product, not a garnish.** Host commentary, hints,
  and fun-facts must be generated per-locale with a culturally-native voice and
  register, grounded in `entities.json` (LLM writes flavor, never facts — see
  `CLAUDE.md`). The quality bar for the *voice* is as high as the bar for
  correctness.
- **Per-locale tone is a first-class data field, not an afterthought.** A locale
  isn't just a translation table; it carries a personality (dry vs. warm vs.
  playful). Design the flavor cache so tone can differ by locale, not just words.
- **The share card is our only free acquisition channel — treat it as product,
  not export.** It must encode *our* identity: the language, the flag, the host's
  one-line verdict in that language. It must never be a generic green-square grid
  that blends in with a hundred other games. Give it real design budget.

---

## Psychology principles to build in (not bolt on)

1. **Streaks need forgiveness.** A streak (🔥) works through loss-aversion, but a
   brittle streak creates a churn cliff: the day someone breaks it, many quit for
   good. Ship a streak-freeze / repair mechanic from day one. A streak that
   survives one missed day retains far better than one that doesn't.

2. **Daily habit + endless depth.** A single daily puzzle is a great habit hook and
   the right thing to make shareable — but daily-only caps growth, because a new
   player who loves it can't binge, and bingeing is how word-of-mouth starts. Pair
   the daily puzzle (habit + share artifact) with an endless/practice mode
   (engagement + acquisition surface).

3. **Reward the learning.** The post-answer fun-fact isn't filler — it's the
   "I learned something" payoff that makes sharing feel good and the habit feel
   worthwhile. In our case it's also a showcase for the local voice. Invest in it.

---

## Build priority (given the wedge)

1. **Make the local voice excellent in the 5 shipped languages.** Flavor layer:
   host commentary, hints, fun-facts, with genuinely native tone per locale.
   This is the differentiator — it comes first.
2. **Redesign the share card** to encode language + identity.
3. **Streak forgiveness** + milestone badges.
4. **Endless/practice mode** alongside the daily puzzle.
5. *Only then*, if at all, consider a signature mechanic — and only one that
   amplifies the multilingual hook, never one borrowed from an incumbent.

---

## The anti-pattern to watch for

Polished, confident, genre-standard advice that sounds like strategy but is really
just "do what the market leaders already do." It's the default output of both
consultants and language models. Our entire edge is being the opposite of generic.
When something feels safe and obvious, check whether it's actually just
me-too in a nicer font.
