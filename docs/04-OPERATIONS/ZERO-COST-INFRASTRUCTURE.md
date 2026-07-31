# Zero-Cost Infrastructure

Purpose: prove the whole thing runs at $0, name every limit, and state what degrades at each one.
Last updated: 2026-07-31

**Rule for this document:** every entry names the service, the specific limit, and what happens when that limit is reached. "It's free" is not an acceptable entry.

## Total monthly cost

**$0.** Not a trial, not credits, not a promotional period.

## Every service

| Service | Purpose | Free tier | Behaviour at the limit |
|---|---|---|---|
| Vercel Hobby | Static hosting | No included bandwidth allowance beyond a soft fair-use cap; commercial use prohibited; builds pause the project at the cap | Deploys stop until the next billing cycle or a plan upgrade; accepted risk for this portfolio project, see [ADR-0009](../08-DECISIONS/ADR-0009-VERCEL-OVER-CLOUDFLARE-PAGES.md) |
| Vercel Node Functions | AI proxy (`api/generate.ts`) | Included in Hobby; 60s max execution per invocation, generous monthly invocation allowance | Requests beyond the cap fail with a platform error; the static app still loads and offline features still work |
| Upstash Redis | Quota counters, kill switch | 256 MB storage, 500K commands/month, 10 GB bandwidth/month (free tier) | Counter writes fail; `api/_lib/quota.ts` fails closed and disables shared-key generation rather than allow unlimited use |
| Firebase Authentication | Google sign-in | Free, no cap reachable at this project's scale | N/A at this scale |
| Cloud Firestore (Spark plan) | Optional cloud sync backup (`backups/{uid}`) | 50K reads / 20K writes / 20K deletes per day, no inactivity pause | Sync fails with an honest inline error; local IndexedDB data is completely unaffected, see [ADR-0010](../08-DECISIONS/ADR-0010-OPTIONAL-CLOUD-SYNC.md) |
| Groq API | Generation | Free tier, no credit card. 1,000 requests/day and 8,000 tokens/minute on `openai/gpt-oss-120b`. | We stop before the provider does and surface an honest message with the reset time. There is no alternative path — see [ADR-0014](../08-DECISIONS/ADR-0014-REMOVE-BRING-YOUR-OWN-KEY.md) |
| GitHub | Repository, issues, releases | Free, unlimited for public repositories | None reachable |
| GitHub Actions | CI | 2,000 minutes/month for public repos | Actually unlimited for public repositories; our usage is trivial regardless |
| IndexedDB | All user storage | Browser-dependent, typically a percentage of free disk | Warn at 80%, block new uploads at 95%, prompt deletion and export |

## The binding constraint

Two Groq limits bind, and both are reachable: **the 1,000-requests/day ceiling**, and — more sharply — **the 8,000-tokens/minute cap**, which is what forces every request to send a selected slice of a document rather than the whole thing. See [ADR-0013](../08-DECISIONS/ADR-0013-GROQ-OVER-GEMINI.md). Everything else has enormous headroom.

### The number

Public sources disagree, citing anywhere from 250 to 1,500 requests per day depending on model and on when the source was written. Rate limits also change without notice.

**So we do not hardcode it.** The global daily ceiling is a configuration value:

1. Set from Groq's official rate-limit documentation immediately before launch
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
| No alternative is offered | Bring-your-own-key was removed, see [ADR-0014](../08-DECISIONS/ADR-0014-REMOVE-BRING-YOUR-OWN-KEY.md). The reset time is all we can honestly give |
| No payment is suggested | Ever. See [CONTENT-AND-COPY-GUIDE.md](../02-DESIGN/CONTENT-AND-COPY-GUIDE.md) |

This is a designed state, not a failure. It is expected to happen, and handling it well is a feature.

### Why this is survivable, and where it is not

Everything already generated is stored locally and keeps working, offline included. A spent quota costs a user new generation for the rest of the day, not their work.

**It is worth being blunt about the limit, though.** [ADR-0002](../08-DECISIONS/ADR-0002-SHARED-KEY-BEHIND-PROXY.md) originally argued the product "scales to any number of users at zero cost" because heavy users could bring their own key. [ADR-0014](../08-DECISIONS/ADR-0014-REMOVE-BRING-YOUR-OWN-KEY.md) removed that escape hatch, so the argument no longer holds. The project still costs $0 — but it stays there by refusing work once the ceiling is hit, not by routing around it. Popularity now degrades the product for everyone rather than absorbing itself.

## How each cost was designed away

| Would normally cost | Our approach | Saving |
|---|---|---|
| File storage | Files parsed in the browser, never uploaded | All storage cost |
| Upload bandwidth | Files never transit the network | All ingress cost |
| Database | IndexedDB on the device | All database cost |
| Authentication service | Firebase Auth's free tier, not a custom-built one | Building and hosting our own auth backend |
| Vector database | No embeddings at all | Storage and API cost |
| Embedding API calls | BM25 keyword retrieval in the browser | Thousands of calls per large upload |
| PDF generation library | Browser print-to-PDF | Bundle weight and any service cost |
| Text-to-speech service | Web Speech API | All TTS cost |
| Analytics platform | No analytics | All analytics cost |
| CDN | Included with Vercel Hobby | All CDN cost |
| Error monitoring service | Aggregate counters only | All monitoring cost |
| Webfonts | System font stack | Bandwidth and a layout-shift problem |

The pattern throughout: move work to the user's device, where compute is already paid for.

The two largest savings are client-side parsing ([ADR-0005](../08-DECISIONS/ADR-0005-CLIENT-SIDE-PARSING.md)) and no embeddings ([ADR-0006](../08-DECISIONS/ADR-0006-BM25-RETRIEVAL-NOT-EMBEDDINGS.md)). Either one, done the conventional way, would make the project cost money at very modest usage.

## Rejected because it costs money

| Option | Cost | Rejected because |
|---|---|---|
| Supabase | $0 tier, but pauses after 7 idle days | Study traffic is seasonal, so the pause would trigger exactly when a student returns. [ADR-0001](../08-DECISIONS/ADR-0001-LOCAL-FIRST-STORAGE.md) |
| OpenAI or Anthropic APIs | No permanent free tier | Fails the constraint outright |
| Pinecone or similar | Free tier exists, but we need no vectors | Unnecessary dependency |
| Google Play developer account | One-time fee | Breaks zero cost. [ADR-0007](../08-DECISIONS/ADR-0007-PWA-OVER-NATIVE.md) |
| Apple Developer account | Annual fee | Breaks zero cost, and recurring means the project goes dark the year nobody pays |
| A custom domain | Annual fee | Optional. The `*.vercel.app` subdomain is free. If a domain is ever donated, fine. |
| Sentry or similar | Free tier exists | Conflicts with the no-tracking commitment |

Vercel Hobby's commercial-use prohibition and pause-at-cap behaviour were the reason it was originally rejected in favour of Cloudflare Pages ([ADR-0003](../08-DECISIONS/ADR-0003-CLOUDFLARE-PAGES-OVER-VERCEL.md)). [ADR-0009](../08-DECISIONS/ADR-0009-VERCEL-OVER-CLOUDFLARE-PAGES.md) later reversed that call for familiarity/workflow reasons, accepting both risks explicitly since this is a solo portfolio project rather than one inviting third-party forks to self-host at scale.

## Fallback plans

What we do if a free tier disappears or degrades.

| If this happens | Then |
|---|---|
| Groq free tier ends or shrinks badly | Switch the default to OpenRouter free models. The provider is behind one module (`api/_lib/groq.ts`), so this is a contained change — but note the replacement must support strict JSON schema, which rules out most models. |
| Vercel changes its terms | Move to Netlify or Cloudflare Pages. Static output plus one Node function is portable to almost anything. |
| Upstash Redis becomes unavailable | Generation fails closed and is disabled entirely — with no BYOK fallback, there is no degraded mode left. |
| Firestore becomes unavailable | Cloud sync fails or is disabled; every local-only feature — review, quizzes, exams, exports, dashboard — keeps working, since sync is additive, not load-bearing. See [ADR-0010](../08-DECISIONS/ADR-0010-OPTIONAL-CLOUD-SYNC.md). |
| All free AI tiers disappear | Generation stops. Every non-AI feature — review, saved quizzes, exams, exports, dashboard — continues working, which is most of the product by volume. |

The architecture is deliberately arranged so that losing the AI provider degrades the product rather than killing it. Everything already generated is stored locally and keeps working.

## Costs a self-hoster faces

Someone forking the project needs:

| Requirement | Cost |
|---|---|
| A Vercel account | Free |
| An Upstash account | Free |
| A Groq API key | Free |
| A Firebase project | Optional; only needed for cloud sync |
| A GitHub account | Free |
| A domain | Optional; `*.vercel.app` is free |

**Total: $0.** No licensing trap, since every dependency is permissively licensed. Commercial use is against Vercel Hobby's terms, though — a self-hoster building on top of this for a commercial product needs Vercel Pro or another host. Steps in [SELF-HOSTING-GUIDE.md](../07-OPEN-SOURCE/SELF-HOSTING-GUIDE.md).

## Verification

Before each release, per [DEFINITION-OF-DONE.md](../05-ENGINEERING/DEFINITION-OF-DONE.md):

1. Every dependency in [TECH-STACK.md](../03-ARCHITECTURE/TECH-STACK.md) appears in the table above, or is a free npm package
2. No new service has been added without a row here naming its limit and its degradation
3. `npx license-checker --summary` shows only permissive licences
4. The Vercel, Upstash, and Firebase dashboards show $0
5. `DAILY_GLOBAL_LIMIT` sits below Groq's current published requests/day limit

## Standing commitment

If a feature cannot be built for $0, it does not get built. This constraint has already improved the architecture: it is what produced client-side parsing, local-first storage, and no-embeddings retrieval — all of which are better designs for this product than the conventional paid alternatives would have been.
