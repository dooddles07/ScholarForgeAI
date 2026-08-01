# Security and Privacy

Security posture achieved by architecture rather than policy: we hold almost nothing, so there is
almost nothing to lose.

## What we never collect

| Never collected                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Uploaded files, in any form                                                                                                                           |
| Document contents, beyond the moment of a single request                                                                                              |
| Quiz results, review history, or progress data, unless you opt into cloud sync                                                                        |
| Analytics, page views, session recordings, or behavioural data — with one narrow exception, `streakLastDay`, which records which day you last studied |
| Device fingerprints                                                                                                                                   |
| Cookies of any kind                                                                                                                                   |

No cookie consent banner appears because we set no cookies. Worth stating plainly, since its
absence is usually taken as an oversight.

A Google account is required to use the app, so Firebase Auth holds an email address as the account
identifier. We keep no user database of our own beyond the two Firestore documents below.

## What transits the server

Only extracted document text — and only the portion needed for the specific request — plus
generation options such as question count and difficulty. Used to fulfil the request and then
discarded. Never written to storage, never logged, never retained after the response.

## What is stored, and where

| Data                                             | Location                        | Who can see it                             |
| ------------------------------------------------ | ------------------------------- | ------------------------------------------ |
| Uploaded documents and extracted text            | The user's browser, IndexedDB   | The user only                              |
| Flashcards, decks, schedules                     | The user's browser              | The user only                              |
| Quiz and exam results                            | The user's browser              | The user only                              |
| Progress and review history                      | The user's browser              | The user only                              |
| Aggregate request counters                       | Upstash Redis                   | Us, as integers with no identifier         |
| The project API key                              | Vercel environment variables    | Us only                                    |
| Cloud sync backup (opt-in)                       | Firestore, `backups/{uid}`      | The signed-in user only, enforced by rules |
| Display preferences and study streak (automatic) | Firestore, `userSettings/{uid}` | The signed-in user only, enforced by rules |

**Study data (opt-in).** `backups/{uid}` holds documents, decks, cards, quizzes, attempts, exams,
conversations, and the review log — but only when the user explicitly taps "Sync now."

**Preferences (automatic, not opt-in).** `userSettings/{uid}` syncs continuously for every signed-in
user, without a button and without asking. Sign-in is mandatory, so this applies to everyone. It
carries theme, reading mode, reduce motion, cards-per-day, focus timer, and the three streak fields
— **no study content**. The one field with behavioural signal is `streakLastDay`.

This is a real reduction in the "nothing leaves your device by default" position the project
started from. It is stated here rather than buried, because that position is what the rest of this
document is built on.

## The one secret

`GROQ_API_KEY`, held as a Vercel environment variable. Non-negotiable rules: never in any client
bundle, never in any committed file including examples and tests, never in any log, never in any
response body or header, never in an error message.

A key that reaches a browser is published, and a published key gets scraped and drained. This is
the entire justification for having a server at all.

Enforcement: a pre-commit hook scans staged changes for key-shaped strings; CI scans the built
bundle and fails on a match; `.env` is gitignored with only placeholder values committed; rotation
takes minutes.

The Firebase `VITE_FIREBASE_*` values are **not** secrets. They are public client identifiers that
ship in the bundle by design; Firestore rules do the actual access control.

## Threat model

### Defended

| Threat                                            | Defence                                                                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Someone extracts the API key from the bundle      | The key is never in the bundle. Structural, and the primary defence.                                                           |
| One user drains the shared quota                  | Per-IP daily counter                                                                                                           |
| Automated abuse of the proxy                      | Origin check, per-IP limit, global ceiling, kill switch                                                                        |
| The project exceeds the provider's free tier      | Global ceiling set below the real limit                                                                                        |
| A malicious document causes code execution        | Parsing libraries sandboxed in a Web Worker; extracted text treated as data, never evaluated                                   |
| Prompt injection via document contents            | Text delimited as data; system instruction takes priority; output schema-validated and grounding-checked                       |
| XSS via generated content                         | React escapes by default; no `dangerouslySetInnerHTML` on model output; strict CSP                                             |
| Someone reads another user's data                 | Rules restrict `backups/{uid}` and `userSettings/{uid}` to the owner's authenticated UID; no app-code bug can expose either    |
| A compromised client writing junk to its own path | `userSettings/{uid}` rejects unexpected keys and an out-of-range `dailyCardLimit`; `backups/{uid}` rejects documents over 1 MB |

### Prompt injection, specifically

A document could contain text attempting to instruct the model. Four mitigations: document text is
delimited and labelled as data; the system instruction states that instructions found inside the
document are not to be followed; output is validated against a strict schema, so a hijacked
response fails structurally; grounding validation checks that every item cites a real page and
quotes real text.

The blast radius is inherently small. The worst realistic outcome is a bad quiz question for the
user who uploaded the file. There is no other user's data to reach, no account to compromise, no
privileged action the model can invoke.

### Accepted

| Threat                                      | Why accepted                                                                                    |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Determined abuser rotating IP addresses     | The global ceiling caps total damage. The realistic threat is casual overuse.                   |
| Users behind shared NAT sharing a bucket    | Unavoidable with IP-based limiting. Keying quota by signed-in account is the available upgrade. |
| A user losing local data to a cleared cache | No server copy exists, by design. Mitigated by export prompting, not eliminated.                |
| Malicious content in a document             | It only affects the user who uploaded it                                                        |

## Rate limiting

One shared API key on a free tier behind an open endpoint. Two goals that pull against each other:
stop one user consuming everyone's quota, and never make a legitimate student feel suspected. The
second rules out CAPTCHAs, sign-in walls, and anything treating the user as a probable attacker.

Six layers, applied cheapest first:

| Layer                | Blocks                                    | Cost                   |
| -------------------- | ----------------------------------------- | ---------------------- |
| Origin check         | Casual scripted use from elsewhere        | Free, no state         |
| Kill switch          | Everything, in an emergency               | One Upstash read       |
| Per-minute burst limit | A tight request loop                    | One Upstash read/write |
| Per-IP daily limit   | One user draining the pool                | One Upstash read/write |
| Global daily ceiling | The project exceeding the provider's tier | One Upstash read/write |
| Request size limit   | Oversized requests burning tokens         | Free                   |

**Origin check.** Accepted only when `Origin` matches `ALLOWED_ORIGIN`. A low bar — `Origin` is
trivially forged outside a browser — worth having because it stops the laziest case at zero cost.
Not a security boundary and not treated as one. **When `ALLOWED_ORIGIN` is unset the check is
skipped entirely**, so it must be set in production. A cold-start log (`ALLOWED_ORIGIN_UNSET`)
fires once per function instance when it is unset in `VERCEL_ENV=production`, so a forgotten
variable shows up in logs instead of staying silent.

**Kill switch.** An Upstash Redis flag checked on every request; when set, generation returns
`SERVICE_DISABLED`. Exists so a problem can be stopped in seconds without a deployment. There is no
bypass. Toggle it with `npm run kill-switch -- status|on|off` (reads
`UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` from the environment); the Upstash console
remains a fallback if those credentials aren't available locally.

**Per-minute burst limit.** Counters keyed `burst:<sha256(ip + salt)>:<YYYY-MM-DDTHH:MM>` (per-IP)
and `burst:global:<YYYY-MM-DDTHH:MM>`, TTL 90 seconds. Checked before the daily counters, so a
request that fails it never burns the day's allowance. Kept as a separate error code
(`RATE_LIMITED`) from the daily `QUOTA_EXCEEDED`, so a transient 60-second throttle doesn't show
the "come back tomorrow" quota message. Defaults `BURST_IP_LIMIT=10`, `BURST_GLOBAL_LIMIT=60`.

**Per-IP daily limit.** A counter keyed `ip:<sha256(ip + salt)>:<YYYY-MM-DD>`, TTL 48 hours. The IP
is hashed with a server-only salt rather than stored, and the key expires automatically — we never
hold a plaintext address. Set generously via `DAILY_IP_LIMIT`, because a false positive is worse
than a small amount of over-use. **`IP_HASH_SALT` fails closed:** the hashing function throws if
it is unset, which `/api/generate` turns into `SERVICE_UNAVAILABLE` before an IP is ever hashed —
an unsalted hash would be trivially reversible over the whole IPv4 space, so a missing salt refuses
requests rather than silently degrading to that.

**Global daily ceiling.** One counter for the whole project, set _below_ the provider's real daily
limit so we fail with our own honest message instead of an opaque provider 429. `DAILY_GLOBAL_LIMIT`
is configuration, never hardcoded, reviewed against Groq's console quarterly.

**Request size limit.** Text over `MAX_CHARS` (24,000) is rejected before any provider call. Set by
Groq's 8,000 tokens-per-minute cap, not the model's 131k context window — the per-minute budget
binds first by a wide margin.

### Counting rules

Counters increment **before** the provider call. A failed generation still consumes allowance: the
request reached the provider and counted against the real limit, so not counting it would let our
ceiling overrun the actual one. There are no retries, so one failure cannot cascade.

### Fail closed

If Upstash is unavailable and a counter cannot be read or written, the request is **refused**.
Allowing unlimited requests during an outage could burn the provider's entire daily allowance in
minutes and get the key flagged. A brief outage where generation is unavailable is far less
damaging. Everything stored keeps working, as always.

### When the quota runs out

A designed state, not an error. The user sees:

> Today's free AI usage has run out.
> It resets tomorrow. Everything you have already made still works, including offline.

It never says "upgrade", "premium", "limit exceeded", a status code, or anything about payment.
There is no paid tier and never will be.

**There is no escape hatch.** Bring-your-own-key was removed, so when the daily quota is spent,
generation stops for everyone until reset. This is the single biggest weakness in the current
design, and it is worth stating plainly rather than burying: popularity now degrades the product
for everyone instead of routing around itself. The limits are set generously against Groq's
1,000 requests/day to push that wall out, but they do not remove it.

**Warning before the wall.** Every successful generate response carries `quotaRemaining`: the
caller's per-IP daily allowance left after that request. `src/ai/client.ts` exposes it via an
optional `onQuotaRemaining` callback on `GenerateOptions`, so the UI can warn a user before they
hit zero instead of only finding out when a request fails.

### Deliberately not used

| Not using              | Why                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| CAPTCHA                | Treats every student as a suspect, is an accessibility barrier, needs a third party                     |
| Quota keyed by account | Possible now that sign-in is mandatory, but needs server-side token verification, which is out of scope |
| Device fingerprinting  | A privacy violation, and trivially defeated                                                             |
| Proof-of-work          | Wastes the battery of the exact low-end devices we target                                               |
| Email verification     | Google sign-in already verifies identity                                                                |
| Paid tier as overflow  | There is no paid tier                                                                                   |

## Monitoring and escalation

Aggregate counters only, no identifiers: daily global requests, per-IP daily requests, per-minute
burst requests, and now a per-error-code counter keyed `errors:<code>:<YYYY-MM-DD>` (via
`incrementErrorCounter` in `api/_lib/services/quota.service.ts`), incremented on every rejection
and failure path. Best-effort: a Redis failure while counting an error is swallowed rather than
turned into a second failure. Read today via the Upstash console; a CLI reader is a reasonable
future add-on, not built yet.

| Situation                       | Response                                                                         |
| ------------------------------- | -------------------------------------------------------------------------------- |
| Quota spent early, occasionally | Nothing. Working as intended.                                                    |
| Quota spent early, consistently | Raise the ceiling toward the provider's real limit; consider a fallback provider |
| One IP hitting the limit daily  | Probably a shared network. Consider raising `DAILY_IP_LIMIT`.                    |
| Sudden implausible spike        | Kill switch, investigate, rotate the key if needed                               |
| Key compromised                 | Kill switch, revoke, rotate                                                      |

If the global counter is consistently maxed early, the response is not to buy capacity. It is to
raise the ceiling toward the provider's real limit, or add a fallback provider.

## Content Security Policy

```
default-src 'self';
script-src 'self' https://apis.google.com https://www.gstatic.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://www.google.com https://*.googleusercontent.com;
font-src 'self';
connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://apis.google.com https://www.googleapis.com https://www.google.com;
frame-src https://*.firebaseapp.com https://accounts.google.com https://apis.google.com;
worker-src 'self' blob:;
frame-ancestors 'none';
base-uri 'self';
form-action 'none';
```

`vercel.json` is the source of truth if the two drift.

`style-src 'unsafe-inline'` is required by Tailwind's runtime style injection; `worker-src blob:`
by the parsing worker. The Google/Firebase entries are the full documented set Firebase Auth needs,
added in one pass after several deploys of fixing them one domain at a time: `apis.google.com` (the
`gapi` client), `www.gstatic.com` (Firebase's hosted scripts), `accounts.google.com` (the OAuth
screen), `*.firebaseapp.com` (the auth handler), and `www.google.com` for a tracking beacon `gapi`
fetches during sign-in. This is a measurable relaxation of a previously very tight CSP, and it
applies to every visitor. The AI provider is proxied server-side rather than called from the
browser, so exfiltration to any other third party is still blocked.

`form-action 'none'` because the app submits no forms anywhere.

Other headers:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

`Referrer-Policy: no-referrer` because no destination has any reason to learn where a user came from.
