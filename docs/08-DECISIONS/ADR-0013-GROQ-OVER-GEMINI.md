# ADR-0013 — Generate with Groq rather than Google Gemini

**Status:** Accepted
**Date:** 2026-07-31
**Supersedes:** [ADR-0002](ADR-0002-SHARED-KEY-BEHIND-PROXY.md)'s choice of Gemini as the provider (its shared-key-behind-a-proxy architecture is unchanged)

## Context

[ADR-0002](ADR-0002-SHARED-KEY-BEHIND-PROXY.md) chose Gemini for its free tier, its 1M-token context window, and native structured JSON output. Two of those three turned out to be shakier than expected in practice: `gemini-2.5-flash` was retired for new API keys mid-project without notice, and the free tier's daily request cap measured as low as 20/day on regular Flash models (500/day on Lite) during this project's own testing.

The owner decided to move to Groq. Everything below was verified against the live Groq API before committing to it, not taken from documentation.

## Decision

**Groq, on `openai/gpt-oss-120b`**, via its OpenAI-compatible `POST /openai/v1/chat/completions` endpoint. `api/_lib/gemini.ts` became `api/_lib/groq.ts`; the module's public surface is otherwise unchanged, so `api/generate.ts` only swapped its imports.

### The model choice is forced, not preferred

Only `openai/gpt-oss-120b` and `openai/gpt-oss-20b` support strict `json_schema` on Groq. `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `qwen/qwen3.6-27b` and `groq/compound` all reject the request outright with a 400. Structured output is not a nice-to-have here — the grounding rule depends on every item carrying a chunk id — so this rules those models out entirely. Chose the 120b over the 20b for output quality; measured latency was 1–3.5s, comfortably better than Gemini's 4–8s.

### The schemas had to be rewritten

Groq's strict mode is stricter than Gemini's `responseSchema` in two ways, both of which reject the old schemas with a 400:

- every object must set `additionalProperties: false`
- every property must appear in that object's `required` array

Optional fields (`options`, `correctIndex`, `correctAnswer`, `topic`) are therefore expressed as nullable unions (`type: ['string', 'null']`) and always present. The model returns explicit `null` rather than omitting the key, and `RawQuestionItem`/`RawCardItem` changed to match. Downstream mapping in `src/ai/client.ts` already used falsy checks, so it needed no change beyond types.

## Consequences

### The hard one: 8,000 tokens per minute

This is the constraint that actually shapes the product. Groq's free tier allows 1,000 requests/day — better than Gemini — but caps at **8,000 tokens per minute**. The binding limit is no longer the model's context window (131k) but that per-minute budget.

`MAX_CHARS` in `api/generate.ts` dropped from **400,000 to 24,000** — a 16× cut. That ends the "send the whole document" retrieval tier described in [ADR-0006](ADR-0006-BM25-RETRIEVAL-NOT-EMBEDDINGS.md); passage selection is now mandatory for every request, not just long ones.

Selection happens client-side, which also keeps more of the document on the device:

- **Chat** has a query, so `bm25Rank` picks the passages that actually matter. This is what BM25 was built for and it is now genuinely load-bearing.
- **Questions and cards** have no query. A new pure function, `selectSpread` (`src/domain/retrieval/select-spread.ts`), walks the document at an even stride within the character budget. Taking the first N chunks instead would draw every question from the opening pages, which is close to useless for a textbook.

**This is a real product change, not just a config tweak.** Questions generated from a long document are now drawn from a representative sample of it rather than the whole text. A 200-page book contributes roughly 24k characters to any one request. Users are not currently told this — worth revisiting, since the project's own honesty rules (see the "some items dropped" copy) argue for saying so.

### Easier

- Faster generation, and a daily request ceiling roughly double Gemini Lite's.
- One less rolling-alias hazard: the model id is pinned to a real name rather than an alias that can silently repoint.

### Harder

- Model choice is constrained to two models by the structured-output requirement. If Groq drops strict schema support from the gpt-oss line, there is no drop-in replacement on the platform and this decision has to be reopened.
- The TPM cap makes long-document quality strictly worse than Gemini's whole-document context could have been.

## Revisit if

Groq's per-minute token budget rises (or a paid tier becomes acceptable), at which point `MAX_CHARS` and the selection strategy should be reconsidered together — the sampling exists only to fit that budget.
