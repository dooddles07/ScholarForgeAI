# API Contracts

Purpose: the wire format for the one endpoint this app has.
Last updated: 2026-07-31

There is exactly one endpoint. Everything else happens in the browser.

## `POST /api/generate`

### Request

```
POST /api/generate
Content-Type: application/json
```

```ts
interface GenerateRequest {
  kind: 'questions' | 'cards' | 'chat';
  chunks: { id: string; text: string; pageStart: number; pageEnd: number }[];
  count?: number;              // questions/cards only; defaults to 8 for questions, 12 for cards
  question?: string;           // chat only
  difficulty?: 'easy' | 'medium' | 'hard';   // questions only, optional
  types?: ('mcq' | 'trueFalse' | 'shortAnswer' | 'fillBlank')[];  // questions only, optional
  apiKey?: string;             // the user's own key, when they've supplied one in Settings
}
```

`difficulty` and `types` are real and enforced: an absent `difficulty` gets no instruction (the
model picks its own mix), and an absent or empty `types` allows all four question types. When
`types` is provided, the response schema's `type` enum is restricted to exactly those values —
schema-level enforcement, not just a prompt suggestion.

One flat body shape covers all three kinds — there is no per-task options union. `apiKey` travels
in the JSON body, not a header. Each chunk already carries its own `pageStart`/`pageEnd`, so the
server never needs a separate page-range field to validate a citation against.

No project API key appears anywhere in the request. There is nothing in the client bundle to extract.

**Only three kinds exist.** `explain` and `exam` are not separate proxy calls: `ExamPage.tsx` reuses
`kind: 'questions'` with a different count, and there is no depth-parameterised explanation feature
built yet (it appears in marketing copy, not in any hook or call site). Query expansion
(`expandQuery`) was never built either — BM25 retrieval ([ADR-0006](../08-DECISIONS/ADR-0006-BM25-RETRIEVAL-NOT-EMBEDDINGS.md)) needs none.

### Success response

```
200 OK
```

```ts
// kind: 'questions' | 'cards'
interface ItemsResponse {
  items: {
    // question fields (type, prompt, options, correctIndex, correctAnswer, explanation, topic)
    // or card fields (front, back, topic) — see api/_lib/gemini.ts
    citation: { chunkId: string; pageStart: number; pageEnd: number; quote: string };
  }[];
}

// kind: 'chat'
interface ChatResponse {
  content: string;
  citations: { chunkId: string; pageStart: number; pageEnd: number; quote: string }[];
}
```

There is no `meta` object — no `quotaRemaining`, `droppedItems` count, `quotaResetsAt`, or
`usedOwnKey` anywhere in the response. If a request asked for ten questions and got eight back,
that's visible only as a shorter `items` array; the client (`use-quiz-session.ts`'s `shortfall`)
infers the count difference itself rather than reading a server-provided count.

### Errors

```ts
interface ErrorResponse {
  error: string; // a flat code, see the table below
}
```

| Code | HTTP | Meaning |
|---|---|---|
| `METHOD_NOT_ALLOWED` | 405 | Not a POST |
| `FORBIDDEN` | 403 | Request not from the allowed origin |
| `BAD_REQUEST` | 400 | Malformed body — missing `kind`, empty `chunks`, etc. |
| `TEXT_TOO_LARGE` | 413 | Combined chunk text exceeds the configured safety margin under Gemini's context window |
| `INVALID_API_KEY` | 400 | A user-supplied key failed basic format validation, before ever reaching the provider |
| `SERVICE_UNAVAILABLE` | 503 | Quota service (Upstash) unreachable, or no key available at all — fails closed |
| `QUOTA_EXCEEDED` | 429 | Per-IP or global daily quota spent (one code covers both) |
| `SERVICE_DISABLED` | 503 | Kill switch active |
| `PROVIDER_ERROR` | 502, or the provider's own status if under 500 | Gemini call failed |

Messages are written for users, not developers, on the client side: `src/lib/generation-error.ts`
maps `QUOTA_EXCEEDED`/`SERVICE_DISABLED`/`SERVICE_UNAVAILABLE` to the honest quota-exhausted copy in
[CONTENT-AND-COPY-GUIDE.md](../02-DESIGN/CONTENT-AND-COPY-GUIDE.md); every other code falls back to
a generic "something went wrong, try again" message. Never "429 Too Many Requests". Never "quota
exceeded". Never a suggestion to pay.

**There is no retry, either server- or client-side.** A malformed provider response or an
over-half-ungrounded batch is not retried — ungrounded items are silently dropped and whatever
survives is returned as-is. This is a real gap, not a documented design choice.

## Server-side sequence

The real sequence in `api/generate.ts`:

```
1. Method check                                    → 405
2. Origin check                                     → 403
3. Body validate (kind present, chunks non-empty)   → 400
4. Text size check against the context-window margin → 413
5. If apiKey supplied:
     validate its format                            → 400 INVALID_API_KEY
     use it, skip quota entirely
   Else:
     hash the IP, check per-IP and global daily counters (api/_lib/quota.ts)
       → 429 QUOTA_EXCEEDED, 503 SERVICE_DISABLED, or 503 SERVICE_UNAVAILABLE
6. Call Gemini with the assembled prompt + JSON response schema
7. For each returned item, drop it unless its chunkId matches a chunk actually sent
8. Return the surviving items (or chat content + citations)
```

Quota is checked and incremented before the provider call, so a failed provider call still
consumes allowance — the request reached the provider and counted against the real limit, so
pretending otherwise would let failures overrun the actual ceiling.

## Rate limits

| Scope | Limit | Window |
|---|---|---|
| Per IP | `DAILY_IP_LIMIT`, configured | Daily |
| Global | `DAILY_GLOBAL_LIMIT`, configured, below the provider's real limit | Daily |
| Own key | None from us | — |

Both figures are configuration, not constants. Public sources disagree on the provider's exact
free-tier daily figure, so the value is set from the official rate-limit page before launch. See
[ZERO-COST-INFRASTRUCTURE.md](../04-OPERATIONS/ZERO-COST-INFRASTRUCTURE.md) and
[RATE-LIMITING-AND-ABUSE.md](../04-OPERATIONS/RATE-LIMITING-AND-ABUSE.md).

Per-IP limiting is imperfect. Users behind shared NAT share a bucket, and a determined abuser can
rotate addresses. Accepted as good enough for the threat model, which is casual overuse rather than
a targeted attack.

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

- Serialises requests, attaching `apiKey` to the body when the user has supplied one
- Supports cancellation via `AbortController`
- Translates an error code into a domain error the UI can render (`ProxyError`, mapped by
  `src/lib/generation-error.ts`)

There is no client-side retry policy, and no `quotaRemaining` value to surface — a request either
succeeds or fails once.

## Mock mode

With `IS_MOCK_MODE` set (dev builds), `src/ai/client.ts` short-circuits to fixtures in
`src/ai/mock/` and makes no network request.

**Today this covers only the happy path.** `src/ai/mock/` (`document.ts`, `generate.ts`, `cards.ts`,
`questions.ts`) has no fixtures for a malformed response, a quota-exhausted error, or an item that
fails grounding — a real gap for testing error handling, not a documented design choice.

This is what lets a contributor run the whole app with no API key.

## Versioning

The endpoint is unversioned. Client and server ship together from one repository to one
deployment, so there is no compatibility window to manage. If that ever changes, version by path.
