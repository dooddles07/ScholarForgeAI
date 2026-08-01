# Deployment

Purpose: how to get this running on Vercel, real AI generation included.
Last updated: 2026-07-31

Host choice rationale in [ADR-0009](../08-DECISIONS/ADR-0009-VERCEL-OVER-CLOUDFLARE-PAGES.md), which supersedes [ADR-0003](../08-DECISIONS/ADR-0003-CLOUDFLARE-PAGES-OVER-VERCEL.md). Shared-key proxy design in [ADR-0002](../08-DECISIONS/ADR-0002-SHARED-KEY-BEHIND-PROXY.md) and [RATE-LIMITING-AND-ABUSE.md](RATE-LIMITING-AND-ABUSE.md).

**Current status:** `api/generate.ts` is built and `src/ai/client.ts` calls it whenever `VITE_MOCK_AI` is not `'true'` — including `npm run dev`, so local development exercises the real proxy unless a contributor opts into fixtures. It needs a Groq key and an Upstash Redis database to actually work once deployed — see step 4 below.

## Prerequisites

| Requirement | Cost |
|---|---|
| Vercel account | Free |
| GitHub repository | Free |
| Groq API key | Free |
| Upstash account | Free |
| Node 20 or later | Free |

## First-time setup

### 1. Get a Groq API key

1. Go to [console.groq.com](https://console.groq.com) and sign in
2. Create an API key
3. Check the current rate limits for `openai/gpt-oss-120b` in the console — these change without notice and must never be hardcoded, see [ZERO-COST-INFRASTRUCTURE.md](ZERO-COST-INFRASTRUCTURE.md). At the time of writing: 1,000 requests/day and 8,000 tokens/minute.

Record both. The daily figure sets `DAILY_GLOBAL_LIMIT` in step 4; the per-minute figure is what `MAX_CHARS` in `api/generate.ts` is sized against.

### 2. Create an Upstash Redis database

Free tier, at [upstash.com](https://upstash.com). Create a database, then copy its REST URL and REST token from the database's dashboard — these become `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

This holds the quota counters and the kill switch (`api/_lib/quota.ts`). Vercel Hobby has no included key-value store, which is why Upstash is here instead of the Workers KV the original Cloudflare plan assumed.

### 3. Create the Vercel project

In the Vercel dashboard, import the GitHub repository, then confirm:

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 20 |

`api/generate.ts` is detected and deployed automatically as a Vercel Node Function (60s max duration on Hobby) — no extra configuration. It deliberately isn't an Edge Function: Vercel's Edge runtime has a hard 25s ceiling that this project hit in production before switching to Node.

### 4. Set environment variables

In Project Settings, Environment Variables. Set for both Production and Preview.

| Variable | Type | Purpose |
|---|---|---|
| `GROQ_API_KEY` | **Secret** | The shared project key |
| `GROQ_MODEL` | Plain | `openai/gpt-oss-120b` — only the gpt-oss models support strict JSON schema |
| `DAILY_GLOBAL_LIMIT` | Plain | Set **below** Groq's real daily limit (800 against a 1,000/day tier) |
| `DAILY_IP_LIMIT` | Plain | Per-visitor daily allowance (40 is a reasonable default) |
| `ALLOWED_ORIGIN` | Plain | The deployed origin, e.g. `https://your-project.vercel.app` |
| `IP_HASH_SALT` | **Secret** | Any random string — mixed into the IP hash so the quota key can never be reversed to a real address |
| `UPSTASH_REDIS_REST_URL` | Plain | From step 2 |
| `UPSTASH_REDIS_REST_TOKEN` | **Secret** | From step 2 |

`GROQ_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`, and `IP_HASH_SALT` must be created as **Secrets**, not plain variables. Plain variables are readable in the dashboard and appear in logs.

### 5. Deploy

Push to `main`. Vercel builds and deploys automatically.

### 6. Verify

Work through this list against the live deployment:

- [ ] The landing page loads
- [ ] Upload a PDF, `.docx`, `.pptx`, or `.epub`; it parses; no network request carries file contents (check the network tab — parsing is entirely client-side)
- [ ] Generate a quiz; real questions appear with page citations (not the mock fixtures)
- [ ] Ask-your-document chat returns a real answer with a citation
- [ ] Export a deck to CSV; export and restore a backup file
- [ ] `GROQ_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`, and `IP_HASH_SALT` do not appear anywhere in the built JS bundle — search the deployed bundle, not the source
- [ ] `/api/generate` rejects a request carrying a foreign `Origin` header
- [ ] Go offline; the app shell still loads and card review still works
- [ ] Install to a phone home screen; it opens standalone
- [ ] Lighthouse: performance and first contentful paint (accessibility is already gated in CI by `axe-core`)

The bundle key check matters most. Search the actual deployed JavaScript, not by reasoning about the code — `api/` never ships to the client bundle since Vite only builds `src/`, but verify it anyway.

## Environments

| Environment | Trigger | Purpose |
|---|---|---|
| Production | Push to `main` | The live site |
| Preview | Any pull request | Automatic per-PR URL |

Preview deployments get their own environment variables. Give them a **separate, lower-limit key** if possible, so a preview cannot exhaust production's quota. If only one key is available, set `DAILY_GLOBAL_LIMIT` low on Preview.

## Turning on cloud sync

Optional. The app works fully without this — see [ADR-0010](../08-DECISIONS/ADR-0010-OPTIONAL-CLOUD-SYNC.md).

1. Create a free Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
2. Add a Web app to the project (Project settings → General → Your apps). Copy the six config values it gives you.
3. Enable Google as a sign-in provider: Authentication → Sign-in method → Google → Enable.
4. **Add your deployment's domain to Firebase's Authorized domains:** Authentication → Settings → Authorized domains → Add domain. Add every domain you'll sign in from — the `<project>.vercel.app` domain, any Preview-deployment domain you test on, and a custom domain if you add one later. Skipping this is the most common Firebase-web setup mistake: sign-in fails with `auth/unauthorized-domain` on any domain not in this list, including a brand-new Preview URL for a PR.
5. Create a Firestore database (production mode is fine — the rules below lock it down).
6. Paste the contents of `firestore.rules` (repo root) into Firestore → Rules, and publish.
7. In the Vercel dashboard, add the six `VITE_FIREBASE_*` variables from step 2 as environment variables (Plain, not Secret — these are public client config, not credentials, see `src/lib/firebase.ts`), for both Production and Preview.
8. **Provision Firebase's auth handler by deploying once to Firebase Hosting** (see below). Skipping this breaks sign-in.
9. Redeploy on Vercel. Sign-in should now work.

### Provisioning the auth handler (step 8, required)

Firebase serves its sign-in helper at `https://<project>.firebaseapp.com/__/auth/handler`, and only provisions that path once *something* has been deployed to Firebase Hosting for the project. Because this app is served from Vercel, Hosting is otherwise never initialized, so those paths 404 and sign-in fails with no useful error. One-time fix, from the repo root:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting     # pick your project; any empty public dir (e.g. firebase-public); no to SPA rewrite and GitHub deploys
firebase deploy --only hosting
```

This deploys a placeholder page nobody visits. The app itself still ships from Vercel — Firebase Hosting exists here purely to make the auth handler reachable. Do not delete that Hosting site later; sign-in depends on it. The `firebase.json`, `.firebaserc`, and `firebase-public/` files this creates are committed so the step is reproducible.

**CSP:** Firebase Auth and Firestore need their own origins allowed in the Content-Security-Policy header, or sign-in and sync fail even with correct config and authorized domains. This repo's `vercel.json` already allows the full set — nothing to do unless you're diffing against a fork with a stricter CSP, in which case see [SECURITY-AND-PRIVACY.md](SECURITY-AND-PRIVACY.md)'s CSP section for exactly which entries are required and why. `vercel.json` also sets `Cross-Origin-Opener-Policy: same-origin-allow-popups`; without it the browser severs the popup's opener relationship and the console fills with `window.closed` errors during sign-in.

**Sign-in uses a popup, not a redirect** ([ADR-0012](../08-DECISIONS/ADR-0012-POPUP-SIGN-IN-OVER-REDIRECT.md)). The redirect flow was tried first and fails outright in Chrome: it hands the session off through the cross-site `*.firebaseapp.com` authDomain, which browsers now block as third-party storage, returning the user to the app still signed out with no error shown. **Not yet verified on a real phone** — mobile popup behaviour is the most likely place this breaks, and ADR-0012 records the fallback if it does.

## Local development

```bash
git clone <repo>
cd ScholarForgeAI
npm install
npm run dev
```

Set `VITE_MOCK_AI=true` in `.env` to run on `src/ai/mock/` fixtures, so **no API key or Upstash account is needed** to work on the interface. This keeps the onboarding barrier low for a contributor without also making it impossible to test the real pipeline locally, which is what tying mock mode to the dev server used to do.

To exercise the real function locally, copy `.env.example` to `.env`, fill in real values, leave `VITE_MOCK_AI` as `false`, then:

```bash
npm run build
vercel dev
```

`vercel dev` (from the Vercel CLI, `npm i -g vercel`) is required to run the Edge Function locally — a plain `vite preview` only serves the static build.

## CI

`.github/workflows/ci.yml`, on every push and pull request:

```
1. npm ci
2. npm run typecheck   — tsc -b (app) + tsc -p tsconfig.api.json (the api/ function)
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

## Operating it

### Rotating the key

Takes a couple of minutes and needs no redeploy.

1. Set the kill switch (see below)
2. Revoke the old key in the Groq console
3. Create a new key
4. Update the `GEMINI_API_KEY` secret in the Vercel dashboard
5. Clear the kill switch
6. Verify a generation works
7. Record it in [ACTIVITY-LOG.md](../ACTIVITY-LOG.md)

### The kill switch

Disables shared-key generation immediately, without a deployment. Uses Upstash's REST API directly.

```bash
# stop
curl -X POST "$UPSTASH_REDIS_REST_URL/set/killswitch/true" \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"

# resume
curl -X POST "$UPSTASH_REDIS_REST_URL/del/killswitch" \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
```

While active, the proxy returns `SERVICE_DISABLED` for every request — there is no bring-your-own-key path that bypasses it ([ADR-0014](../08-DECISIONS/ADR-0014-REMOVE-BRING-YOUR-OWN-KEY.md)). Everything already stored keeps working.

Use it if the key is compromised, if unexplained usage appears, or if the provider is behaving strangely.

### Adjusting limits

Change `DAILY_GLOBAL_LIMIT` or `DAILY_IP_LIMIT` in the Vercel dashboard. Takes effect on the next request; no redeploy needed.

Review `DAILY_GLOBAL_LIMIT` against Google's published limit at least quarterly.

### Rolling back

Vercel keeps every previous deployment. Select an earlier one and promote it to production from the dashboard.

Note the one thing to check after a rollback: if a released version added a Dexie schema version, rolling the client back does not roll back a user's local database. Old code must therefore tolerate a newer schema, or the rollback breaks for anyone who already upgraded. This is why every migration must be additive. See [DATA-MODEL.md](../03-ARCHITECTURE/DATA-MODEL.md).

## Monitoring

Neither of these costs anything.

| Where | Watch for |
|---|---|
| Vercel dashboard | Request volume, function errors, build failures |
| Upstash console | Daily key counts, command usage against the free-tier cap |

There is no alerting, because there is no free alerting that does not involve a third-party service. Check periodically; the practical consequence of a missed problem is that generation stops, which visitors will simply see as the honest quota-exhausted message.

## Custom domain

Optional. The default `<project>.vercel.app` URL is free and adequate for a portfolio link.

If a domain is available, add it in the Vercel dashboard; Vercel provisions the certificate automatically. Once fixed:

- Update `ALLOWED_ORIGIN` to the new domain, or the origin check will reject every request from it.
- Update `og:image`/`twitter:image` in `index.html` and `<loc>` in `public/sitemap.xml` to absolute URLs (both are currently relative placeholders, noted inline in the sitemap).

## Costs

$0. Vercel Hobby, Google AI Studio's free tier, and Upstash's free tier all stay within their limits at this project's scale. Vercel's terms prohibit commercial use and pause the site at the free bandwidth cap — both accepted here since this is a personal portfolio deployment, not a project inviting third-party forks to self-host at scale (see [ADR-0009](../08-DECISIONS/ADR-0009-VERCEL-OVER-CLOUDFLARE-PAGES.md)). Confirm all three dashboards show $0 before each release, per [DEFINITION-OF-DONE.md](../05-ENGINEERING/DEFINITION-OF-DONE.md).
