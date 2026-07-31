# Success Metrics

Purpose: how we judge whether this works, given that we deliberately track nobody.
Last updated: 2026-07-30

## The constraint

We ship no analytics. No third-party scripts, no session recording, no per-user telemetry. That is a product commitment (see [SECURITY-AND-PRIVACY.md](../04-OPERATIONS/SECURITY-AND-PRIVACY.md)), and it means most conventional product metrics are simply unavailable to us.

So we measure three things instead: what the user sees about themselves, what public signals tell us, and what we can verify ourselves.

## Tier 1 — Metrics shown to the user, never collected

These exist for the student's benefit. They are computed on the device and stay there. We never see them.

| Metric | Why it matters to the user |
|---|---|
| Accuracy per topic | Tells them what to study next |
| Accuracy trend | Shows the effort is working |
| Cards due today | Turns "I should study" into a finite task |
| Streak | Momentum, with one forgiven day so a slip is not fatal |
| Total study time | Effort made visible |
| Leech cards | Flags cards that are badly written or genuinely hard |

Design note: these must never become guilt mechanics. No red warnings for a broken streak, no "you have not studied in 5 days" nagging. The dashboard is a mirror, not a manager.

## Tier 2 — Aggregate signals we can see without tracking anyone

| Signal | Source | What it indicates |
|---|---|---|
| Total AI requests per day | Proxy quota counter, a single global integer | Whether anyone is using it at all, and how close we are to the free-tier ceiling |
| Requests by endpoint | Proxy counters, aggregate only | Which features people actually use |
| Error rate by type | Proxy counters, aggregate only | Whether parsing or generation is failing in the field |
| Quota-exhaustion events per day | Proxy counter | Whether the shared key is sufficient |
| GitHub stars, forks, issues | GitHub | Interest and contributor pull |
| Vercel request count | Vercel dashboard | Rough traffic shape |

Every one of these is a counter with no user identifier, no IP retention beyond the rate-limit window, and no request content. Detail in [MONITORING-AND-LIMITS.md](../04-OPERATIONS/MONITORING-AND-LIMITS.md).

## Tier 3 — Qualitative signals

The most useful information about a tool like this comes from people telling you.

- GitHub issues, especially bug reports about specific files failing
- Feature requests, and whether they cluster
- Forks and self-hosted instances, which indicate the open-source goal is landing
- Direct feedback, via an in-app "tell us what broke" link that opens a pre-filled GitHub issue and sends nothing automatically

## What good looks like

### v1 launch is a success if

| Criterion | Target |
|---|---|
| Landing to first question | Under 2 minutes, verified by walking it on a real phone |
| A real 100-page university PDF processes correctly | Yes, tested on at least ten genuine documents across subjects |
| Generated questions are accurate and properly cited | 90%+ judged sound in a manual review of 100 questions |
| Works on a mid-range Android phone | Verified on real hardware, not just a device emulator |
| Lighthouse accessibility | 95 or above |
| Monthly running cost | $0 |
| Someone other than the author successfully self-hosts it | At least one confirmed instance |

### Six months in, we are doing well if

- The shared daily quota is regularly exhausted, which means real usage, and the bring-your-own-key path is absorbing it gracefully
- Bug reports are about specific document edge cases rather than the app being fundamentally broken
- At least one external contributor has merged a pull request
- At least one instance is running somewhere we did not set up
- Zero dollars have been spent

### Signals we are failing

| Signal | What it probably means |
|---|---|
| Traffic but almost no AI requests | People land and leave before uploading. The landing page is the problem. |
| Many parse failures | Format support is too narrow, or the error messages are not steering people to a fix |
| Repeated "question was wrong" reports | Prompt quality problem, not a UI problem. Fix in [PROMPT-LIBRARY.md](../03-ARCHITECTURE/PROMPT-LIBRARY.md). |
| Quota exhausted before noon every day | Shared key is undersized. Push BYOK harder, or add a fallback provider. |
| Issues asking for accounts and sync | The local-only decision needs revisiting sooner than v2 |
| No forks, no contributors | The open-source goal is not being met. Look at setup friction. |

## Metrics we deliberately do not chase

**Daily active users.** Cannot measure it without tracking, and would not want to. A student who uses this hard for one exam week and then not for two months is a success, not churn.

**Session length.** Longer is not better. A student who gets what they need in eight minutes is better served than one kept on screen for forty.

**Retention curves.** Study tools are inherently seasonal. A retention chart would tell us about the academic calendar, not the product.

**Engagement.** We are not an attention business. The honest goal is that the student learns the material and then stops needing us for a while.

## Review cadence

Check Tier 2 counters and Tier 3 signals monthly. Record findings in [ACTIVITY-LOG.md](../ACTIVITY-LOG.md). If a target above is being missed, open an issue rather than quietly lowering the target.
