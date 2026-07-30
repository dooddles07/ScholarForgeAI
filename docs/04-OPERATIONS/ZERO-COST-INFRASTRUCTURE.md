# Zero-Cost Infrastructure

Purpose: prove the whole thing runs at $0, name every limit, and state what degrades at each one.
Last updated: 2026-07-30

**Rule for this document:** every entry names the service, the specific limit, and what happens when that limit is reached. "It's free" is not an acceptable entry.

## Total monthly cost

**$0.** Not a trial, not credits, not a promotional period.

## Every service

| Service | Purpose | Free tier | Behaviour at the limit |
|---|---|---|---|
| Cloudflare Pages | Static hosting | Unlimited bandwidth, unlimited sites, 500 builds/month, commercial use permitted | Builds beyond 500 queue until the next month; the live site keeps serving |
| Cloudflare Pages Functions | AI proxy | Approx. 100,000 requests/day | Requests beyond the cap fail; the static app still loads and offline features still work |
| Cloudflare Workers KV | Quota counters | Free daily read/write allowance | Counter writes fail; we fail closed and disable shared-key generation rather than allow unlimited use |
| Google Gemini API | Generation | Free tier, no credit card. Per-model RPM and RPD caps. Daily reset at 00:00 Pacific. | Provider returns 429; we surface an honest message with the reset time and offer bring-your-own-key |
| GitHub | Repository, issues, releases | Free, unlimited for public repositories | None reachable |
| GitHub Actions | CI | 2,000 minutes/month for public repos | Actually unlimited for public repositories; our usage is trivial regardless |
| IndexedDB | All user storage | Browser-dependent, typically a percentage of free disk | Warn at 80%, block new uploads at 95%, prompt deletion and export |

## The binding constraint

Only one limit will realistically be reached: **the Gemini free-tier daily request count.** Everything else has enormous headroom.

### The number

Public sources disagree, citing anywhere from 250 to 1,500 requests per day depending on model and on when the source was written. Rate limits also change without notice.

**So we do not hardcode it.** The global daily ceiling is a configuration value:

1. Set from Google's official rate-limit documentation immediately before launch
2. Set *below* the real limit, so we fail with our own clear message rather than an opaque provider error
3. Reviewed at least quarterly, and after any provider announcement
4. Recorded in [ACTIVITY-LOG.md](../ACTIVITY-LOG.md) whenever changed

Writing a specific figure into source code or documentation guarantees it becomes wrong. This is the one number in the project that must stay configurable.

### What happens when it runs out

| Effect | Detail |
|---|---|
| New generation stops | Quizzes, cards, explanations, exams, chat |
| Everything already made keeps working | Fully, including offline |
| The user is told plainly | What happened, and the reset time in their local time |
| An alternative is offered | Bring your own free key, with a three-step guide |
| No payment is suggested | Ever. See [CONTENT-AND-COPY-GUIDE.md](../02-DESIGN/CONTENT-AND-COPY-GUIDE.md) |

This is a designed state, not a failure. It is expected to happen, and handling it well is a feature.

### Why this is survivable

Because of bring-your-own-key. A user with their own free key is subject only to their own quota, so the product scales to any number of users at zero cost to the project. The shared key is a convenience for first-time visitors, not the mechanism the product depends on.

That is the whole reason the escape hatch exists. See [ADR-0002](../08-DECISIONS/ADR-0002-SHARED-KEY-BEHIND-PROXY.md).

## How each cost was designed away

| Would normally cost | Our approach | Saving |
|---|---|---|
| File storage | Files parsed in the browser, never uploaded | All storage cost |
| Upload bandwidth | Files never transit the network | All ingress cost |
| Database | IndexedDB on the device | All database cost |
| Authentication service | No accounts | All auth cost |
| Vector database | No embeddings at all | Storage and API cost |
| Embedding API calls | BM25 keyword retrieval in the browser | Thousands of calls per large upload |
| PDF generation library | Browser print-to-PDF | Bundle weight and any service cost |
| Text-to-speech service | Web Speech API | All TTS cost |
| Analytics platform | No analytics | All analytics cost |
| CDN | Included with Cloudflare Pages | All CDN cost |
| Error monitoring service | Aggregate counters only | All monitoring cost |
| Webfonts | System font stack | Bandwidth and a layout-shift problem |

The pattern throughout: move work to the user's device, where compute is already paid for.

The two largest savings are client-side parsing ([ADR-0005](../08-DECISIONS/ADR-0005-CLIENT-SIDE-PARSING.md)) and no embeddings ([ADR-0006](../08-DECISIONS/ADR-0006-BM25-RETRIEVAL-NOT-EMBEDDINGS.md)). Either one, done the conventional way, would make the project cost money at very modest usage.

## Rejected because it costs money

| Option | Cost | Rejected because |
|---|---|---|
| Vercel Hobby | $0, but prohibits commercial use and pauses at the bandwidth cap | Pausing during exam season is unacceptable, and the prohibition would burden everyone who forks the project. [ADR-0003](../08-DECISIONS/ADR-0003-CLOUDFLARE-PAGES-OVER-VERCEL.md) |
| Supabase | $0 tier, but pauses after 7 idle days | Study traffic is seasonal, so the pause would trigger exactly when a student returns. [ADR-0001](../08-DECISIONS/ADR-0001-LOCAL-FIRST-STORAGE.md) |
| OpenAI or Anthropic APIs | No permanent free tier | Fails the constraint outright |
| Pinecone or similar | Free tier exists, but we need no vectors | Unnecessary dependency |
| Google Play developer account | One-time fee | Breaks zero cost. [ADR-0007](../08-DECISIONS/ADR-0007-PWA-OVER-NATIVE.md) |
| Apple Developer account | Annual fee | Breaks zero cost, and recurring means the project goes dark the year nobody pays |
| A custom domain | Annual fee | Optional. `pages.dev` subdomain is free. If a domain is ever donated, fine. |
| Sentry or similar | Free tier exists | Conflicts with the no-tracking commitment |

## Fallback plans

What we do if a free tier disappears or degrades.

| If this happens | Then |
|---|---|
| Gemini free tier ends or shrinks badly | Switch the default to OpenRouter free models, and promote bring-your-own-key from escape hatch to primary path. The provider is behind one module, so this is a contained change. |
| Cloudflare Pages changes its terms | Move to Netlify or Cloudflare's paid $5 tier. Static output plus one function is portable to almost anything. |
| Workers KV becomes unavailable | Rate limiting degrades to in-memory per-instance counters, which is weaker but functional; or shared-key generation is disabled and BYOK becomes required. |
| All free AI tiers disappear | The product becomes bring-your-own-key only. Every non-AI feature — review, saved quizzes, exams, exports, dashboard — continues working. |

The architecture is deliberately arranged so that losing the AI provider degrades the product rather than killing it. Everything already generated is stored locally and keeps working.

## Costs a self-hoster faces

Someone forking the project needs:

| Requirement | Cost |
|---|---|
| A Cloudflare account | Free |
| A Google AI Studio API key | Free |
| A GitHub account | Free |
| A domain | Optional; `pages.dev` is free |

**Total: $0.** No licensing trap, since every dependency is permissively licensed and Cloudflare permits commercial use. Steps in [SELF-HOSTING-GUIDE.md](../07-OPEN-SOURCE/SELF-HOSTING-GUIDE.md).

## Verification

Before each release, per [DEFINITION-OF-DONE.md](../05-ENGINEERING/DEFINITION-OF-DONE.md):

1. Every dependency in [TECH-STACK.md](../03-ARCHITECTURE/TECH-STACK.md) appears in the table above, or is a free npm package
2. No new service has been added without a row here naming its limit and its degradation
3. `npx license-checker --summary` shows only permissive licences
4. The Cloudflare dashboard shows $0
5. The Gemini global ceiling matches Google's current published limit

## Standing commitment

If a feature cannot be built for $0, it does not get built. This constraint has already improved the architecture: it is what produced client-side parsing, local-first storage, and no-embeddings retrieval — all of which are better designs for this product than the conventional paid alternatives would have been.
