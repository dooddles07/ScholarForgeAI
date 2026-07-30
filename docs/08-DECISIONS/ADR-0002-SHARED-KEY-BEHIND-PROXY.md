# ADR-0002 — One shared AI key, held server-side behind a proxy

**Status:** Accepted
**Date:** 2026-07-30

## Context

Every generative feature in the product needs a language model. The zero-cost constraint means a free API tier. The no-signup constraint means a new user must get results without configuring anything.

Those two requirements pull against each other. Free AI tiers are keyed per account, and a stranger arriving at the site does not have an account.

The project owner chose to supply **one shared key for everyone**, so that nobody has to set anything up.

That choice is right on user experience and dangerous on implementation, for one specific reason: **an API key present in client-side code is public.** Not obscured, not hard to find — public. Bundled JavaScript can be read by anyone who opens developer tools, and automated scrapers hunt for exactly this pattern. A key shipped to the browser gets found and drained, typically within days, and the key belongs to the project owner's Google account.

So the decision is not *whether* to use a shared key. It is *where the key lives*.

## Decision

**One shared key, stored as a server-side secret in a Cloudflare Pages Function, never sent to the browser.**

The architecture:

```
Browser
  │  POST /api/generate  { task, documentText, options }
  │  No key in the request. No key anywhere in the bundle.
  ▼
Cloudflare Pages Function
  ├── reads GEMINI_API_KEY from environment secrets
  ├── checks a per-IP daily counter in Workers KV
  ├── checks the global daily counter
  ├── assembles the prompt and the required JSON response schema
  └── calls Gemini, validates the response, returns it
  ▼
Google Gemini 2.5 Flash, free tier
```

Four protections around the shared key:

1. **Per-IP daily quota.** A generous but finite number of generations per IP per day, so one person cannot drain the shared pool.
2. **Global daily ceiling.** A hard stop below the provider's actual limit, so we always fail with our own clear message rather than an opaque provider error.
3. **Origin check.** Requests are accepted only from our own origin, which raises the cost of casual abuse.
4. **Bring your own key.** Any user can paste their own free key. It is stored in their browser only, forwarded on their own requests, and completely bypasses our shared quota. This is the escape hatch when the shared pool runs dry, and it is what lets the product survive becoming popular.

**Provider:** Google Gemini 2.5 Flash on the free tier. No credit card required, a very large context window that lets us send whole documents rather than building retrieval infrastructure, and native structured-JSON output via `responseSchema`, which matters enormously for reliably parsing quizzes and flashcards.

**Fallback provider:** OpenRouter free models, documented but not implemented in v1. Note for whoever implements it: OpenRouter's free roster changes constantly, so the model ID must be configuration, never a hardcoded constant.

**On free-tier numbers:** public sources disagree on Gemini's exact requests-per-day figure for the free tier, citing anywhere from 250 to 1,500 depending on model and date. We therefore do not hardcode a number in the documentation or the code. The global ceiling is a configuration value to be set from Google's official rate-limit page immediately before launch, and reviewed periodically. See [ZERO-COST-INFRASTRUCTURE.md](../04-OPERATIONS/ZERO-COST-INFRASTRUCTURE.md).

## Alternatives considered

### Shared key directly in the client bundle

**Rejected.** This was the naive reading of "shared key for everyone". The key would be extractable by anyone within minutes and scraped automatically within days. It would then be drained by strangers, and the bill and the ban would land on the project owner's Google account. There is no mitigation for a secret you have published.

### Bring your own key only, with no shared key

**Rejected.** Technically the cleanest option: no key to protect, no quota to manage, infinite scale at zero cost. But it puts a configuration wall in front of every single new user before they see any value. For the primary persona that is fatal. Kept as the escape hatch rather than the default.

### Fully local in-browser model

**Rejected.** WebLLM or transformers.js would eliminate keys, servers, and quotas entirely, and would be perfectly private. But it needs a download of roughly a gigabyte, a capable GPU, and it produces markedly worse questions. It is unusable on the mid-range phones that are our target hardware.

### A user-facing free-tier proxy service

**Rejected.** Adds a third-party dependency with its own uptime, its own terms, and its own eventual pricing change, in exchange for solving a problem we can solve with about eighty lines of code in a function we already have.

## Consequences

### Easier

- Zero setup for a new user; results appear on the first visit
- The key is never exposed, so it cannot be scraped from the bundle
- Prompts live server-side, which means they can be improved without shipping a client release
- Abuse is measurable and stoppable, because everything passes one chokepoint
- Structured JSON output makes parsing generated content reliable

### Harder

- We now have server-side code, small as it is, which means a deployment concern and a place bugs can hide
- The shared quota is finite, and popularity will exhaust it. This is not a failure mode to be prevented; it is a condition to be handled well.
- A serverless function adds latency to every generation
- The per-IP counter is imperfect: users behind shared NAT will share a bucket, and a determined abuser can rotate addresses. Accepted as good enough.
- We must keep a manual kill switch, in case something goes badly wrong with the key

### Things we must build because of this decision

- The Pages Function proxy, with prompt assembly and response validation
- Per-IP and global quota counters in Workers KV
- Honest quota-exhausted messaging, including the reset time in the user's local time
- The bring-your-own-key flow, including a short guide to obtaining a free key
- A kill switch that disables shared-key generation without a redeploy
- Aggregate-only request counters, with no user identifiers and no retained request content

## Non-negotiable rules that follow

1. `GEMINI_API_KEY` must never appear in any client bundle, any committed file, or any log.
2. A user-supplied key must never be transmitted to our servers for storage, and must never be logged.
3. Prompt content and document text must never be logged. Only counters.
4. Quota exhaustion must never be presented as an upsell. No payment is ever suggested anywhere in this product.
