# Architecture

Purpose: how the system is put together, where the boundaries are, and how data moves.
Last updated: 2026-07-30

## The shape of it in one idea

**The browser is the application. The server is a keyhole.**

Almost everything happens on the user's device: parsing, storage, search, scheduling, scoring, export. Exactly one thing needs a server, and only because a secret has to live somewhere the user cannot read it — the AI API key.

That inversion is what makes the whole thing free. No storage bill, no compute bill, no database, no bandwidth for file uploads.

## System diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  BROWSER                                                        │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  UI LAYER — React components, routes, Tailwind            │  │
│  │  Knows nothing about pdfjs, Dexie, or fetch.              │  │
│  └────────────────────────┬──────────────────────────────────┘  │
│                           │ hooks only                          │
│  ┌────────────────────────▼──────────────────────────────────┐  │
│  │  DOMAIN LAYER — the actual rules, all pure functions      │  │
│  │  scoring · scheduling · chunking · BM25 · validation      │  │
│  │  No I/O. No React. Fully unit-testable.                   │  │
│  └────────┬───────────────┬──────────────┬───────────────────┘  │
│           │               │              │                      │
│  ┌────────▼──────┐ ┌──────▼──────┐ ┌─────▼──────────────────┐  │
│  │ PARSING       │ │ PERSISTENCE │ │ AI CLIENT              │  │
│  │ Web Worker    │ │ Dexie /     │ │ the only thing that    │  │
│  │ pdfjs, jszip, │ │ IndexedDB   │ │ talks to the network   │  │
│  │ mammoth       │ │             │ │                        │  │
│  └───────────────┘ └─────────────┘ └─────────┬──────────────┘  │
│                                               │                 │
│  ┌────────────────────────────────────────────┼──────────────┐  │
│  │  SERVICE WORKER — app shell cache, offline │              │  │
│  └────────────────────────────────────────────┼──────────────┘  │
└───────────────────────────────────────────────┼─────────────────┘
                                                │
                    only extracted text crosses this line
                    files never do
                                                │
┌───────────────────────────────────────────────▼─────────────────┐
│  CLOUDFLARE PAGES FUNCTION   /api/generate                      │
│                                                                 │
│  1. origin check                                                │
│  2. per-IP daily quota      ─┐                                  │
│  3. global daily ceiling     ├── Workers KV counters            │
│  4. kill-switch check       ─┘                                  │
│  5. assemble prompt + JSON response schema                      │
│  6. call provider, validate response, strip anything ungrounded │
│                                                                 │
│  Holds GEMINI_API_KEY as an env secret. Never returns it.       │
│  Logs counters only. Never logs prompts or document text.       │
└───────────────────────────────────────────────┬─────────────────┘
                                                │
                              ┌─────────────────▼─────────────────┐
                              │  Google Gemini 2.5 Flash (free)   │
                              └───────────────────────────────────┘
```

## The four browser layers

Layered so that dependencies point one way only: UI depends on domain, domain depends on nothing.

### 1. UI layer

React components, routes, styling. Renders state and raises intent.

**May** import from the domain layer, and call hooks that wrap the infrastructure layers.
**May not** import `pdfjs`, `Dexie`, or call `fetch` directly. If a component imports a parser, the boundary has been broken.

### 2. Domain layer

The rules of the product, written as pure functions.

- Quiz scoring and answer matching
- FSRS scheduling calculations
- Text chunking
- BM25 ranking
- Response validation and grounding checks
- Export formatting

**No I/O, no React, no browser APIs.** Every function takes data and returns data. This is where the interesting logic lives and where the test suite is densest, because pure functions are cheap to test exhaustively.

The practical test: this layer should run unchanged in Node with no DOM.

### 3. Infrastructure layers

Three separate modules, each the sole owner of one external concern.

**Parsing** — runs in a Web Worker. Owns every document library. Takes a `File`, returns a `ParsedDocument`. The only module that imports `pdfjs-dist`, `mammoth`, or `jszip`. In a worker because parsing a large PDF on the main thread freezes the interface.

**Persistence** — owns Dexie and the IndexedDB schema. Every read and write goes through it. The rest of the app never sees a database query.

**AI client** — the only module that makes network requests. Owns request construction, retry policy, cancellation, and error translation from wire errors into domain errors.

### 4. Service worker

Caches the application shell so the app opens offline, and mediates the offline state the interface reports.

## Why these boundaries

Each module can be understood without reading its neighbours, which is the property that makes the codebase survivable for a solo maintainer and approachable for a contributor.

Concretely:

- Swapping AI provider touches one module
- Adding a document format touches one module
- Changing the database schema touches one module
- Testing scoring logic requires no browser, no database, and no network

## Data flow — upload

```
User picks a file
  ▼
UI validates size and extension          ← fails fast, before any work
  ▼
File handed to the parsing worker
  ▼
Worker lazy-imports the right parser     ← .txt never downloads pdfjs
  ▼
Extract raw text with page numbers
  ▼
Detect a scan (text density heuristic)   → refuse, with a clear message
  ▼
Clean: strip headers, footers, page numbers, fix hyphenation
  ▼
Chunk on structure, never mid-sentence
  ▼
Detect topic outline from headings
  ▼
Build the BM25 index
  ▼
Persistence stores ParsedDocument
  ▼
UI shows the document, ready
```

No network request occurs anywhere in this flow. That is a testable claim, and [TESTING-STRATEGY.md](../05-ENGINEERING/TESTING-STRATEGY.md) asserts it.

## Data flow — generating a quiz

```
User configures and starts
  ▼
Domain layer decides retrieval tier
  ├── fits context window ──► send whole document text
  └── too long ─────────────► BM25 selects chunks, plus outline signals
  ▼
AI client POSTs to /api/generate
  { task: "quiz", text, options }        ← no key, no file
  ▼
─────────────────── network ───────────────────
  ▼
Function: origin check → quota check → kill switch
  ▼
Assemble prompt + strict JSON response schema
  ▼
Call Gemini with structured output
  ▼
Validate: is it schema-valid? does every question cite a page?
  │  Questions without a citation are dropped here, server-side.
  ▼
Return validated questions
  ▼
─────────────────── network ───────────────────
  ▼
Domain layer randomises correct-answer positions
  ▼
Persistence stores the quiz
  ▼
UI shows question one
```

Two things worth noting. Validation happens on the server, so an ungrounded question never reaches the client. And answer-position randomisation happens client-side, because models have positional biases that survive good prompting.

## What crosses the network, and what does not

**Crosses:** extracted document text relevant to the current request, generation options, an optional user-supplied API key on that user's own requests.

**Never crosses:** the original file, stored decks, quiz results, review schedules, progress history, or any identifier for the user.

This is the privacy promise, stated as an architectural property rather than a policy. See [SECURITY-AND-PRIVACY.md](../04-OPERATIONS/SECURITY-AND-PRIVACY.md).

## The server side, in full

One function. Roughly two hundred lines. Its entire job:

1. Keep the API key out of the browser
2. Stop one user draining the shared quota
3. Stop the project exceeding the provider's free tier
4. Assemble prompts, so they can be improved without a client release
5. Validate responses, so ungrounded content is dropped before it is sent

It has no database, holds no state beyond counters, and stores nothing about anyone.

Because Pages Functions run on the Workers runtime rather than Node, it must use Web-standard APIs only: `fetch`, `Request`, `Response`, Web Crypto. No Node built-ins.

## Failure modes and what happens

| Failure | Behaviour |
|---|---|
| Offline | App loads from cache. Stored content fully usable. AI actions disabled with a stated reason. |
| Shared quota spent | Plain message, reset time in local time, bring-your-own-key offered. Nothing stored becomes unavailable. |
| Provider down or erroring | Retry with backoff, then a clear failure. Partial results kept. |
| Malformed model response | Server-side schema validation rejects it and retries once, then fails cleanly. |
| Parse failure | Named cause and a suggested next step. Other documents unaffected. |
| Storage full | Warning at 80%, offer to delete old documents, export prompted. |
| Storage evicted by the browser | Unrecoverable. Mitigated by prompting export after significant work. |
| Private browsing | Detected, warned: data will not persist. |

## Performance strategy

| Concern | Approach |
|---|---|
| Interface freezing while parsing | Web Worker, always |
| Initial bundle size | Route-level code splitting; parsers lazy-imported per format |
| Large document memory | Stream where the format allows; hard size ceiling; page-range option |
| Slow connection | Small shell, cached aggressively, works offline after first load |
| Search speed | BM25 index built once at upload, held in memory during a session |
| Re-render cost | Domain layer is pure, so results memoise cleanly |

Targets in [PRODUCT-REQUIREMENTS.md](../01-PRODUCT/PRODUCT-REQUIREMENTS.md).

## Testability by design

The layering exists partly to make testing cheap:

- **Domain layer** — pure unit tests, no mocks, exhaustive
- **Parsing** — real fixture documents in, expected text out
- **Persistence** — fake IndexedDB, schema and migration tests
- **AI client** — mocked network, focused on retry, cancel, and error translation
- **Function** — tested against mocked provider responses, including malformed ones
- **UI** — Playwright end-to-end on the flows in [USER-FLOWS.md](../01-PRODUCT/USER-FLOWS.md)

A **mock AI mode** lets the whole app run with no API key, returning fixture responses. This is what allows a contributor to work on the interface without credentials, and what makes end-to-end tests deterministic and free.

## Related documents

[TECH-STACK.md](TECH-STACK.md) · [PROJECT-STRUCTURE.md](PROJECT-STRUCTURE.md) · [DATA-MODEL.md](DATA-MODEL.md) · [DOCUMENT-PROCESSING.md](DOCUMENT-PROCESSING.md) · [AI-INTEGRATION.md](AI-INTEGRATION.md) · [API-CONTRACTS.md](API-CONTRACTS.md) · [OFFLINE-AND-PWA.md](OFFLINE-AND-PWA.md)
