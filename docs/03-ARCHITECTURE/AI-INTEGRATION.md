# AI Integration

Purpose: how generation works, how the key is protected, and how we keep output grounded.
Last updated: 2026-07-30

Decision context in [ADR-0002](../08-DECISIONS/ADR-0002-SHARED-KEY-BEHIND-PROXY.md).

## Shape

```
Browser (src/ai/client.ts)
  │  POST /api/generate
  │  Body: { task, text, options }
  │  Header: X-User-Key  (only if the user supplied their own)
  │  No project key. Nothing in the bundle to steal.
  ▼
Vercel Node Function (api/generate.ts)
  │  1. Origin check
  │  2. Kill switch
  │  3. Quota: per-IP daily, then global daily
  │  4. Assemble prompt + JSON response schema
  │  5. Call provider
  │  6. Validate: schema-valid? every item cited?
  │  7. Drop ungrounded items, return the rest
  ▼
Google Gemini 2.5 Flash (free tier)
```

The key lives only in Vercel environment variables. It is never in a bundle, never in a repository, never in a log, and never in a response.

## Why the proxy exists at all

Because a shared key in client code is a published secret. It gets scraped, it gets drained, and the consequence lands on the project owner's Google account. There is no way to obscure a key that ships to a browser.

The proxy also earns three extra benefits:

- **Prompts can be improved without a client release**, which matters a lot early on when prompt quality is the main lever on output quality.
- **Validation happens server-side**, so an ungrounded question is dropped before it can reach a student.
- **Abuse has one chokepoint** to measure and to close.

## Tasks

One endpoint, discriminated by `task`.

| Task | Produces |
|---|---|
| `quiz` | An array of questions |
| `flashcards` | An array of front/back and cloze cards |
| `explain` | An explanation at a requested depth |
| `exam` | Questions plus instructions and an answer key |
| `chat` | An answer with citations |
| `expandQuery` | Synonyms for BM25, tier-2 retrieval only |

Prompts and schemas in [PROMPT-LIBRARY.md](PROMPT-LIBRARY.md). Wire format in [API-CONTRACTS.md](API-CONTRACTS.md).

## Structured output

Every task except `chat` requests a strict JSON schema via Gemini's `responseSchema`. This is the single most valuable property of the provider choice: the model returns parseable JSON conforming to a declared shape, rather than prose we have to extract JSON from.

Without it, the failure mode is a model wrapping JSON in a markdown fence, or trailing an apology after the closing brace, and a brittle parser trying to cope. With it, parsing is reliable.

We still validate, because schema conformance is not the same as correctness.

## Grounding — the rule that matters most

**Nothing generated may be shown to a user without a citation to the source document.**

A study tool that invents facts is worse than no tool, because the student memorises the wrong thing and finds out during the exam.

Enforced in three places:

**1. In the prompt.** Every prompt states that content must come only from the provided text, that a page number is required for every item, and that if the text does not cover the requested topic the model must say so rather than answer from general knowledge.

**2. In the schema.** Citation fields are required, not optional. A response missing them is not schema-valid.

**3. In server-side validation.** For every returned item:

- Does it carry a page number within the document's actual page range?
- Does the cited page exist in the text we sent?
- For quotes, does the quoted string actually appear in the source text, allowing for whitespace normalisation?

Items failing any check are dropped before the response is returned. If more than half of a batch fails, the whole request is retried once with a stricter prompt; if it fails again, we return an honest error rather than weak content.

This is deliberately strict. Returning eight good questions instead of ten is fine. Returning one invented question is not.

## Retries

| Condition | Behaviour |
|---|---|
| Network failure | Retry twice, exponential backoff, 1s then 3s |
| Provider 429 | Retry once after the `Retry-After` interval; then quota-exhausted error |
| Provider 5xx | Retry twice with backoff |
| Malformed JSON | Retry once with a stricter instruction |
| Over half of items ungrounded | Retry once with a stricter prompt |
| Second failure of any kind | Honest error to the user, partial results kept |

Retries are capped. A generous retry policy against a shared free quota burns the pool for everyone.

## Cancellation

Every request is cancellable via `AbortController`. When a user cancels, any partial result already produced is kept rather than discarded. Long generations, such as a fifty-question exam, are batched so cancelling mid-way still yields usable output.

## Quota handling

Three counters in Upstash Redis:

| Counter | Purpose |
|---|---|
| Per-IP daily | Stops one user draining the shared pool |
| Global daily | Hard stop below the provider's real limit, so we fail with our own message |
| Kill switch | A flag that disables shared-key generation without a redeploy |

The global ceiling is set below the provider's actual free-tier limit, so hitting our own limit produces a clear message whereas hitting the provider's produces an opaque one.

**Public sources disagree on Gemini's exact free-tier requests-per-day figure**, citing 250 to 1,500 depending on model and date. So the ceiling is a configuration value, set from Google's official rate-limit page before launch and reviewed periodically. It is never hardcoded in documentation or source. See [ZERO-COST-INFRASTRUCTURE.md](../04-OPERATIONS/ZERO-COST-INFRASTRUCTURE.md).

Requests carrying a user-supplied key bypass both quota counters entirely, since they cost us nothing.

### When the quota is spent

The response says what happened, when it resets in the user's local time, and offers the bring-your-own-key path with a link to where a free key comes from.

It never says "upgrade". It never mentions payment. Everything already stored keeps working offline.

## Bring your own key

The escape hatch that lets the product survive popularity.

- User pastes a free key in settings
- Stored in IndexedDB, in that browser only
- Sent as a request header on that user's own requests
- The proxy uses it in place of the project key
- Never logged, never persisted server-side, never sent anywhere except the provider

The settings screen states all of this plainly, and includes a three-step guide to getting a free key from Google AI Studio. A user with their own key is limited only by their own free tier.

## Mock mode

The app runs with no API key at all, returning fixture responses from `src/ai/mock/`.

Three things this enables:

- A contributor can work on the interface without credentials, which removes the largest onboarding barrier for the student-contributor persona
- End-to-end tests are deterministic and consume no quota
- Development does not burn the shared pool

Enabled by an environment flag. Mock responses include the awkward cases too: an ungrounded item that validation should drop, a malformed response, and a quota-exhausted error.

## Cost control

| Lever | Effect |
|---|---|
| Send only relevant text | Tier-2 retrieval sends chunks, not whole books |
| Batch generation | One request for twenty questions, not twenty requests |
| Cache aggressively | Identical generations are never repeated; results are stored locally |
| No embeddings | Zero calls for indexing. [ADR-0006](../08-DECISIONS/ADR-0006-BM25-RETRIEVAL-NOT-EMBEDDINGS.md) |
| Capped retries | Failure does not multiply into quota burn |
| Cheap model | Flash, not Pro |
| Client-side where possible | Scoring, scheduling, ranking, and export all need no model at all |

The request count is the binding constraint on the free tier, not the token count. So batching is the highest-value optimisation available, and it is why generation is designed around one request per batch rather than per item.

## Privacy

| Rule |
|---|
| Original files never leave the device |
| Only the text needed for the current request is sent |
| Prompts and document text are never logged, server-side or client-side |
| Only aggregate counters are recorded, with no user identifier |
| IP addresses are used for the rate-limit window only, and not retained beyond it |
| User-supplied keys are never logged or stored server-side |

Full statement in [SECURITY-AND-PRIVACY.md](../04-OPERATIONS/SECURITY-AND-PRIVACY.md).

## Runtime constraint

`api/` runs on Vercel's Node.js runtime — the same environment as local development, no restricted API surface. Detail in [CODING-STANDARDS.md](../05-ENGINEERING/CODING-STANDARDS.md).

## Fallback provider

OpenRouter free models are documented as a fallback but not implemented in v1.

Note for whoever implements it: OpenRouter caps free models at 20 requests per minute and its free-model roster changes constantly. Model IDs must be configuration, never constants, and a missing model must degrade gracefully rather than break generation.
