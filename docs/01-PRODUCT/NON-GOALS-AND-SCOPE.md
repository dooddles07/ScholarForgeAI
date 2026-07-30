# Non-Goals and Scope

Purpose: what we are deliberately not building, and why. This document exists to be cited when saying no.
Last updated: 2026-07-30

Scope discipline is the main thing standing between this project and never shipping. Every item below was considered and rejected for v1 on purpose.

## In scope for v1

Upload of PDF, PPTX, DOCX, EPUB, TXT and Markdown. Quiz generation. Flashcard generation. Explanations at three depths. Exam generation with an answer key. FSRS spaced repetition. Ask-your-document chat with page citations. A weak-spot dashboard. Export to Anki/Quizlet CSV and printable PDF. Offline-capable installable PWA. Dark mode. Read-aloud. Focus timer. Portable study-pack files.

Specified in [FEATURES-SPECIFICATION.md](FEATURES-SPECIFICATION.md).

## Out of scope for v1

### Accounts and login

**Not building.** Email/password, OAuth, magic links, profiles.

**Why.** An account wall is the single biggest reason a student closes the tab. It also makes us the custodian of personal data, which is a real legal and ethical weight for a solo open-source project. Local-first storage delivers the whole product without any of it. See [ADR-0001](../08-DECISIONS/ADR-0001-LOCAL-FIRST-STORAGE.md).

**Revisit when.** Users are actively asking for cross-device sync and export-a-file is demonstrably not enough.

### Cross-device sync

**Not building.** Server-side storage, real-time sync between phone and laptop.

**Why.** Requires accounts, requires a database, and the free database tier we would use pauses itself after seven idle days. Study usage is bursty and seasonal, so that pause would hit exactly when someone comes back for the next exam. Export and import of a study-pack file covers the actual need at zero cost and zero risk.

**Revisit when.** v2, together with accounts. See [ROADMAP.md](../06-PLANNING/ROADMAP.md).

### Teacher and classroom mode

**Not building.** Class rosters, assigning work to students, collecting submissions, grade books, teacher dashboards.

**Why.** This is a second product with a second set of users, a second permission model, and a hard requirement for accounts and server storage. Sam the teacher is well served by the exam generator and print export without any of it. See [TARGET-USERS-AND-PERSONAS.md](TARGET-USERS-AND-PERSONAS.md).

### Native mobile apps in the stores

**Not building.** Play Store or App Store listings.

**Why.** A Google Play developer account is a one-time fee and an Apple Developer account is an annual one. Both break the zero-cost constraint outright. An installable PWA gives a home-screen icon, offline use, and a full-screen app feel for nothing. See [ADR-0007](../08-DECISIONS/ADR-0007-PWA-OVER-NATIVE.md).

**Revisit when.** Someone else wants to fund and maintain the store listings.

### Multiple languages

**Not building.** Translated interface, or forcing generated content into a chosen language.

**Why.** Explicit scope decision for v1: English only, both interface and generated output. Translation infrastructure plus ongoing translation upkeep is real work with no payoff until there is an audience asking for it.

**Note.** The architecture does not block this. Strings will be centralised rather than scattered through components, so adding i18n later is a contained change rather than a rewrite.

### Scanned documents and OCR

**Not building.** Optical character recognition for image-only PDFs and photographs of pages.

**Why.** Client-side OCR means shipping a large extra library, and it is slow and unreliable on the mid-range phones we are targeting. A scanned PDF will be detected and refused with a clear, helpful message rather than half-processed into garbage.

**Revisit when.** The "this looks like a scan" message becomes a common complaint. Then evaluate `tesseract.js` behind a lazy load.

### Audio and video input

**Not building.** Lecture recording transcription, YouTube ingestion.

**Why.** Free transcription at any real volume does not exist, and the browser-local alternatives are too heavy. Out of scope entirely.

### Semantic search with embeddings

**Not building.** Vector embeddings and a vector database.

**Why.** Embedding a whole textbook means thousands of API calls, which burns the shared free quota fast. Client-side BM25 keyword retrieval is instant, costs nothing, and is good enough given that most documents fit in the model's context window whole. See [ADR-0006](../08-DECISIONS/ADR-0006-BM25-RETRIEVAL-NOT-EMBEDDINGS.md).

### Collaboration and social features

**Not building.** Shared decks with live editing, comments, leaderboards, following other users, a public deck marketplace.

**Why.** All of it needs accounts, a server, and moderation. Moderation in particular is an unbounded commitment for a solo maintainer. Sharing a study pack as a file the user sends however they like covers the real need.

### Answering homework directly

**Not building.** Paste-a-question, get-an-answer.

**Why.** Against the point of the product. ScholarForge AI exists to make students practise retrieval, not to do the work for them. It also invites the tool to be used for academic dishonesty, which we are not interested in supporting.

### Analytics and user tracking

**Not building.** Third-party analytics, session recording, individual usage tracking, A/B testing infrastructure.

**Why.** It conflicts with the privacy promise, needs a cookie consent flow, and adds weight to the bundle. Progress metrics stay on the user's device and are shown only to that user. See [SUCCESS-METRICS.md](SUCCESS-METRICS.md) for how we evaluate the project without tracking anyone.

### Payments

**Not building.** Subscriptions, tips, donations, sponsorship tiers inside the app.

**Why.** Zero cost is a defining property, not a launch promotion. Payment processing would also introduce the first genuinely unavoidable cost in the stack.

### Enterprise and institutional features

**Not building.** SSO, SCIM, admin consoles, audit logs, LMS integration, SLAs, compliance certification.

**Why.** Wrong audience entirely. Institutions that want this can fork the project.

## Scope guard

Before any feature is accepted, it must clear all five:

1. Does it serve Maya, the primary persona?
2. Can it run at $0 with a named free tier and a stated behaviour at the cap?
3. Does it work on a mid-range phone?
4. Does it work without an account?
5. Can it be built without a new server-side dependency?

A "no" on any of these means the feature is a v2 discussion, and it gets recorded in [OPEN-QUESTIONS.md](../06-PLANNING/OPEN-QUESTIONS.md) rather than silently dropped.
