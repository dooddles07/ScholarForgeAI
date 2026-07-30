# API Contracts

Purpose: the wire format for the one endpoint this app has.
Last updated: 2026-07-30

There is exactly one endpoint. Everything else happens in the browser.

## `POST /api/generate`

### Request

```
POST /api/generate
Content-Type: application/json
X-User-Key: <optional user-supplied API key>
```

```ts
interface GenerateRequest {
  task: 'quiz' | 'flashcards' | 'explain' | 'exam' | 'chat' | 'expandQuery';
  text: string;               // document text, or selected chunks
  options: TaskOptions;       // shape depends on task
  pageRange: {                // the real page range of the text sent,
    start: number;            // so the server can validate citations
    end: number;
  };
}
```

`pageRange` is what makes server-side citation validation possible. Without it the server cannot tell whether a cited page number is real.

No project API key appears anywhere in the request. There is nothing in the client bundle to extract.

### Options per task

```ts
type TaskOptions =
  | { task: 'quiz'; count: number; difficulty: Difficulty;
      types: QuestionType[]; topics?: string[] }

  | { task: 'flashcards'; count: number; topics?: string[] }

  | { task: 'explain'; concept: string; depth: 'simple' | 'normal' | 'deep' }

  | { task: 'exam'; count: number;
      typeMix: Partial<Record<QuestionType, number>>;
      difficultySpread: { easy: number; medium: number; hard: number };
      topics?: string[]; timeLimitMinutes?: number; marksPerQuestion?: number }

  | { task: 'chat'; question: string;
      history: { role: 'user' | 'assistant'; content: string }[] }

  | { task: 'expandQuery'; query: string };
```

### Success response

```
200 OK
```

```ts
interface GenerateResponse {
  task: string;
  data: unknown;              // shape per task, see PROMPT-LIBRARY.md
  meta: {
    droppedItems: number;     // failed grounding validation
    quotaRemaining: number | null;   // null when using own key
    quotaResetsAt: number | null;    // epoch ms
    usedOwnKey: boolean;
  };
}
```

`droppedItems` is surfaced honestly in the interface. If a user asked for ten questions and got eight, they are told two were discarded for lacking a verifiable source, rather than silently receiving fewer. Hiding it would look like a bug.

### Errors

All errors use the same envelope, so the client has one path to handle.

```ts
interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;          // user-facing, already plain language
    retryable: boolean;
    resetsAt?: number;        // epoch ms, for quota errors
  };
}
```

| Code | HTTP | Meaning | Retryable |
|---|---|---|---|
| `QUOTA_EXHAUSTED_GLOBAL` | 429 | The shared daily pool is spent | No, until reset |
| `QUOTA_EXHAUSTED_IP` | 429 | This user's daily allowance is spent | No, until reset |
| `INVALID_USER_KEY` | 401 | The supplied key was rejected by the provider | No |
| `PROVIDER_ERROR` | 502 | The provider failed after our retries | Yes |
| `PROVIDER_TIMEOUT` | 504 | The provider did not respond in time | Yes |
| `TEXT_TOO_LARGE` | 413 | Text exceeds the context window | No |
| `BAD_REQUEST` | 400 | Malformed request | No |
| `GROUNDING_FAILED` | 422 | Too many items lacked a verifiable source, twice | Yes |
| `SERVICE_DISABLED` | 503 | Kill switch active | No |
| `FORBIDDEN_ORIGIN` | 403 | Request not from our origin | No |

Messages are written for users, not developers. `QUOTA_EXHAUSTED_GLOBAL` carries something like:

> Today's free AI usage has run out. It resets at midnight Pacific time, about 7 hours from now. Everything you have already made still works. If you would rather not wait, you can add your own free key in Settings.

Never "429 Too Many Requests". Never "quota exceeded". Never a suggestion to pay. Full wording in [CONTENT-AND-COPY-GUIDE.md](../02-DESIGN/CONTENT-AND-COPY-GUIDE.md).

`GROUNDING_FAILED` is worth noting: we return an error rather than degraded content. Returning three questions of doubtful provenance would be worse than returning none.

## Server-side sequence

```
1. Method and content-type check           → 400
2. Origin check                            → 403
3. Kill switch                             → 503
4. Body parse and validate                 → 400
5. Text size check against context window  → 413
6. If X-User-Key present:
     use it, skip quota entirely
   Else:
     check per-IP daily counter            → 429 IP
     check global daily counter            → 429 GLOBAL
     increment both
7. Assemble prompt + response schema
8. Call provider, with retries
9. Validate schema conformance
10. Validate grounding item by item
11. Drop failures; retry once if over half failed
12. Return validated data + meta
```

Quota is checked before the provider call, and incremented at the same point, so a failed provider call still consumes allowance. That is deliberate: the request reached the provider and counted against the real limit, so pretending otherwise would let failures overrun the actual ceiling.

## Rate limits

| Scope | Limit | Window |
|---|---|---|
| Per IP | Configured value | Daily, resetting at provider reset time |
| Global | Configured value, below the provider's real limit | Daily |
| Own key | None from us | — |

Both figures are configuration, not constants. Public sources disagree on the provider's exact free-tier daily figure, so the value is set from the official rate-limit page before launch. See [ZERO-COST-INFRASTRUCTURE.md](../04-OPERATIONS/ZERO-COST-INFRASTRUCTURE.md) and [RATE-LIMITING-AND-ABUSE.md](../04-OPERATIONS/RATE-LIMITING-AND-ABUSE.md).

Per-IP limiting is imperfect. Users behind shared NAT share a bucket, and a determined abuser can rotate addresses. Accepted as good enough for the threat model, which is casual overuse rather than a targeted attack.

## What the server never does

| Never | Because |
|---|---|
| Return the project API key, in any form | It is the one secret in the system |
| Log prompts or document text | Privacy commitment |
| Log or store a user-supplied key | It is the user's credential, not ours |
| Store anything about a user | There is no database, by design |
| Retain IP addresses beyond the rate-limit window | Minimisation |
| Set a cookie | Nothing to track |

Counters are integers with no identifier attached. See [SECURITY-AND-PRIVACY.md](../04-OPERATIONS/SECURITY-AND-PRIVACY.md).

## Client handling

`src/ai/client.ts` is the only file in the app that calls `fetch`. It:

- Serialises requests and attaches `X-User-Key` when present
- Applies the retry policy for retryable codes
- Supports cancellation via `AbortController`
- Translates `ErrorCode` into a domain error the UI can render
- Surfaces `quotaRemaining` so the interface can warn before the wall, not only at it

Warning before the wall matters. A user two generations from the limit should know, so they can choose what to spend them on.

## Mock mode

With the mock flag set, `src/ai/client.ts` short-circuits to fixtures in `src/ai/mock/` and makes no network request.

Fixtures cover the awkward cases as well as the happy path: a response with items that fail grounding validation, a malformed response, `QUOTA_EXHAUSTED_GLOBAL`, and a provider timeout. Testing only success paths is how error handling rots.

This is what lets a contributor run the whole app with no API key.

## Versioning

The endpoint is unversioned. Client and server ship together from one repository to one deployment, so there is no compatibility window to manage. If that ever changes, version by path.
