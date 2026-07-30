# Deployment

Purpose: how to get this running on Vercel today, and what changes once the real AI proxy is built.
Last updated: 2026-07-30

Host choice rationale in [ADR-0009](../08-DECISIONS/ADR-0009-VERCEL-OVER-CLOUDFLARE-PAGES.md), which supersedes [ADR-0003](../08-DECISIONS/ADR-0003-CLOUDFLARE-PAGES-OVER-VERCEL.md).

**Current status:** the app runs entirely on `src/ai/mock/` fixtures (`IS_MOCK_MODE = true` in `src/ai/client.ts`). No Gemini key, no serverless function, and no quota store exist yet. Everything below in "Deploying today" gets the real, working app (real parsing, real storage, real spaced repetition — just mock-generated content) live for $0. The "Turning on real AI generation" section at the end describes what changes later, when that part is built.

## Deploying today

### Prerequisites

| Requirement | Cost |
|---|---|
| Vercel account | Free |
| GitHub repository | Free |
| Node 20 or later | Free |

### 1. Create the Vercel project

In the Vercel dashboard, import the GitHub repository, then confirm:

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 20 |

### 2. Deploy

Push to `main`. Vercel builds and deploys automatically.

### 3. Verify

Work through this list against the live deployment:

- [ ] The landing page loads
- [ ] Upload a PDF, `.docx`, `.pptx`, or `.epub`; it parses; no network request carries file contents (check the network tab — parsing is entirely client-side)
- [ ] Generate a quiz and flashcards; questions appear with page citations
- [ ] Ask-your-document chat returns an answer with a citation
- [ ] Export a deck to CSV; export and restore a backup file
- [ ] Go offline (dev tools, or airplane mode); the app shell still loads and card review still works
- [ ] Install to a phone home screen; it opens standalone
- [ ] Lighthouse: accessibility 95 or above

## Environments

| Environment | Trigger | Purpose |
|---|---|---|
| Production | Push to `main` | The live site |
| Preview | Any pull request | Automatic per-PR URL, on Vercel's own domain |

Preview URLs are public but unlisted. Nothing sensitive exists in them, since there is no server-side data at all yet.

## Local development

```bash
git clone <repo>
cd ScholarForgeAI
npm install
npm run dev
```

No `.env` file needed yet — there is nothing to configure until the AI proxy exists. Runs entirely on `src/ai/mock/` fixtures, so a contributor can work on the whole interface with no credentials.

## CI

`.github/workflows/ci.yml`, on every push and pull request:

```
1. npm ci
2. npm run typecheck
3. npm run lint
4. npm test
5. npm run build
6. Bundle size check          — fail if initial JS exceeds 300 KB gzipped
7. Secret scan on the bundle  — fail if anything key-shaped appears
8. Payment-language scan      — fail if src/ mentions upgrades, trials, paywalls
```

A separate `accessibility` job builds, serves the app, and runs an axe-core audit against every route.

Vercel handles deployment separately, so CI does not deploy.

## Headers and redirects

Both live in `vercel.json` at the repo root (there is no `public/_headers` or `public/_redirects` — those are Cloudflare Pages conventions, removed when the host changed):

- `rewrites`: the SPA fallback (`/(.*)` → `/index.html`), required or a direct visit to any route other than `/` 404s.
- `headers`: CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, plus long-lived immutable caching on `/assets/*` and `/fonts/*` (safe because Vite hashes filenames).

## Rolling back

Vercel keeps every previous deployment. Select an earlier one and promote it to production from the dashboard.

Note the one thing to check after a rollback: if a released version added a Dexie schema version, rolling the client back does not roll back a user's local database. Old code must therefore tolerate a newer schema, or the rollback breaks for anyone who already upgraded. This is why every migration must be additive. See [DATA-MODEL.md](../03-ARCHITECTURE/DATA-MODEL.md).

## Custom domain

Optional. The default `<project>.vercel.app` URL is free and adequate for a portfolio link.

If a domain is available, add it in the Vercel dashboard; Vercel provisions the certificate automatically. Once fixed, update `og:image`/`twitter:image` in `index.html` and `<loc>` in `public/sitemap.xml` to absolute URLs (both are currently relative placeholders, noted inline in the sitemap).

## Costs

$0 on Vercel's Hobby tier. Its terms prohibit commercial use and pause the site at the free bandwidth cap — both accepted here since this is a personal portfolio deployment, not a project inviting third-party forks to self-host at scale (see [ADR-0009](../08-DECISIONS/ADR-0009-VERCEL-OVER-CLOUDFLARE-PAGES.md)). Revisit if that changes.

## Turning on real AI generation

Not built yet — planned, not coded, per the project owner's explicit choice. When ready:

1. Get a free Gemini API key from Google AI Studio, and check its current rate limits on Google's official page (this number must never be hardcoded from memory — it changes without notice, see [ZERO-COST-INFRASTRUCTURE.md](ZERO-COST-INFRASTRUCTURE.md)).
2. Sign up for [Upstash](https://upstash.com) Redis free tier — this replaces the Workers KV quota store from the original Cloudflare plan, since Vercel Hobby has no included free key-value store.
3. Implement `api/generate.ts` (Vercel's serverless function convention) following the shape already specified in [ADR-0002](../08-DECISIONS/ADR-0002-SHARED-KEY-BEHIND-PROXY.md) and [RATE-LIMITING-AND-ABUSE.md](RATE-LIMITING-AND-ABUSE.md): origin check, kill switch, per-IP and global daily counters via Upstash, request-size cap, bring-your-own-key bypass, fail closed if Upstash is unreachable.
4. Add `.env.example` documenting `GEMINI_API_KEY`, `GEMINI_MODEL`, `DAILY_GLOBAL_LIMIT`, `DAILY_IP_LIMIT`, `ALLOWED_ORIGIN`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
5. Set those as environment variables in the Vercel dashboard (`GEMINI_API_KEY` and the Upstash token as **Secrets**, not plain — plain variables are readable in the dashboard and logs), for both Production and Preview. Give Preview a separate, lower-limit key if possible.
6. Flip `IS_MOCK_MODE` to `false` in `src/ai/client.ts` and replace the three exported functions with real `fetch('/api/generate', ...)` calls — the file's own comment already describes this as the single seam.
7. Add the two verification steps this unlocks: `GEMINI_API_KEY` never appears in the deployed JS bundle, and `/api/generate` rejects a request carrying a foreign `Origin` header.
8. Record the change in [ACTIVITY-LOG.md](../ACTIVITY-LOG.md) and update the "Current status" note at the top of this file.
