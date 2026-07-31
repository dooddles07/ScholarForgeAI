# Rate Limiting and Abuse

Purpose: how the shared quota is protected and how running out is handled well.
Last updated: 2026-07-31

## The problem

One shared API key on a free tier, and an open endpoint that anyone can reach. Without protection, a single enthusiastic user or one script exhausts the day's allowance for everyone.

Two goals, and they pull against each other:

1. Stop one user consuming everyone's quota
2. Never make a legitimate student feel suspected

The second goal rules out CAPTCHAs, sign-in walls, and anything that treats the user as a probable attacker.

## Layers

Applied in order, cheapest first.

| Layer | Blocks | Cost |
|---|---|---|
| 1. Origin check | Casual scripted use from elsewhere | Free, no state |
| 2. Kill switch | Everything, in an emergency | One Upstash read |
| 3. Per-IP daily limit | One user draining the pool | One Upstash read/write |
| 4. Global daily ceiling | The project exceeding the provider's tier | One Upstash read/write |
| 5. Request size limit | Oversized requests burning tokens | Free |

### 1. Origin check

Requests are accepted only when `Origin` matches `ALLOWED_ORIGIN`.

This is a low bar. `Origin` is trivially forged outside a browser. It is worth having because it stops the laziest case — someone finding the endpoint and calling it from a script without thinking — at zero cost. It is not a security boundary and is not treated as one.

### 2. Kill switch

An Upstash Redis flag checked on every request. When set, shared-key generation returns `SERVICE_DISABLED`.

Exists so a problem can be stopped in seconds without a deployment. Operating instructions in [DEPLOYMENT.md](DEPLOYMENT.md).

There is no bypass: every request goes through the kill switch, since bring-your-own-key was removed ([ADR-0014](../08-DECISIONS/ADR-0014-REMOVE-BRING-YOUR-OWN-KEY.md)).

### 3. Per-IP daily limit

A counter keyed by a hash of the IP address plus the current date.

```
key:   ip:<sha256(ip + salt)>:<YYYY-MM-DD>
value: request count
ttl:   48 hours
```

The IP is hashed rather than stored, and the key expires automatically. We never hold a plaintext address, and nothing persists beyond the window. See [SECURITY-AND-PRIVACY.md](SECURITY-AND-PRIVACY.md).

**Setting the limit.** Generous enough that a genuinely hard study session never hits it. A student cramming might reasonably generate several quizzes, a few card decks, a handful of explanations, and an exam in one evening. The limit should sit comfortably above that, because a false positive is worse than a small amount of over-use.

Configured as `DAILY_IP_LIMIT`, adjustable without a redeploy.

**Known weaknesses, accepted:**

| Weakness | Response |
|---|---|
| Shared NAT means a whole campus or household shares one bucket | Real problem, and no longer mitigated by anything but a generous limit — bring-your-own-key used to be the answer here. |
| A determined abuser rotates addresses | The global ceiling caps total damage |
| Mobile networks reassign addresses frequently | Occasionally gives a user extra allowance. Harmless. |

The threat model here is casual over-use, not a targeted attack. Every visitor now signs in with Google ([ADR-0011](../08-DECISIONS/ADR-0011-MANDATORY-GOOGLE-SIGN-IN.md)), so keying the quota by account rather than by hashed IP is an available upgrade if IP-based limiting proves too blunt.

### 4. Global daily ceiling

A single counter for the whole project, keyed by date.

Set **below** the provider's real daily limit, so we fail with our own clear, honest message instead of an opaque provider 429.

The provider's figure changes without notice, so `DAILY_GLOBAL_LIMIT` is configuration set from Groq's console before launch and reviewed quarterly. It is never hardcoded. See [ZERO-COST-INFRASTRUCTURE.md](ZERO-COST-INFRASTRUCTURE.md).

### 5. Request size limit

Text over `MAX_CHARS` (24,000) is rejected before any provider call, returning `TEXT_TOO_LARGE`.

This limit is set by Groq's **8,000 tokens-per-minute** cap, not by the model's context window (131k) — the per-minute budget binds first by a wide margin. The client selects which passages to send so a long document still generates; see [ADR-0013](../08-DECISIONS/ADR-0013-GROQ-OVER-GEMINI.md).

## Counting rules

**Counters increment before the provider call, not after.**

That means a failed generation still consumes allowance. Deliberate: the request reached the provider and counted against the real limit, so not counting it would let our ceiling overrun the actual one.

The cost is that a user can lose an allowance unit to a provider failure. There are no retries at all today, so one failure cannot cascade — see [AI-INTEGRATION.md](../03-ARCHITECTURE/AI-INTEGRATION.md).

**Every request increments.** There is no longer a category of request that costs the project nothing.

## Fail closed

If Upstash is unavailable and a counter cannot be read or written, we **refuse the request** rather than allowing it.

The reasoning: allowing unlimited requests during an Upstash outage could burn the provider's entire daily allowance in minutes and potentially get the key rate-limited or flagged. A brief outage in which generation is unavailable is much less damaging than that.

Everything stored keeps working, as always.

## When the quota runs out

This is a designed state that is expected to occur, not an error. Handling it well is a product feature.

### What the user sees

> Today's free AI usage has run out.
>
> It resets tomorrow. Everything you have already made still works, including offline.

### What it never says

| Never | Why |
|---|---|
| "Upgrade" | There is no paid tier and never will be |
| "Premium" | Same |
| "Limit exceeded" | Sounds like the user did something wrong |
| "429" or any code | Internals are never shown |
| Anything about payment | Contradicts the whole premise |

### Warning before the wall

Not built today. There is no `quotaRemaining` value anywhere in the real response
(`api/generate.ts` returns only `items` or `content`/`citations` on success), so the interface has
no way to warn a user before they hit zero — they only find out at the moment a request actually
fails. A real gap, not a documented design choice.

## There is no escape hatch

Bring-your-own-key was removed in [ADR-0014](../08-DECISIONS/ADR-0014-REMOVE-BRING-YOUR-OWN-KEY.md). Everyone uses the project's shared key, and **when the daily quota is spent, generation stops for everyone until reset.**

This is the single biggest weakness in the current design, and it is worth stating plainly rather than burying. The original argument — that the product "scales to any number of users at zero cost" because heavy users bring their own key — no longer applies. Popularity now degrades the product for everyone instead of routing around itself.

The limits above are set generously against Groq's 1,000 requests/day to push that wall as far out as possible, but they do not remove it.

Wording in [CONTENT-AND-COPY-GUIDE.md](../02-DESIGN/CONTENT-AND-COPY-GUIDE.md).

## Deliberately not used

| Not using | Why |
|---|---|
| CAPTCHA | Treats every student as a suspect, is an accessibility barrier, and requires a third-party service |
| Quota keyed by account rather than IP | Not built. Sign-in is now mandatory, so this became possible — but it needs server-side token verification, which [ADR-0011](../08-DECISIONS/ADR-0011-MANDATORY-GOOGLE-SIGN-IN.md) put out of scope. |
| Device fingerprinting | A privacy violation, and trivially defeated |
| Proof-of-work | Wastes the battery of the exact low-end devices we are targeting |
| Email verification | Google sign-in already verifies identity; a separate step would be redundant friction |
| Paid tier as the overflow | There is no paid tier |

Each of these would reduce abuse and cost more in legitimate users than it saved. The global ceiling already caps the worst case, which makes aggressive per-user defence unnecessary.

## Monitoring

Aggregate counters only, no identifiers.

| Counter | Watch for |
|---|---|
| Daily global requests | Approaching the ceiling |
| Per-IP daily requests | A sudden rise may indicate abuse, or may indicate a campus behind one address |

That's the complete set `api/_lib/quota.ts` tracks — no separate exhaustion-event or per-error-code
counters exist. If the global counter is consistently maxed out early in the day, the response is
not to buy capacity. It is to raise the ceiling toward the provider's real limit, or add a
fallback provider.

Detail in [MONITORING-AND-LIMITS.md](MONITORING-AND-LIMITS.md).

## Escalation

| Situation | Response |
|---|---|
| Quota spent early, occasionally | Nothing. Working as intended. |
| Quota spent early, consistently | Raise the ceiling toward the provider's real limit; consider a fallback provider |
| One IP hitting the limit daily | Probably a shared network. Consider raising `DAILY_IP_LIMIT`. |
| Sudden implausible spike | Kill switch, investigate, rotate the key if needed |
| Key compromised | Kill switch, revoke, rotate. Procedure in [DEPLOYMENT.md](DEPLOYMENT.md) |
