# Self-Hosting Guide

Purpose: run your own copy of ScholarForge AI, for free.
Last updated: 2026-07-31

## Why you might want to

| Reason |
|---|
| Your own API key, so you are not sharing a daily quota with strangers |
| Your school or class wants its own instance |
| You want to change it — different subjects, different question styles, your institution's branding |
| You do not want to depend on someone else's project staying online |
| You want to learn how it works by running it |

## What it costs

**Nothing.**

| Requirement | Cost |
|---|---|
| GitHub account | Free |
| Vercel account | Free |
| Upstash account | Free |
| Google AI Studio API key | Free, no credit card |
| Domain | Optional. You get a free `<project>.vercel.app` subdomain. |

No licence fees, no usage fees, no trial that expires. Every dependency is permissively licensed. Vercel's Hobby tier prohibits commercial use, so a tutoring service or school charging for access would need Vercel's Pro tier — see [ADR-0009](../08-DECISIONS/ADR-0009-VERCEL-OVER-CLOUDFLARE-PAGES.md) for the reasoning. Free personal or non-commercial instances are unaffected.

## Setup

Budget about twenty minutes.

### 1. Fork

Fork the repository on GitHub to your own account.

### 2. Get an API key

1. Go to Google AI Studio and sign in with a Google account
2. Create an API key
3. Copy it somewhere safe for a moment
4. **Check the current rate limits** for the model you plan to use, on Google's official rate-limit page

Write that limit down. You need it in step 5, and it is the one number you should not guess — published figures vary and change.

### 3. Create an Upstash Redis database

At [upstash.com](https://upstash.com), create a free database, then copy its REST URL and REST token from the database dashboard.

### 4. Create a Vercel project

In the Vercel dashboard, import your forked repository.

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 20 |

`api/generate.ts` deploys automatically as a Vercel Node Function (60s max duration on Hobby) — no
extra configuration. It deliberately isn't an Edge Function: Vercel's Edge runtime has a hard 25s
ceiling that this project hit in production before switching to Node.

### 5. Set the environment variables

Project Settings, Environment Variables. Set these for both Production and Preview.

| Variable | Type | Value |
|---|---|---|
| `GEMINI_API_KEY` | **Secret** | Your key from step 2 |
| `GEMINI_MODEL` | Plain | `gemini-flash-lite-latest` (a rolling alias — avoid pinning a dated model id, which can be retired for new keys without notice. Use the Lite alias: the regular Flash free-tier daily cap measured as low as 20 requests/day in testing, versus 500/day on Lite for the same account) |
| `DAILY_GLOBAL_LIMIT` | Plain | Below your real daily limit |
| `DAILY_IP_LIMIT` | Plain | Per-user daily allowance |
| `ALLOWED_ORIGIN` | Plain | Your deployed URL |
| `IP_HASH_SALT` | **Secret** | Any random string |
| `UPSTASH_REDIS_REST_URL` | Plain | From step 3 |
| `UPSTASH_REDIS_REST_TOKEN` | **Secret** | From step 3 |

**`GEMINI_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`, and `IP_HASH_SALT` must be Secrets, not plain variables.** Plain variables are readable in the dashboard and can appear in logs. This is the one thing in the setup you must not get wrong.

Set `DAILY_GLOBAL_LIMIT` below your real limit so your users get a clear message from the app rather than an opaque error from the provider.

### 5b. Optional: turn on cloud sync

Only if you want it — the app works fully without it. Six more variables, all **Plain** (this is public client config, not a credential — see [ADR-0010](../08-DECISIONS/ADR-0010-OPTIONAL-CLOUD-SYNC.md) and `src/lib/firebase.ts`):

| Variable | Type |
|---|---|
| `VITE_FIREBASE_API_KEY` | Plain |
| `VITE_FIREBASE_AUTH_DOMAIN` | Plain |
| `VITE_FIREBASE_PROJECT_ID` | Plain |
| `VITE_FIREBASE_STORAGE_BUCKET` | Plain |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Plain |
| `VITE_FIREBASE_APP_ID` | Plain |

Get these values, enable Google sign-in, and publish `firestore.rules` per [DEPLOYMENT.md](../04-OPERATIONS/DEPLOYMENT.md)'s "Turning on cloud sync" section — the steps are the same for a fork as for the original deployment.

### 6. Deploy

Push to `main`, or trigger a deployment from the dashboard. Your instance is live at `<project>.vercel.app`.

### 7. Verify

- [ ] The landing page loads
- [ ] A PDF (or `.docx`/`.pptx`/`.epub`) uploads and parses
- [ ] A quiz generates with page citations
- [ ] **Search the deployed JavaScript for your API key.** It must not be there.
- [ ] Go offline and reload; the app still opens
- [ ] Install it to a phone home screen

The key check is the one that matters. Do it by actually searching the deployed bundle, not by assuming — `api/` never ships to the client build since Vite only bundles `src/`.

## Picking your limits

Depends on who is using it.

| Situation | Guidance |
|---|---|
| Just you | Set both limits high; you cannot realistically drain your own quota |
| A class of 30 | Divide your daily limit generously and set `DAILY_IP_LIMIT` from that. Note that students on the same school network may share one IP, so lean high. |
| Public instance | Set `DAILY_IP_LIMIT` modestly and rely on bring-your-own-key for heavy users |

The shared-NAT problem is real for schools: an entire campus may appear as one address, which means one rate-limit bucket. If you are deploying for a school, set `DAILY_IP_LIMIT` high and let the global ceiling do the actual protecting.

## Customising

| To change | Edit |
|---|---|
| Colours, fonts, spacing | `src/styles/tokens.css` — see [DESIGN-SYSTEM.md](../02-DESIGN/DESIGN-SYSTEM.md) |
| Wording anywhere | `src/copy/` — see [CONTENT-AND-COPY-GUIDE.md](../02-DESIGN/CONTENT-AND-COPY-GUIDE.md) |
| Name and icons | `index.html`'s manifest tags and `public/icons/` |
| Question style, difficulty behaviour | `api/_lib/gemini.ts`'s `promptFor` — see [PROMPT-LIBRARY.md](../03-ARCHITECTURE/PROMPT-LIBRARY.md) |
| Quota and abuse rules | `api/_lib/quota.ts`, `api/_lib/security.ts` |
| File size and page limits | The constants in `src/parsing/` and `src/domain/validation/file-check.ts` |
| Default card session length | `src/persistence/settings.ts` |

Prompts are the highest-leverage thing to customise. If your students study a subject with particular conventions — legal citation, chemical notation, mathematical proof — adjusting the prompts will improve output more than any other change.

Keep your changes on a branch so you can still pull upstream updates.

## Staying updated

```bash
git remote add upstream https://github.com/<original-owner>/ScholarForgeAI.git
git fetch upstream
git merge upstream/main
```

Watch for these when merging:

- **New environment variables.** Check `.env.example` for additions.
- **New Dexie schema versions.** These migrate your users' local data. Migrations are additive, but read the release notes.
- **A changed `DAILY_GLOBAL_LIMIT` recommendation**, if provider limits moved.

## Running it

### Rotate your key

1. Kill switch (below)
2. Revoke the old key in AI Studio
3. Create a new one
4. Update the `GEMINI_API_KEY` secret in Vercel
5. Clear the kill switch

### Stop generation immediately

```bash
curl -X POST "$UPSTASH_REDIS_REST_URL/set/killswitch/true" \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
```

Clear it the same way with `/del/killswitch` instead of `/set/killswitch/true`.

Users keep everything they have already made, and everything still works offline. Only new generation stops.

### Watch usage

Google AI Studio shows your real consumption. The Vercel dashboard shows request traffic and function errors. The Upstash console shows your daily key counts against the free-tier command cap.

## Your obligations as a host

If other people use your instance, some of what the project promises becomes your responsibility.

| Promise | What you must not do |
|---|---|
| Files never leave the device | Do not add server-side upload |
| No tracking | Do not add analytics |
| Data stays local | Do not add a server-side database without telling users |
| No payment | If you monetise it, be honest about that; do not present it as free |

You are permitted to do whatever the licence allows. But if you change the privacy or cost position, say so plainly. Users trusting the original project's promises on your instance would be misled.

## Troubleshooting

| Problem | Likely cause |
|---|---|
| Build fails | Node version not set to 20 |
| Generation returns 502/503 | `GEMINI_API_KEY` missing, or `UPSTASH_REDIS_REST_URL`/`TOKEN` unset or wrong |
| Every request returns 403 | `ALLOWED_ORIGIN` does not match your actual URL |
| Every request returns 503 with `SERVICE_DISABLED` | Kill switch is still set |
| Quota errors immediately | `DAILY_GLOBAL_LIMIT` or `DAILY_IP_LIMIT` set too low |
| Routes other than `/` return 404 | Check `vercel.json`'s `rewrites` deployed correctly |
| Generation works locally but fails deployed | An environment variable set locally in `.env` but not added in the Vercel dashboard |

See [DEPLOYMENT.md](../04-OPERATIONS/DEPLOYMENT.md) for the full setup this guide summarises.

## Getting help

Open an issue on the original repository. Include your Vercel build log and what you have already checked. Never paste your API key into an issue.

## Licence

See the `LICENSE` file. You may fork, modify, deploy, and distribute within its terms. Attribution is appreciated but the licence governs.
