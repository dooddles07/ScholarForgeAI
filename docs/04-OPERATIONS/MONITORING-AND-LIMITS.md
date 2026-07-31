# Monitoring and Limits

Purpose: how we see what is happening without tracking anyone, and what to do about what we see.
Last updated: 2026-07-31

## The constraint

No third-party monitoring service, no error-reporting SDK, no analytics. Those conflict with the privacy commitment in [SECURITY-AND-PRIVACY.md](SECURITY-AND-PRIVACY.md), and most would also add a dependency with its own free tier to worry about.

So monitoring is built from two things that cost nothing: counters we increment ourselves, and dashboards the platforms already give us.

## What we count

All in Upstash Redis. All plain integers. No identifier attached to any of them.

| Counter | Key | Purpose |
|---|---|---|
| Per-IP daily requests | `ip:<hash>:<date>` | Stops one user draining the shared pool |
| Global daily requests | `global:<date>` | Quota enforcement, and the only real usage signal |
| Kill switch | `killswitch` (boolean) | Disables shared-key generation without a redeploy |

That's the complete set `api/_lib/quota.ts` actually tracks. Richer counters — per task, per error
code, quota-exhaustion events, BYOK adoption — aren't built. That's a real gap in visibility, not a
privacy-driven omission like the table below: knowing how well the BYOK escape hatch is working
would be useful and currently isn't measurable at all.

### What is deliberately absent

| Not counted | Why |
|---|---|
| Anything per user | No user identity exists |
| Prompts or document text | Privacy commitment |
| IP addresses beyond the rate-limit window | Minimisation; hashed and TTL'd |
| Response contents | Privacy commitment |
| Timing or performance per request | Not worth the complexity; local profiling is better |

## Platform dashboards

| Dashboard | Shows | Cost |
|---|---|---|
| Vercel | Requests, bandwidth, build history and failures | Free |
| Vercel Functions | Invocations, errors, execution duration | Free |
| Upstash Redis | Command volume against the free allowance | Free |
| Firebase | Auth and Firestore usage against the Spark plan quota | Free |
| Google AI Studio | Actual API usage against the real quota | Free |
| GitHub | Issues, stars, forks, Actions minutes | Free |

The Google AI Studio figure is the authoritative one. Our own global counter is an approximation, which is exactly why the ceiling is set below the real limit.

## Reading the counters

Counters are read from the Upstash console's Data Browser, or via its REST API with `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` (the same credentials `api/_lib/quota.ts` uses), e.g. `curl -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" $UPSTASH_REDIS_REST_URL/get/global:2026-07-30`.

## What to watch, and what it means

| Signal | Likely meaning | Response |
|---|---|---|
| Global requests near the ceiling daily | Real usage, and the shared key is undersized | Promote BYOK more prominently; consider a fallback provider |
| Vercel Functions error rate rising | Provider instability, or a bug in `api/generate.ts` | Check the Vercel Functions dashboard and Gemini's status page |
| Upstash command volume near the free allowance | Unexpected; would mean enormous traffic | Reduce counter granularity |
| Sudden implausible spike | Possible abuse or key leak | Kill switch, investigate, rotate if needed |
| Build failures | A broken commit | Fix; check CI passed before merge |
| Traffic but almost no AI requests | People land and leave without uploading | A landing page problem, not an infrastructure one. See [SUCCESS-METRICS.md](../01-PRODUCT/SUCCESS-METRICS.md) |

That last row is worth noting: the most important thing the counters can tell us is not about infrastructure at all. It is whether the first-visit flow is working.

## No alerting

There is no free alerting that does not involve a third-party service, so there is none.

The practical consequence: if generation breaks, we find out when a user opens a GitHub issue, or on the next manual check. For a free, solo-maintained study tool that is an acceptable trade. Users are not paying for uptime, nothing stored is at risk, and the app keeps working offline through any outage.

What compensates:

- **Fail closed.** An Upstash outage disables generation rather than allowing unlimited use, so a failure cannot quietly burn the quota.
- **The global ceiling caps damage.** The worst case is a spent daily quota, which resets.
- **The kill switch is one command.** Any problem can be stopped in seconds.
- **An in-app report link** opens a pre-filled GitHub issue, so a user who hits a problem has an easy path to telling us. Nothing is sent automatically.

## Routine checks

| Cadence | Check |
|---|---|
| Weekly | Global daily counter, spot-check a few per-IP counters |
| Weekly | GitHub issues |
| Monthly | Google AI Studio usage against our counter, to confirm they agree |
| Monthly | Vercel, Upstash, and Firebase dashboards show $0 |
| Quarterly | `DAILY_GLOBAL_LIMIT` against Google's current published limit |
| Quarterly | `npm audit` and dependency updates |
| Per release | The full checklist in [DEFINITION-OF-DONE.md](../05-ENGINEERING/DEFINITION-OF-DONE.md) |

The quarterly limit review is the one most likely to be forgotten and the one most likely to cause a surprise, since provider rate limits change without notice.

Findings go in [ACTIVITY-LOG.md](../ACTIVITY-LOG.md).

## Client-side errors

We do not report them to a server. No error SDK, no automatic reporting.

Instead:

- An error boundary catches render failures and shows a recoverable message rather than a blank page
- The message includes a report link that pre-fills a GitHub issue with the app version and what the user was doing
- Nothing is sent unless the user chooses to send it

This means we have no visibility into client errors that users do not report. Accepted, as the alternative is shipping a tracking SDK.

## Storage limits, per user

Client-side, and visible only to that user.

| Threshold | Behaviour |
|---|---|
| Under 80% | Nothing |
| 80% or above | Warning, offer to review and delete old documents |
| 95% or above | Block new uploads, prompt deletion, prompt export |
| Write failure | Clear message, no partial write, prompt export |

Checked with `navigator.storage.estimate()`, falling back to catching quota errors on write where unavailable. Detail in [DATA-MODEL.md](../03-ARCHITECTURE/DATA-MODEL.md).

## Limits summary

Everything with a ceiling, in one table.

| Limit | Value | At the limit |
|---|---|---|
| Gemini daily requests | Configured, below the provider's real limit | Honest message, reset time, BYOK offered |
| Per-IP daily requests | Configured, generous | Same message, BYOK offered |
| Vercel Node Functions | 60s max duration, generous monthly invocation allowance | Generation fails; the app still loads and offline works |
| Upstash Redis | 256 MB / 500K commands per month | Fail closed: generation disabled |
| Vercel builds | Soft fair-use cap on Hobby | Builds pause; see [ADR-0009](../08-DECISIONS/ADR-0009-VERCEL-OVER-CLOUDFLARE-PAGES.md) |
| File upload size | 50 MB | Rejected before parsing, with the size named |
| Pages per document | 1,000 | Warned, page range offered |
| Documents per study set | 10 | Rejected, second set suggested |
| Local storage | Browser-dependent | Warn at 80%, block at 95% |
| Request text size | Model context window | `TEXT_TOO_LARGE`, rejected before the provider call |

Free-tier figures in [ZERO-COST-INFRASTRUCTURE.md](ZERO-COST-INFRASTRUCTURE.md).
