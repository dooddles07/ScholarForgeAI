# ADR-0014 — Remove bring-your-own-key; the shared key is the only key

**Status:** Accepted
**Date:** 2026-07-31
**Supersedes:** [ADR-0002](ADR-0002-SHARED-KEY-BEHIND-PROXY.md)'s bring-your-own-key escape hatch (its shared-key-behind-a-proxy architecture is unchanged)

## Context

[ADR-0002](ADR-0002-SHARED-KEY-BEHIND-PROXY.md) paired one shared API key with a bring-your-own-key (BYOK) escape hatch, and leaned on it hard. Its central claim: a user with their own key costs the project nothing, therefore **"the product scales to any number of users at zero cost"** and the shared key is a convenience for first-time visitors rather than the thing the product depends on. That argument is repeated in [RATE-LIMITING-AND-ABUSE.md](../04-OPERATIONS/RATE-LIMITING-AND-ABUSE.md) ("the mechanism that makes the whole design work") and [ZERO-COST-INFRASTRUCTURE.md](../04-OPERATIONS/ZERO-COST-INFRASTRUCTURE.md) ("that is the whole reason the escape hatch exists").

The owner decided that every visitor uses the owner's key, with no option to supply their own.

## Decision

**BYOK is removed entirely.** The Settings screen no longer accepts a key, `Settings.userApiKey` is gone from the data model, and `api/generate.ts` no longer reads an `apiKey` from the request body — every request now goes through the quota counters and uses `GROQ_API_KEY`.

Removed along with it: `src/ui/pages/settings/ApiKeyField.tsx`, `isPlausibleApiKey` and its tests in `api/_lib/security.ts`, the `byok` copy block, and the `INVALID_API_KEY` error code.

No Dexie migration was needed. An existing browser keeps an orphaned `userApiKey` value in its stored settings row; nothing reads it, and the schema (`settings: 'id'`) never indexed it.

## Consequences

### The shared quota is now a hard ceiling

This is the whole cost of the decision and it should not be understated. Previously, a spent daily quota was an inconvenience with a documented way out. Now, **when the shared quota is spent, generation stops for everyone until reset** — there is no alternative path for a motivated user.

The quota-exhausted copy changed accordingly: it now states the reset time and confirms that everything already made still works, and offers nothing else. Continuing to offer a key the app cannot accept would have been the exact dishonesty the project's copy rules exist to prevent.

Limits were raised to widen the margin, taking advantage of Groq's more generous daily allowance ([ADR-0013](ADR-0013-GROQ-OVER-GEMINI.md)): the in-code defaults moved from 50/10 to **800 global / 40 per-IP** per day, against Groq's measured 1,000/day. The Vercel dashboard values override these and are the real setting.

### ADR-0002's scaling argument no longer holds

Its cost model assumed heavy users would migrate to their own keys. Without that, per-user cost is bounded only by the quota ceiling, and popularity now degrades the product for everyone rather than routing around itself. The project stays at $0 — but it does so by refusing work, not by absorbing it.

### Easier

- One code path through generation instead of two. No key-format validation, no quota-bypass branch, no BYOK-specific error code or copy.
- Nothing in the product asks a student to go and create an API key, which was always a steep ask for the primary persona.

## Revisit if

Quota exhaustion becomes common enough to be the main thing users experience. The honest options at that point are raising the ceiling, moving to a paid provider tier (which breaks the $0 constraint), or reinstating BYOK — and this ADR should be superseded rather than quietly reversed.
