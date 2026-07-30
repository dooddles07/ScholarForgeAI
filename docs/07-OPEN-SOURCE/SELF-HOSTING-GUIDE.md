# Self-Hosting Guide

Purpose: run your own copy of ScholarForge AI, for free.
Last updated: 2026-07-30

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
| Cloudflare account | Free |
| Google AI Studio API key | Free, no credit card |
| Domain | Optional. You get a free `pages.dev` subdomain. |

No licence fees, no usage fees, no trial that expires. Every dependency is permissively licensed, and Cloudflare's free tier explicitly permits commercial use — so a tutoring service or a school can run this without a licensing problem. That was a deliberate consideration in choosing the host. See [ADR-0003](../08-DECISIONS/ADR-0003-CLOUDFLARE-PAGES-OVER-VERCEL.md).

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

### 3. Create a Cloudflare Pages project

In the Cloudflare dashboard: Workers & Pages, then Create, then Pages, then connect your forked repository.

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 20 |

### 4. Create the KV namespace

The quota counters need somewhere to live.

```bash
npx wrangler kv namespace create QUOTA
```

Then bind it in the dashboard: Settings, Functions, KV namespace bindings. Variable name `QUOTA`.

### 5. Set the environment variables

Settings, Environment variables. Set these for both Production and Preview.

| Variable | Type | Value |
|---|---|---|
| `GEMINI_API_KEY` | **Secret** | Your key from step 2 |
| `GEMINI_MODEL` | Plain | e.g. `gemini-2.5-flash` |
| `DAILY_GLOBAL_LIMIT` | Plain | Below your real daily limit |
| `DAILY_IP_LIMIT` | Plain | Per-user daily allowance |
| `ALLOWED_ORIGIN` | Plain | Your deployed URL |

**`GEMINI_API_KEY` must be a Secret, not a plain variable.** Plain variables are readable in the dashboard and can appear in logs. This is the one thing in the setup you must not get wrong.

Set `DAILY_GLOBAL_LIMIT` below your real limit so your users get a clear message from the app rather than an opaque error from the provider.

### 6. Deploy

Push to `main`, or trigger a deployment from the dashboard. Your instance is live at `<project>.pages.dev`.

### 7. Verify

- [ ] The landing page loads
- [ ] A PDF uploads and parses
- [ ] A quiz generates with page citations
- [ ] **Search the deployed JavaScript for your API key.** It must not be there.
- [ ] Go offline and reload; the app still opens
- [ ] Install it to a phone home screen

The key check is the one that matters. Do it by actually searching the deployed bundle, not by assuming.

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
| Name and icons | `public/manifest.webmanifest` and `public/icons/` |
| Question style, difficulty behaviour | `functions/api/_lib/prompts.ts` — see [PROMPT-LIBRARY.md](../03-ARCHITECTURE/PROMPT-LIBRARY.md) |
| File size and page limits | The constants in `src/parsing/` |
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

1. Kill switch: `npx wrangler kv key put --binding=QUOTA killswitch true`
2. Revoke the old key in AI Studio
3. Create a new one
4. Update the Cloudflare secret
5. Clear the kill switch: `npx wrangler kv key delete --binding=QUOTA killswitch`

### Stop generation immediately

```bash
npx wrangler kv key put --binding=QUOTA killswitch true
```

Users keep everything they have already made, and everything still works offline. Only new generation stops.

### Watch usage

Google AI Studio shows your real consumption. The Cloudflare dashboard shows traffic. `npm run stats` reads your quota counters.

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
| Generation returns 500 | `GEMINI_API_KEY` missing, or set as a plain variable instead of a secret |
| Every request returns 403 | `ALLOWED_ORIGIN` does not match your actual URL |
| Every request returns 503 | Kill switch is still set |
| Quota errors immediately | `DAILY_GLOBAL_LIMIT` set too low, or KV not bound |
| Routes other than `/` return 404 | `public/_redirects` missing the SPA fallback |
| Generation works locally but fails deployed | Server code using a Node built-in; the Workers runtime does not have them |

That last one is the most common real problem. See [CODING-STANDARDS.md](../05-ENGINEERING/CODING-STANDARDS.md).

## Getting help

Open an issue on the original repository. Include your Cloudflare build log and what you have already checked. Never paste your API key into an issue.

## Licence

See the `LICENSE` file. You may fork, modify, deploy, and distribute within its terms. Attribution is appreciated but the licence governs.
