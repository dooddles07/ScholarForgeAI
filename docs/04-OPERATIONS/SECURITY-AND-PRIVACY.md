# Security and Privacy

Purpose: what we protect, what we never collect, and the threat model.
Last updated: 2026-07-31

## The short version

We hold almost nothing, so there is almost nothing to lose. A Google account is required to use the app, but we keep no user database of our own, no uploaded files, no analytics — unless you opt into cloud sync, which is off by default even for a signed-in user. The only secret in the system is one API key, and it lives server-side.

That is a security posture achieved by architecture rather than by policy.

## What we never collect

| Never collected |
|---|
| Names, email addresses, or any identity information, unless you opt into cloud sync |
| Passwords — Google handles authentication for both sign-in and cloud sync; we never see or store a password |
| Uploaded files, in any form |
| Document contents, beyond the moment of a single request |
| Quiz results, review history, or progress data, unless you opt into cloud sync |
| Analytics, page views, session recordings, or behavioural data |
| Device fingerprints |
| Cookies of any kind |

No cookie consent banner appears because we set no cookies. That is worth stating plainly, since its absence is usually taken as an oversight.

If you opt into cloud sync, see [ADR-0010](../08-DECISIONS/ADR-0010-OPTIONAL-CLOUD-SYNC.md) and the "Cloud sync (opt-in)" row below for exactly what that adds.

## What briefly transits our server

Only this:

- **Extracted document text**, and only the portion needed for the specific request being made
- **Generation options**, such as question count and difficulty
- **A user-supplied API key**, on that user's own requests, when they have provided one

It is used to fulfil the request and then discarded. It is never written to storage, never logged, and never retained after the response.

## What is stored, and where

| Data | Location | Who can see it |
|---|---|---|
| Uploaded documents and extracted text | The user's browser, IndexedDB | The user only |
| Flashcards, decks, schedules | The user's browser | The user only |
| Quiz and exam results | The user's browser | The user only |
| Progress and review history | The user's browser | The user only |
| A user-supplied API key | The user's browser | The user only |
| Aggregate request counters | Upstash Redis | Us, as integers with no identifier |
| The project API key | Vercel environment variables | Us only |
| Cloud sync backup (opt-in only) | Firebase Firestore, one document per user at `backups/{uid}` | The signed-in user only, enforced by Firestore security rules |

Everything in the first six rows is local to the device. See [ADR-0001](../08-DECISIONS/ADR-0001-LOCAL-FIRST-STORAGE.md).

**Cloud sync (opt-in).** If, and only if, a user signs in with Google under Settings → "Sync across devices," their `backups/{uid}` Firestore document holds the same data as the first three rows above (documents, decks, cards, quizzes, attempts, exams, conversations, review log) plus their Google account email address, which Firebase Auth uses as the account identifier. Nothing is synced to Firestore unless the user explicitly signs in and taps "Sync now." See [ADR-0010](../08-DECISIONS/ADR-0010-OPTIONAL-CLOUD-SYNC.md).

## The one secret

`GEMINI_API_KEY`, held as a Vercel environment variable.

**Rules, non-negotiable:**

1. Never in any client bundle
2. Never in any committed file, including examples and tests
3. Never in any log
4. Never in any response body or header
5. Never in an error message

The reason for the strictness: a key that reaches a browser is published, and a published key gets scraped and drained. This is the entire justification for having a server at all. See [ADR-0002](../08-DECISIONS/ADR-0002-SHARED-KEY-BEHIND-PROXY.md).

**Enforcement**

- A pre-commit hook scans staged changes for key-shaped strings
- CI scans the built bundle for anything resembling an API key and fails the build on a match
- `.env` files are gitignored, and only `.env.example` with placeholder values is committed
- Key rotation is documented in [DEPLOYMENT.md](DEPLOYMENT.md) and can be done in minutes

## User-supplied keys

A user's own key is their credential, not ours.

| Rule |
|---|
| Stored in the user's browser only |
| Sent as a request header, used for that request, then discarded |
| Never written to any server-side storage |
| Never logged, in full or in part |
| Never included in any error message or counter |

The settings screen states all of this in plain language, because asking someone to paste a credential without explaining what happens to it is not acceptable.

## Threat model

### Threats we defend against

| Threat | Defence |
|---|---|
| Someone extracts the API key from the bundle | The key is never in the bundle. This is the primary defence and it is structural. |
| One user drains the shared quota | Per-IP daily counter |
| Automated abuse of the proxy | Origin check, per-IP limit, global ceiling, kill switch |
| The project exceeds the provider's free tier | Global ceiling set below the real limit |
| A malicious document causes code execution | Parsing libraries are sandboxed in a Web Worker; extracted text is treated as data and never evaluated |
| Prompt injection via document contents | Document text is clearly delimited in the prompt; the system instruction takes priority; output is schema-validated and grounding-checked |
| XSS via generated content | React escapes by default; no `dangerouslySetInnerHTML` on model output; a strict Content Security Policy |
| Someone reads another user's data | There is no shared storage for anyone who doesn't opt into cloud sync — data never leaves the device. For a signed-in user, Firestore security rules restrict `backups/{uid}` to that user's own authenticated UID; no app-code bug can expose it to another user. |
| A data breach exposing user information | We hold no user information, unless a user opted into cloud sync, in which case their study data and Google email live in their own Firestore document, protected by Firebase's security and Firestore's per-user access rules rather than by us holding nothing |

### Prompt injection, specifically

A document could contain text attempting to instruct the model — for example, an instruction embedded in a PDF telling it to ignore its rules.

Mitigations:

1. Document text is clearly delimited and labelled as data in the prompt
2. The system instruction states that only document content may be used and that instructions found inside the document are not to be followed
3. Output is validated against a strict schema, so a hijacked response fails structurally
4. Grounding validation checks that every item cites a real page and quotes real text

The blast radius is also inherently small. The worst realistic outcome is a bad quiz question for the user who uploaded the file. There is no other user's data to reach, no account to compromise, and no privileged action the model can invoke.

### Threats we accept

| Threat | Why accepted |
|---|---|
| Determined abuser rotating IP addresses | The global ceiling caps total damage. The realistic threat is casual overuse, not a targeted attack. |
| Users behind shared NAT sharing a rate-limit bucket | Unavoidable with IP-based limiting. Mitigated by bring-your-own-key. |
| A user losing local data to a cleared cache | No server copy exists, by design. Mitigated by export prompting, not eliminated. |
| Malicious content in a document | It only affects the user who uploaded it |

## Content Security Policy

```
default-src 'self';
script-src 'self' https://apis.google.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self';
connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com;
frame-src https://*.firebaseapp.com;
worker-src 'self' blob:;
frame-ancestors 'none';
base-uri 'self';
form-action 'none';
```

(This is the actual header in `vercel.json`, which is the source of truth if the two ever drift. See [DEPLOYMENT.md](DEPLOYMENT.md)'s "Turning on cloud sync" section for why `connect-src`, `script-src`, and `frame-src` carry Firebase entries.)

`style-src 'unsafe-inline'` is required by Tailwind's runtime style injection. `worker-src blob:` is required by the parsing worker. `connect-src` is restricted to our own origin, Firebase's Auth/Firestore origins (only reached if a user opts into cloud sync), and the AI provider is proxied server-side rather than called from the browser at all — which means exfiltration to any other third party is blocked by the browser even if something else went wrong. `script-src`'s `https://apis.google.com` and `frame-src`'s `https://*.firebaseapp.com` are both required by Firebase Auth's redirect sign-in flow; see [ADR-0010](../08-DECISIONS/ADR-0010-OPTIONAL-CLOUD-SYNC.md)'s Consequences section for the tradeoff this represents.

`form-action 'none'` because the app submits no forms anywhere.

## Other headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

`Referrer-Policy: no-referrer` because there is no reason for any destination to learn where a user came from.

`Permissions-Policy` explicitly denies capabilities we never use, so a future dependency cannot quietly request them.

## Dependency security

| Practice |
|---|
| `npm audit` in CI; high or critical severity fails the build |
| Dependabot enabled for security updates |
| Lockfile committed |
| A new dependency requires justification against the rules in [TECH-STACK.md](../03-ARCHITECTURE/TECH-STACK.md) |
| Minimal dependency count, deliberately |

Fewer dependencies is itself a security measure. Every package is code we did not write running in our users' browsers.

## What we log

Only counters. Integers with no identifier attached.

| Logged | Not logged |
|---|---|
| Total requests per day | Prompts |
| Requests per task type | Document text |
| Error counts by code | User-supplied keys |
| Quota-exhaustion events | IP addresses beyond the rate-limit window |
| — | Anything identifying a user |

IP addresses are used to compute the rate-limit bucket and are not retained beyond that window.

Detail in [MONITORING-AND-LIMITS.md](MONITORING-AND-LIMITS.md).

## Privacy in the interface

The privacy position is only useful if users know about it, so it is stated where it matters rather than only in a policy document.

| Location | Statement |
|---|---|
| Under the drop zone | "Your file stays on your device. We never upload it." |
| First run | Data is local to this browser unless synced; export is how you back it up |
| Before a generation | What text is sent, if the user asks |
| Key settings | The key stays in this browser and is never sent to our servers |
| Private browsing | Nothing will be saved after this window closes |

## User rights

Because we hold no personal data, most data-subject rights do not apply to us. What matters is that users can act on their own data:

| Right | How |
|---|---|
| Access | It is on their device; export produces a complete copy |
| Deletion | "Delete everything" in settings; instant and complete |
| Portability | Export as `.json`, importable anywhere |
| No tracking | Nothing to opt out of |

## Reporting a vulnerability

A `SECURITY.md` at the repository root will describe private reporting via GitHub security advisories rather than a public issue.

Response commitment: acknowledge within seven days, and fix or explain within thirty. This is a solo-maintained project and the commitment is set at a level that can actually be honoured.

## Incident response

If the shared key is compromised:

1. Activate the kill switch, disabling shared-key generation without a redeploy
2. Revoke the key in Google AI Studio
3. Issue a new key and update the Vercel environment variable
4. Deactivate the kill switch
5. Determine how it leaked and close that path
6. Record the incident in [ACTIVITY-LOG.md](../ACTIVITY-LOG.md)

Users are unaffected beyond a temporary inability to generate. Nothing stored is at risk, because nothing stored is ours.

The kill switch existing before it is needed is the important part.
