# ADR-0003 — Host on Cloudflare Pages rather than Vercel

**Status:** Accepted
**Date:** 2026-07-30

## Context

We need static hosting for the built single-page app, plus a small serverless function for the AI proxy described in [ADR-0002](ADR-0002-SHARED-KEY-BEHIND-PROXY.md), plus a key-value store for quota counters. All permanently free.

Vercel was the initial assumption, since it is the default choice for React projects. Checking the actual terms changed the answer.

## Decision

**Cloudflare Pages**, with Pages Functions for the AI proxy and Workers KV for quota counters.

## Why

Comparing the free tiers as of July 2026:

| | Cloudflare Pages | Vercel Hobby |
|---|---|---|
| Bandwidth | Unlimited | 100 GB/month |
| Builds | 500/month | 100/month |
| Sites | Unlimited | Limited |
| **Commercial use** | **Allowed** | **Explicitly prohibited** |
| Behaviour at the cap | Keeps serving | **Site paused until next month** |
| Serverless functions | Pages Functions, ~100k requests/day | Included, with limits |
| Key-value store | Workers KV, free tier included | Not included free |
| Next paid tier | $5/month flat | $20/user/month |

Three of those rows decided it.

**Commercial use.** Vercel's Hobby plan prohibits any revenue-generating use. ScholarForge AI generates no revenue, so we would technically be compliant. But this is an open-source project we are actively encouraging people to fork and self-host, including potentially by schools and tutoring services. Recommending a host whose free tier forbids commercial use would be handing every downstream user a licensing trap. Cloudflare permits commercial use on the free tier, so the self-hosting guide can be written without caveats.

**Behaviour at the limit.** When a Vercel Hobby project exceeds its bandwidth allowance, the site is paused until the next billing month. For a study tool, exam season is exactly when traffic spikes and exactly when going dark is least acceptable. Cloudflare keeps serving.

**Workers KV is included.** We need a persistent counter for the quota system. Cloudflare gives us one on the free tier. On Vercel we would need an external service, which means another dependency with another free tier to monitor.

The unlimited bandwidth and the higher build allowance are pleasant extras rather than deciding factors.

## Alternatives considered

### Vercel Hobby

**Rejected** on the commercial-use prohibition and the pause-at-cap behaviour. Excellent developer experience, and the natural fit if we were using Next.js, but the terms are wrong for a project designed to be forked.

### Netlify free tier

**Rejected.** Comparable to Vercel in shape, with a bandwidth cap and no included key-value store. No advantage over Cloudflare for our case.

### GitHub Pages

**Rejected.** Static only. No serverless functions, so there is nowhere to hide the API key. That alone disqualifies it, since the whole architecture depends on a server-side secret.

### Hugging Face Spaces

**Rejected.** Viable free compute, but designed around ML demos rather than web app hosting, with sleep-on-idle behaviour and a slow cold start that would be visible to users.

### Self-hosted on a free-tier VPS

**Rejected.** Free VPS offerings are trials, credit-limited, or require a card. None of them are permanently free, which fails the core constraint. It also means we would be maintaining a server.

## Consequences

### Easier

- No bandwidth ceiling to worry about, ever
- Functions and key-value storage in the same platform as the static hosting, so one dashboard and one deploy
- Genuine global edge distribution, which helps students on slow connections far from any origin
- The self-hosting guide can be written without licensing caveats
- If we ever did outgrow free, the paid tier is $5/month flat rather than per-seat

### Harder

- Pages Functions run on the Workers runtime, not Node.js. Not every npm package works. The proxy must stick to Web-standard APIs: `fetch`, `Request`, `Response`, Web Crypto. This is a real constraint on the server-side code and must be stated in [CODING-STANDARDS.md](../05-ENGINEERING/CODING-STANDARDS.md).
- Local development of functions requires Wrangler rather than a plain dev server
- Workers KV is eventually consistent, so quota counters can briefly drift. Acceptable for rate limiting; we set the global ceiling below the provider's real limit to absorb it.
- Less abundant tutorial material than Vercel, which slightly raises the barrier for a first-time contributor. Mitigated by writing [DEPLOYMENT.md](../04-OPERATIONS/DEPLOYMENT.md) properly.

## Note

This decision interacts with [ADR-0004](ADR-0004-VITE-SPA-OVER-NEXTJS.md). Choosing Cloudflare makes a plain Vite SPA more attractive than Next.js, because deploying Next.js to Cloudflare requires an adapter and carries edge-runtime caveats, whereas static output plus a function is exactly what the platform is built for.
