# Monitoring and Limits

Purpose: how we see what is happening without tracking anyone, and what to do about what we see.
Last updated: 2026-07-30

## The constraint

No third-party monitoring service, no error-reporting SDK, no analytics. Those conflict with the privacy commitment in [SECURITY-AND-PRIVACY.md](SECURITY-AND-PRIVACY.md), and most would also add a dependency with its own free tier to worry about.

So monitoring is built from two things that cost nothing: counters we increment ourselves, and dashboards the platforms already give us.

## What we count

All in Workers KV. All plain integers. No identifier attached to any of them.

| Counter | Key | Purpose |
|---|---|---|
| Global daily requests | `global:<date>` | Quota enforcement, and the only real usage signal |
| Requests per task | `task:<task>:<date>` | Which features people actually use |
| Errors by code | `err:<code>:<date>` | Whether something is broken in the field |
| Quota exhaustion events | `exhausted:<date>` | Whether the shared key is big enough |
| Per-IP limit hits | `iplimit:<date>` | Possible abuse, or a campus behind one address |
| BYOK requests | `byok:<date>` | How many users have moved to their own key |

The BYOK counter is the most strategically interesting number in the project. It measures how well the escape hatch is working, which determines whether popularity is survivable.

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
| Cloudflare Pages | Requests, bandwidth, build history and failures | Free |
| Cloudflare Workers | Function invocations, errors, CPU time | Free |
| Workers KV | Read/write volume against the free allowance | Free |
| Google AI Studio | Actual API usage against the real quota | Free |
| GitHub | Issues, stars, forks, Actions minutes | Free |

The Google AI Studio figure is the authoritative one. Our own global counter is an approximation that runs slightly behind because KV is eventually consistent, which is exactly why the ceiling is set below the real limit.

## Reading the counters

```bash
npx wrangler kv key get --binding=QUOTA "global:2026-07-30"
npx wrangler kv key list --binding=QUOTA --prefix="err:"
```

A small script, `npm run stats`, prints the current day's counters in a readable table. Worth having, because a command that takes one keystroke actually gets run.

## What to watch, and what it means

| Signal | Likely meaning | Response |
|---|---|---|
| Global requests near the ceiling daily | Real usage, and the shared key is undersized | Promote BYOK more prominently; consider a fallback provider |
| Exhaustion before noon, consistently | Same, more urgent | As above |
| `PROVIDER_ERROR` rising | Provider instability | Wait; check the provider status page |
| `GROUNDING_FAILED` rising | Prompt quality regression | Review recent prompt changes in [PROMPT-LIBRARY.md](../03-ARCHITECTURE/PROMPT-LIBRARY.md) |
| `TEXT_TOO_LARGE` rising | People uploading bigger documents than expected | Check the retrieval tier logic |
| Per-IP limit hits rising | Abuse, or a shared network | Usually a shared network. Leave it. BYOK is the answer. |
| KV writes near the free allowance | Unexpected; would mean enormous traffic | Reduce counter granularity |
| Sudden implausible spike | Possible abuse or key leak | Kill switch, investigate, rotate if needed |
| Build failures | A broken commit | Fix; check CI passed before merge |
| Traffic but almost no AI requests | People land and leave without uploading | A landing page problem, not an infrastructure one. See [SUCCESS-METRICS.md](../01-PRODUCT/SUCCESS-METRICS.md) |

That last row is worth noting: the most important thing the counters can tell us is not about infrastructure at all. It is whether the first-visit flow is working.

## No alerting

There is no free alerting that does not involve a third-party service, so there is none.

The practical consequence: if generation breaks, we find out when a user opens a GitHub issue, or on the next manual check. For a free, solo-maintained study tool that is an acceptable trade. Users are not paying for uptime, nothing stored is at risk, and the app keeps working offline through any outage.

What compensates:

- **Fail closed.** A KV outage disables generation rather than allowing unlimited use, so a failure cannot quietly burn the quota.
- **The global ceiling caps damage.** The worst case is a spent daily quota, which resets.
- **The kill switch is one command.** Any problem can be stopped in seconds.
- **An in-app report link** opens a pre-filled GitHub issue, so a user who hits a problem has an easy path to telling us. Nothing is sent automatically.

## Routine checks

| Cadence | Check |
|---|---|
| Weekly | Global daily counter, exhaustion events, error counts |
| Weekly | GitHub issues |
| Monthly | Google AI Studio usage against our counter, to confirm they agree |
| Monthly | Cloudflare dashboard shows $0 |
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
| Pages Functions | Approx. 100k requests/day | Generation fails; the app still loads and offline works |
| Workers KV | Free daily allowance | Fail closed: generation disabled |
| Pages builds | 500/month | Builds queue; the live site keeps serving |
| File upload size | 50 MB | Rejected before parsing, with the size named |
| Pages per document | 1,000 | Warned, page range offered |
| Documents per study set | 10 | Rejected, second set suggested |
| Local storage | Browser-dependent | Warn at 80%, block at 95% |
| Request text size | Model context window | `TEXT_TOO_LARGE`, rejected before the provider call |

Free-tier figures in [ZERO-COST-INFRASTRUCTURE.md](ZERO-COST-INFRASTRUCTURE.md).
