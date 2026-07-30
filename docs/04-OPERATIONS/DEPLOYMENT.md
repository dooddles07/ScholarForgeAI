# Deployment

Purpose: how to get this running on Cloudflare Pages, and how to operate it afterwards.
Last updated: 2026-07-30

Host choice rationale in [ADR-0003](../08-DECISIONS/ADR-0003-CLOUDFLARE-PAGES-OVER-VERCEL.md).

## Prerequisites

| Requirement | Cost |
|---|---|
| Cloudflare account | Free |
| Google AI Studio API key | Free |
| GitHub repository | Free |
| Node 20 or later | Free |
| Wrangler CLI | Free |

## First-time setup

### 1. Get a Gemini API key

1. Go to Google AI Studio and sign in
2. Create an API key
3. Note the model you intend to use and check its current rate limits on Google's official rate-limit page

Record that limit. You need it in step 4, and it is the one number in this project that must not be guessed. See [ZERO-COST-INFRASTRUCTURE.md](ZERO-COST-INFRASTRUCTURE.md).

### 2. Create the Pages project

In the Cloudflare dashboard, connect the GitHub repository, then set:

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 20 |

Functions in `functions/` are detected and deployed automatically. No extra configuration.

### 3. Create the KV namespace

```bash
npx wrangler kv namespace create QUOTA
```

Bind it to the Pages project as `QUOTA` in Settings, Functions, KV namespace bindings.

This holds the quota counters and the kill switch. See [RATE-LIMITING-AND-ABUSE.md](RATE-LIMITING-AND-ABUSE.md).

### 4. Set environment variables

In Settings, Environment variables. Set for both Production and Preview.

| Variable | Type | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | **Secret** | The project key |
| `GEMINI_MODEL` | Plain | Model id, for example `gemini-2.5-flash` |
| `DAILY_GLOBAL_LIMIT` | Plain | Set **below** the provider's real daily limit |
| `DAILY_IP_LIMIT` | Plain | Per-user daily allowance |
| `ALLOWED_ORIGIN` | Plain | The deployed origin |

`GEMINI_API_KEY` must be created as a **Secret**, not a plain variable. Plain variables are readable in the dashboard and appear in logs.

`DAILY_GLOBAL_LIMIT` set below the real limit is deliberate: it means users hit our clear message rather than an opaque provider error, and it absorbs the eventual consistency of KV counters.

### 5. Deploy

Push to `main`. Cloudflare builds and deploys automatically.

### 6. Verify

Work through this list against the live deployment:

- [ ] The landing page loads
- [ ] Upload a PDF; it parses; no network request carries file contents (check the network tab)
- [ ] Generate a quiz; questions appear with page citations
- [ ] `GEMINI_API_KEY` does not appear anywhere in the built bundle — search the deployed JS
- [ ] `/api/generate` rejects a request with a foreign `Origin` header
- [ ] Go offline; the app still loads and card review still works
- [ ] Install to a phone home screen; it opens standalone
- [ ] Lighthouse: accessibility 95 or above

The bundle key check is the one that matters most. Do it by searching the actual deployed JavaScript, not by reasoning about the code.

## Environments

| Environment | Trigger | Purpose |
|---|---|---|
| Production | Push to `main` | The live site |
| Preview | Any pull request | Automatic per-PR URL |

Preview deployments get their own environment variables. Give them a **separate, lower-limit key** if possible, so a preview cannot exhaust production's quota. If only one key is available, set `DAILY_GLOBAL_LIMIT` low on Preview.

Preview URLs are public but unlisted. Nothing sensitive exists in them, since there is no user data on the server.

## Local development

```bash
git clone <repo>
cd ScholarForgeAI
npm install
cp .env.example .env
npm run dev
```

Runs with `VITE_MOCK_AI=true` by default, so **no API key is needed**. Fixture responses come from `src/ai/mock/`.

This is deliberate: a contributor can work on the entire interface without credentials, which removes the biggest onboarding barrier. See [CONTRIBUTING.md](../07-OPEN-SOURCE/CONTRIBUTING.md).

To exercise the real function locally:

```bash
npm run build
npx wrangler pages dev dist --kv QUOTA
```

Wrangler is required because Pages Functions run on the Workers runtime, not Node, and a plain dev server cannot reproduce it.

### Environment files

```
.env.example      committed, placeholder values only
.env              gitignored, never committed
```

`.env` is in `.gitignore`, and a pre-commit hook scans staged changes for key-shaped strings. See [SECURITY-AND-PRIVACY.md](SECURITY-AND-PRIVACY.md).

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
8. npx playwright test        — with mock AI
9. axe-core accessibility     — fail on any violation
10. npm audit                 — fail on high or critical
```

Steps 6 and 7 are the ones specific to this project's constraints, and they are the ones most worth having.

Cloudflare handles deployment separately, so CI does not deploy.

## Headers and redirects

`public/_headers`:

```
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://generativelanguage.googleapis.com; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'none'

/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

`public/_redirects`:

```
/*  /index.html  200
```

The SPA fallback is required, otherwise a direct visit to any route other than `/` returns 404.

Hashed asset filenames make the immutable cache header safe.

## Operating it

### Rotating the key

Takes a couple of minutes and needs no redeploy.

1. Set the kill switch: `npx wrangler kv key put --binding=QUOTA killswitch true`
2. Revoke the old key in Google AI Studio
3. Create a new key
4. Update the `GEMINI_API_KEY` secret in the Cloudflare dashboard
5. Clear the kill switch: `npx wrangler kv key delete --binding=QUOTA killswitch`
6. Verify a generation works
7. Record it in [ACTIVITY-LOG.md](../ACTIVITY-LOG.md)

### The kill switch

Disables shared-key generation immediately, without a deployment.

```bash
# stop
npx wrangler kv key put --binding=QUOTA killswitch true

# resume
npx wrangler kv key delete --binding=QUOTA killswitch
```

While active, the proxy returns `SERVICE_DISABLED`, the interface explains generation is temporarily unavailable, and everything stored keeps working. Requests carrying a user-supplied key are unaffected, since they cost us nothing.

Use it if the key is compromised, if unexplained usage appears, or if the provider is behaving strangely.

### Adjusting limits

Change `DAILY_GLOBAL_LIMIT` or `DAILY_IP_LIMIT` in the dashboard. Takes effect on the next request; no redeploy needed.

Review `DAILY_GLOBAL_LIMIT` against Google's published limit at least quarterly.

### Rolling back

Cloudflare keeps previous deployments. Select an earlier one and promote it to production from the dashboard.

Note the one thing to check after a rollback: if a released version added a Dexie schema version, rolling the client back does not roll back a user's local database. Old code must therefore tolerate a newer schema, or the rollback breaks for anyone who already upgraded. This is why every migration must be additive. See [DATA-MODEL.md](../03-ARCHITECTURE/DATA-MODEL.md).

## Monitoring

Neither of these costs anything.

| Where | Watch for |
|---|---|
| Cloudflare dashboard | Request volume, function errors, build failures |
| Workers KV counters | Daily totals, quota-exhaustion events, error counts by code |

There is no alerting, because there is no free alerting that does not involve a third-party service. Check the dashboard periodically; the practical consequence of a missed problem is that generation stops, which users will report.

Detail in [MONITORING-AND-LIMITS.md](MONITORING-AND-LIMITS.md).

## Custom domain

Optional. `<project>.pages.dev` is free and adequate.

If a domain is available, add it in the dashboard; Cloudflare provisions the certificate automatically. Remember to update `ALLOWED_ORIGIN` and the CSP, or the origin check will reject every request from the new domain.

## Costs

$0. Confirm in the Cloudflare dashboard before each release, per [DEFINITION-OF-DONE.md](../05-ENGINEERING/DEFINITION-OF-DONE.md).
