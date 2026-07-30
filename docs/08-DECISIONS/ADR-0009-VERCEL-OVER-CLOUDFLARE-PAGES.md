# ADR-0009 — Host on Vercel rather than Cloudflare Pages

**Status:** Accepted
**Date:** 2026-07-30
**Supersedes:** [ADR-0003](ADR-0003-CLOUDFLARE-PAGES-OVER-VERCEL.md)

## Context

ADR-0003 chose Cloudflare Pages for the reasons documented there: unlimited free bandwidth, no pause-at-cap behaviour, commercial use allowed, and Workers KV included free for the AI proxy's quota counters.

This is a solo portfolio project, not a multi-tenant service expecting fork-and-self-host traffic at scale. The owner has decided to deploy on Vercel instead, for familiarity and workflow reasons. This ADR records the change and what it costs us.

## Decision

**Vercel**, using Vercel Serverless/Edge Functions for the AI proxy (see [ADR-0002](ADR-0002-SHARED-KEY-BEHIND-PROXY.md)) once it is built.

## Consequences

- No included free key-value store on Vercel Hobby. The quota counters described in [RATE-LIMITING-AND-ABUSE.md](../04-OPERATIONS/RATE-LIMITING-AND-ABUSE.md) move to **Upstash Redis free tier**, which integrates with Vercel and stays inside its free quota at this project's traffic level.
- Vercel Hobby's commercial-use prohibition and pause-at-cap behaviour (both flagged as risks in ADR-0003) are accepted here, since this deployment is a personal portfolio site, not a project actively inviting third-party forks to self-host at scale. If that changes later, re-open this decision.
- The AI proxy function moves from `functions/api/generate.ts` (Cloudflare Pages Functions convention) to `api/generate.ts` (Vercel's convention).
- `vercel.json` carries the security headers (CSP, HSTS, etc.) previously in `public/_headers`; `public/_redirects` is removed since the SPA rewrite is already in `vercel.json`.
- ADR-0004's note about Cloudflare making a plain Vite SPA attractive still holds independently — Vite SPA remains the right call regardless of host.
