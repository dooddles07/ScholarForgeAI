# Architecture

How the system is put together, where the boundaries are, how data moves, and why each major call
was made.

## The shape of it in one idea

**The browser is the application. The server is a keyhole.**

Almost everything happens on the user's device: parsing, storage, search, scheduling, scoring,
export. Exactly one thing needs a server, and only because a secret has to live somewhere the user
cannot read it — the AI API key.

That inversion is what makes the whole thing free. No storage bill, no compute bill, no database,
no bandwidth for file uploads.

```
┌─────────────────────────────────────────────────────────────────┐
│  BROWSER                                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  UI — React components, routes, Tailwind                  │  │
│  │  Knows nothing about pdfjs, Dexie, or fetch.              │  │
│  └────────────────────────┬──────────────────────────────────┘  │
│                           │ hooks only                          │
│  ┌────────────────────────▼──────────────────────────────────┐  │
│  │  DOMAIN — the rules, all pure functions                    │  │
│  │  scoring · scheduling · chunking · BM25 · validation       │  │
│  │  No I/O. No React. Runs unchanged in Node.                 │  │
│  └────────┬───────────────┬──────────────┬───────────────────┘  │
│  ┌────────▼──────┐ ┌──────▼──────┐ ┌─────▼──────────────────┐   │
│  │ PARSING       │ │ PERSISTENCE │ │ AI CLIENT              │   │
│  │ Web Worker    │ │ Dexie /     │ │ the only thing that    │   │
│  │ pdfjs, jszip, │ │ IndexedDB   │ │ talks to the network   │   │
│  │ mammoth       │ │             │ │                        │   │
│  └───────────────┘ └─────────────┘ └─────────┬──────────────┘   │
│  ┌────────────────────────────────────────────┼──────────────┐  │
│  │  SERVICE WORKER — app shell cache, offline │              │  │
│  └────────────────────────────────────────────┼──────────────┘  │
└───────────────────────────────────────────────┼─────────────────┘
                    only extracted text crosses this line
                    files never do
┌───────────────────────────────────────────────▼─────────────────┐
│  VERCEL NODE FUNCTION   /api/generate                           │
│  1. origin check                                                │
│  2. per-IP daily quota      ─┐                                  │
│  3. global daily ceiling     ├── Upstash Redis counters         │
│  4. kill-switch check       ─┘                                  │
│  5. assemble prompt + JSON response schema                      │
│  6. call provider, validate, strip anything ungrounded          │
│                                                                 │
│  Holds GROQ_API_KEY as an env var. Never returns it.            │
│  Logs counters only. Never logs prompts or document text.       │
└───────────────────────────────────────────────┬─────────────────┘
                              ┌─────────────────▼─────────────────┐
                              │  Groq gpt-oss-120b (free tier)    │
                              └───────────────────────────────────┘
```

Firebase Auth and Firestore sit alongside this, reached directly from the browser rather than
through the function. See "Auth and sync" below.

## Layers

Dependencies point one way only, enforced by ESLint rather than review. The table of what may
import what is in [RULES.md](RULES.md).

**UI** renders state and raises intent. May import domain and call hooks; may not import `pdfjs`,
`Dexie`, or call `fetch`. If a component imports a parser, the boundary has been broken.

**Domain** is the rules of the product as pure functions: quiz scoring and answer matching, FSRS
scheduling, text chunking, BM25 ranking, response validation and grounding checks, export
formatting, settings merge rules. No I/O, no React, no browser APIs. The practical test: this layer
runs unchanged in Node with no DOM. This is where the test suite is densest, because pure functions
are cheap to test exhaustively.

**Parsing** runs in a Web Worker and owns every document library — the only module importing
`pdfjs-dist`, `mammoth`, or `jszip`. In a worker because parsing a large PDF on the main thread
freezes the interface.

**Persistence** owns Dexie and the IndexedDB schema. Every read and write goes through it.

**AI client** is the only module that makes network requests to our own function. Owns request
construction, cancellation, and error translation from wire errors into domain errors.

**Hooks** are the only sanctioned bridge from UI to infrastructure.

Each module can be understood without reading its neighbours, which is what makes the codebase
survivable for a solo maintainer. Concretely: swapping AI provider touches one module, adding a
document format touches one module, changing the schema touches one module, and testing scoring
requires no browser, no database, and no network.

## Layout

```
api/                       Vercel Node Functions, the only server code
├── generate.ts            the AI proxy
└── _lib/
    ├── groq.ts            prompt assembly, response schemas
    ├── grounding.ts       citation validation, pure and tested
    ├── quota.ts           Upstash counters, kill switch
    └── security.ts        origin check, salted IP hashing
src/
├── App.tsx                routes only
├── ui/                    presentation — components/, layouts/, pages/<route>/
├── domain/                pure logic — quiz/, scheduling/, text/, retrieval/, export/, settings/
├── parsing/               Web Worker, one module per format
├── persistence/           Dexie, backup, sync
├── ai/                    client.ts and mock/ fixtures
├── hooks/                 the bridge
├── copy/                  every user-facing string
└── styles/                tokens.css, globals.css, print.css
```

Route pages live under `src/ui/pages/<route>/`, each self-contained with local `components/`. A
component used by two or more pages moves up to `src/ui/components/`.

## Stack

React, TypeScript, Vite, react-router. Tailwind v4 with CSS-first config, Radix primitives via
shadcn/ui copied into the repo and owned by us, `lucide-react` for icons. `dexie` for IndexedDB,
`ts-fsrs` for scheduling, `pdfjs-dist` / `mammoth` / `jszip` for parsing, `vite-plugin-pwa` and
workbox for the service worker. Vitest, Testing Library, `fake-indexeddb`, Playwright and axe-core
for tests. Firebase Auth and Firestore for sign-in and sync. `@upstash/redis` server-side.

Every dependency is permissively licensed and free. The bar for adding one is in [RULES.md](RULES.md).

## Data flow — upload

```
User picks a file
  ▼ UI validates size and extension          ← fails fast, before any work
  ▼ File handed to the parsing worker
  ▼ Worker lazy-imports the right parser     ← .txt never downloads pdfjs
  ▼ Extract raw text with page numbers
  ▼ Detect a scan (text density heuristic)   → refuse, with a clear message
  ▼ Clean: strip headers, footers, page numbers, fix hyphenation
  ▼ Chunk on structure, never mid-sentence
  ▼ Detect topic outline from headings
  ▼ Build the BM25 index
  ▼ Persistence stores ParsedDocument
  ▼ UI shows the document, ready
```

No network request occurs anywhere in this flow. That is a testable claim, and it is tested.

## Data flow — generating a quiz

```
User configures and starts
  ▼ Domain decides retrieval tier
    ├── fits context ──► send whole document text
    └── too long ─────► BM25 selects chunks, plus outline signals
  ▼ AI client POSTs { kind, chunks, count, difficulty?, types? }   ← no key, no file
  ─────────────────── network ───────────────────
  ▼ Function: origin check → quota → kill switch
  ▼ Assemble prompt + strict JSON response schema
  ▼ Call Groq with structured output
  ▼ Drop any item whose chunkId does not match one we actually sent
  ─────────────────── network ───────────────────
  ▼ Domain randomises correct-answer positions
  ▼ Persistence stores the quiz
  ▼ UI shows question one
```

Two things worth noting. **Validation happens on the server**, so an ungrounded question never
reaches the client, and the page numbers in a citation always come from our own chunk data rather
than a model claim. **Answer-position randomisation happens client-side**, because models have
positional biases that survive good prompting.

## The wire

One endpoint, `POST /api/generate`, discriminated by `kind`. Only three exist: `questions`,
`cards`, `chat`. `explain` and `exam` are not separate calls — the exam page reuses `questions`
with a different count. No key of any sort appears in the request.

```
Body: { kind, chunks, count?, question?, difficulty?, types? }
```

Errors are codes, never prose: `METHOD_NOT_ALLOWED`, `FORBIDDEN`, `BAD_REQUEST`, `TEXT_TOO_LARGE`,
`QUOTA_EXCEEDED`, `RATE_LIMITED`, `SERVICE_DISABLED`, `SERVICE_UNAVAILABLE`, `PROVIDER_ERROR`,
`INTERNAL_ERROR`.
The client maps them to user copy; quota codes get the honest quota message, everything else gets
the generic one. `INTERNAL_ERROR` (500) is a top-level catch-all around the whole handler, distinct
from `SERVICE_UNAVAILABLE` (503, a known dependency is down) so error-rate monitoring can tell
"Upstash is down" apart from "we shipped a bug".

Every kind requests a strict JSON schema via Groq's `response_format: json_schema`. This is the
single most valuable property of the provider choice: the model returns parseable JSON conforming to
a declared shape, rather than prose we have to extract JSON from.

`MAX_CHARS` is 24,000, set by Groq's 8,000 tokens-per-minute cap rather than the model's 131k
context window — the per-minute budget binds first by a wide margin. The client selects which
passages to send, which is also what keeps the document itself on the device.

## Mock mode

`VITE_MOCK_AI=true` serves fixtures from `src/ai/mock/` and makes no network request, so a
contributor can work on the interface without credentials. It is an explicit opt-in rather than
tied to the dev server: a `npm run dev` that could never reach the real pipeline hides integration
breakage until deploy.

`VITE_MOCK_FAILURE` forces any error code, plus `UNGROUNDED`, which succeeds and returns nothing —
the case where every item fails the citation check.

## Auth and sync

Every `/app` route is gated behind Firebase Google sign-in via `AuthGate`. **This is a UI gate, not
a data-layer security boundary** — the real protection is `firestore.rules`.

Two Firestore documents per user, both owner-restricted:

- **`backups/{uid}`** — the full study library, written only when the user taps "Sync now". Pulled
  on sign-in and offered for restore. Restoring merges by id, so it never destroys local work.
- **`userSettings/{uid}`** — preferences and the streak, synced continuously via `onSnapshot` with
  a 600 ms debounce on writes.

Preferences live in their own document rather than inside the backup because that document holds
every parsed page of every upload; a listener on it would re-download the whole corpus to learn
that a toggle moved. Firestore's persistent local cache queues offline writes and flushes them on
reconnect. Conflicts settle by last-write-wins on a client `updatedAt`.

The listener starts on `requestIdleCallback` with a 2 s timeout, because the Firestore SDK is the
largest chunk in the app and a preference arriving a second late costs nothing.

## What crosses the network

**Crosses:** extracted document text relevant to the current request, generation options, and —
for signed-in users — the synced preference subset. Study data crosses only on an explicit "Sync
now".

**Never crosses:** the original file, and any study content the user has not chosen to sync.

## Failure modes

| Failure                   | Behaviour                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| Offline                   | App loads from cache. Stored content fully usable. AI actions disabled with a stated reason. |
| Shared quota spent        | Plain message and reset time. No alternative path. Nothing stored becomes unavailable.       |
| Provider down or erroring | Clear failure. There are no retries, so one failure cannot cascade.                          |
| Malformed model response  | Schema validation rejects it server-side; it fails cleanly.                                  |
| Every item ungrounded     | A 200 with an empty result, which is a different UI path from an error.                      |
| Backup over 1 MB          | Refused client-side at 900 KB with a message pointing at file export.                        |
| Parse failure             | Named cause and a suggested next step. Other documents unaffected.                           |
| Storage full              | Warning at 80%, offer to delete old documents, export prompted.                              |
| Storage evicted           | Unrecoverable. Mitigated by `navigator.storage.persist()` and by prompting export.           |
| Private browsing          | Detected, warned: data will not persist.                                                     |

## Performance

| Concern                          | Approach                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Interface freezing while parsing | Web Worker, always                                                                                   |
| Initial bundle size              | Route-level code splitting; parsers lazy-imported per format; Firebase chunks excluded from precache |
| Large document memory            | Stream where the format allows; hard size ceiling; page-range option                                 |
| Slow connection                  | Small shell, cached aggressively, works offline after first load                                     |
| Search speed                     | BM25 index built once at upload, held in memory during a session                                     |
| Re-render cost                   | Domain layer is pure, so results memoise cleanly                                                     |

---

# Decisions

Condensed from the ADRs. Each entry is the call, the reasoning, and what it cost.

## Local-first storage

**Everything is stored in the browser via IndexedDB. There is no application database.**

Three constraints forced it: zero cost permanently, no signup friction, and students uploading
coursework should not have to trust a solo-maintained project with their files. The free database
tiers available pause themselves after a week of inactivity — and study usage is bursty and
seasonal, so that pause would land exactly when someone returns for the next exam.

**Cost:** a cleared cache destroys everything, with no server copy to restore from. Mitigated by
export prompting and later by cloud sync, but never eliminated.

The "no accounts" half of this decision was later reversed. The local-first storage half was not.

## One shared AI key behind a proxy

**A single project-owned key lives in a server environment variable; the browser never sees it.**

Free AI tiers are keyed per account, and a stranger arriving at the site has no account. A key that
ships to a browser is a published key: it gets scraped and drained, and the bill lands on the
owner. The proxy is the entire reason a server exists at all.

It also earns three things: prompts improve without a client release, validation happens
server-side so an ungrounded question is dropped before it reaches a student, and abuse has one
chokepoint.

**Bring-your-own-key was removed later.** The original design paired the shared key with a BYOK
escape hatch and leaned on it hard — the claim was that the product "scales to any number of users
at zero cost" because heavy users bring their own key. Removing it means **when the daily quota is
spent, generation stops for everyone until reset.** That is the single biggest weakness in the
current design. Popularity now degrades the product for everyone rather than routing around itself.
What it bought: one code path through generation, no key-format validation, no quota-bypass branch,
and nothing in the product asking a student to go and create an API key.

## Groq rather than Gemini

**The provider is Groq, model `gpt-oss-120b`.**

Gemini was chosen first for its free tier, large context window, and structured output. Two of
those three proved shakier than expected: `gemini-2.5-flash` was retired for new API keys
mid-project without notice, and the free tier's daily cap measured as low as 20/day on regular
Flash models during this project's own testing.

Everything about the Groq path was verified against the live API before committing. One constraint
came out of that: **only the gpt-oss models support the strict JSON schema this app's grounding
depends on.** llama-3.3-70b, llama-3.1-8b, qwen3.6, and compound all reject the request outright.
The binding limit is 8,000 tokens per minute, not the daily request count.

## Client-side parsing

**PDF, PPTX, DOCX, EPUB, and text are all parsed in the browser, in a Web Worker.**

The conventional approach — upload, parse server-side, store the result — would mean file storage,
upload bandwidth, server compute, and custody of student coursework. Parsing on-device removes all
four, and turns "your file never leaves your device" from a policy into an architectural property
that can be asserted in a test.

**Cost:** parsing quality is bounded by what runs in a browser, large files are limited by device
memory, and OCR is out of reach.

## BM25 retrieval, not embeddings

**Relevant passages are found with BM25 keyword ranking computed on-device, boosted by heading
structure.**

The standard answer is vector embeddings. Applied here it has a fatal cost problem: embedding a
500-page textbook means roughly a thousand embedding API calls for a single upload by a single
user. Against a shared daily quota measured in hundreds of requests, one user uploading one
textbook could consume the entire day's allowance for everyone.

BM25 costs nothing, runs offline, and is good enough because the corpus is one document rather than
the open web. `headingPath` on each chunk is what lets structural relevance substitute for semantic
similarity.

## Vite SPA, not Next.js

**A client-rendered single-page app.**

Next.js is the default choice for React, so the burden of proof was on choosing something else.
What settled it: there is no user-specific server-rendered content, because there is no server-side
data. There is nothing to render on a server. An SPA with a service worker is also the natural
shape for an offline-capable app.

## Vercel hosting

**Deployed on Vercel, with Upstash Redis for quota counters.**

Cloudflare Pages was chosen first, for unlimited free bandwidth, no pause-at-cap behaviour, and
included KV storage. The switch to Vercel was made for familiarity and workflow, on the reasoning
that this is a solo portfolio project rather than a multi-tenant service at scale.

**Cost:** Vercel's Hobby plan forbids commercial use and pauses the site at the bandwidth cap.
Both are acceptable for this project and would not be for a different one.

## Installable PWA, not native apps

**A responsive PWA with a service worker, installable to the home screen.**

A Google Play account costs a one-time fee and an Apple Developer account an annual one. Both break
the zero-cost constraint outright — the Apple fee particularly, because it recurs, meaning the
project goes dark the year nobody pays it. A PWA gives a home-screen icon, offline use, and a
full-screen feel for nothing.

## Two visual registers

**The app is calm; the marketing page is expressive.**

The design rules that make a good study interface — no gradients, no illustration, nothing
decorative — make a weak first impression for someone deciding whether to trust the product. And
this product has a genuine explaining problem: it is free with no paid tier, it does not upload
your files, and it refuses to answer from anything but your document. Those claims sound like
marketing until they are demonstrated.

So `/` gets a dark ground, a display serif, scroll-driven motion, and real rendered output, while
`/app/*` stays a well-set book. Both hold the same accessibility floor.

## Mandatory Google sign-in

**Every `/app` route requires sign-in.**

This directly reverses the original "no signup friction" principle, which held that an account wall
is the biggest reason a student closes the tab. The motivation is access control over who uses the
product, not abuse prevention — the per-IP quota is unchanged and independent.

**Cost:** the friction the original decision existed to avoid is now present, on every first visit.

**Popup, not redirect.** The redirect flow was chosen first, reasoning that it is more reliable on
mobile. It depends on Firebase's cross-site `*.firebaseapp.com` authDomain, which browsers now
block as third-party storage — and the failure turned out to be total rather than partial, in
Chrome rather than only Safari and Firefox. A popup opened from a real click is a user gesture, so
blockers leave it alone.

## Cloud sync, opt-in for study data

**Firebase Auth plus Firestore, one document per user, additive to local-first.**

Study data syncs only on an explicit "Sync now". Restoring merges rather than replacing, so it can
never destroy local work.

**Cost:** the CSP had to be widened measurably for every visitor, not just signed-in ones, to
accommodate Firebase's auth domains.

## Preferences sync live, in their own document

**`userSettings/{uid}` syncs continuously via `onSnapshot`, for every signed-in user, without a
button.**

Settings were originally excluded from sync entirely, justified by a comment claiming they held the
user's API key — a field that no longer existed after BYOK was removed. The exclusion outlived its
reason, so preferences and the study streak stayed on whichever device set them while the interface
promised "pick it up on another device".

A separate document rather than the backup blob, because that blob holds the whole corpus. Server
timestamps were rejected in favour of a client clock: `serverTimestamp()` resolves to a value the
client cannot compare against a stored number without a re-read, which complicates the merge for a
conflict requiring the same user to edit preferences on two devices within seconds.

**Cost:** every signed-in user now downloads the Firestore SDK, which the earlier chunk split
existed specifically to avoid. Mitigated by starting the listener on idle, not eliminated. Clock
skew can also misorder near-simultaneous edits; the blast radius is one preference value.
