# ScholarForge AI — Design Specification

Purpose: the consolidated design that came out of the planning session. One document, the whole picture.
Date: 2026-07-30
Status: Approved

This is the summary. Every section links to the document that covers it properly.

---

## The problem

A student has a 200-page PDF and an exam on Thursday. Re-reading will not help. What helps is being tested, finding out what they do not know, and drilling it.

Retrieval practice and spaced repetition are among the best-evidenced learning techniques available. Students mostly know this. The problem is that doing it by hand takes longer than the studying, and the tools that automate it charge money — a real barrier for a student, especially outside high-income countries.

## The product

Upload a PDF, slide deck, or book. Get quizzes, flashcards, plain-language explanations, and a full practice exam with an answer key. It tracks what you keep getting wrong and brings it back until you stop getting it wrong.

Free forever. Google sign-in required ([ADR-0011](../08-DECISIONS/ADR-0011-MANDATORY-GOOGLE-SIGN-IN.md)). Works on a phone. Open source.

## Hard constraints

These are definitional, not preferences.

1. **$0 for everything** — tools, hosting, database, AI, deployment. Permanently free tiers, not trial credits.
2. **Open source**, and forkable without a licensing trap.
3. **Responsive**, phone-first.
4. **Kind wording**, especially in error messages.

---

## Decisions

| Decision | Choice | Recorded in |
|---|---|---|
| AI provider | Groq `openai/gpt-oss-120b`, free tier, one shared key | [ADR-0013](../08-DECISIONS/ADR-0013-GROQ-OVER-GEMINI.md) (originally Gemini, [ADR-0002](../08-DECISIONS/ADR-0002-SHARED-KEY-BEHIND-PROXY.md)) |
| Key protection | Held server-side in a Vercel Node Function, never in the browser | [ADR-0002](../08-DECISIONS/ADR-0002-SHARED-KEY-BEHIND-PROXY.md) |
| Storage | Local-first, IndexedDB, unchanged | [ADR-0001](../08-DECISIONS/ADR-0001-LOCAL-FIRST-STORAGE.md) (originally "no accounts in v1," since superseded by [ADR-0011](../08-DECISIONS/ADR-0011-MANDATORY-GOOGLE-SIGN-IN.md)'s mandatory sign-in) |
| Hosting | Vercel | [ADR-0009](../08-DECISIONS/ADR-0009-VERCEL-OVER-CLOUDFLARE-PAGES.md) (originally Cloudflare Pages, [ADR-0003](../08-DECISIONS/ADR-0003-CLOUDFLARE-PAGES-OVER-VERCEL.md)) |
| Framework | Vite + React SPA | [ADR-0004](../08-DECISIONS/ADR-0004-VITE-SPA-OVER-NEXTJS.md) |
| Parsing | Entirely in the browser | [ADR-0005](../08-DECISIONS/ADR-0005-CLIENT-SIDE-PARSING.md) |
| Retrieval | Client-side BM25, no embeddings | [ADR-0006](../08-DECISIONS/ADR-0006-BM25-RETRIEVAL-NOT-EMBEDDINGS.md) |
| Mobile | Installable PWA | [ADR-0007](../08-DECISIONS/ADR-0007-PWA-OVER-NATIVE.md) |
| Language | English only, v1 | [NON-GOALS-AND-SCOPE.md](../01-PRODUCT/NON-GOALS-AND-SCOPE.md) |
| Primary user | Student studying alone, near an exam | [TARGET-USERS-AND-PERSONAS.md](../01-PRODUCT/TARGET-USERS-AND-PERSONAS.md) |

### The two that mattered most

**One shared key, but behind a proxy.** The zero-setup requirement demanded a shared key. But a key shipped to a browser is a published secret — it gets scraped and drained within days, and the consequence lands on the owner's account. So the key lives in a Vercel Node Function, guarded by per-IP and global quotas. Bring-your-own-key was originally the escape hatch when the shared pool ran dry; it was later removed (ADR-0014).

**Superseded.** That escape hatch was removed in ADR-0014, so the "scales to any number of users at $0" claim no longer holds: the shared quota is now a hard ceiling.

**Local-first, not Supabase.** Supabase's free tier looks generous, but it pauses a project after seven days without a database request. Study traffic is seasonal — heavy for an exam week, silent for a month — so that pause would trigger exactly when a student returns. Storing everything in the browser sidesteps it entirely, removes the signup wall, and makes the privacy claim literally true.

---

## Architecture

```
Browser (does almost everything)
├── React SPA — Vite, TypeScript, Tailwind, shadcn/ui
├── Parsers  — pdfjs-dist, jszip, mammoth. Lazy-loaded, in a Web Worker.
├── Storage  — IndexedDB via Dexie
├── Search   — BM25, computed locally, no embedding API
├── Review   — ts-fsrs spaced repetition
└── PWA      — service worker, offline, installable
        │
        │  only extracted text crosses this line — never files
        ▼
Vercel Node Function  /api/generate
├── holds GROQ_API_KEY as an environment variable
├── origin check, kill switch, per-IP and global quotas
├── assembles prompts + strict JSON response schemas
└── validates grounding; drops uncited items before returning
        ▼
Groq gpt-oss-120b (free tier)
```

**Four browser layers**, with dependencies pointing one way: UI depends on domain, domain depends on nothing. Parsing, persistence, and the AI client each own one external concern. Enforced by lint rules, not just documentation.

The server is one function of roughly two hundred lines whose only job is keeping a secret and enforcing a quota.

Detail in [ARCHITECTURE.md](../03-ARCHITECTURE/ARCHITECTURE.md).

---

## Features

**Must have**

Upload (PDF, PPTX, DOCX, EPUB, TXT, MD) · quizzes in four question types · flashcards including cloze · explanations at three depths · exam generator with answer key.

**Also in v1**

FSRS spaced repetition · ask-your-document chat with page citations · weak-spot dashboard · Anki and Quizlet CSV export · printable exams.

**Free extras**

Offline · installable · dark mode · read-aloud · focus timer · keyboard shortcuts · portable study-pack files.

**Not building:** accounts, cloud sync, teacher mode, native apps, i18n, OCR, embeddings, social features, homework answering, analytics, payments.

Detail in [FEATURES-SPECIFICATION.md](../01-PRODUCT/FEATURES-SPECIFICATION.md) and [NON-GOALS-AND-SCOPE.md](../01-PRODUCT/NON-GOALS-AND-SCOPE.md).

---

## The rule that defines the product

**Nothing generated is shown without a citation to the source document.**

Enforced in three places: the prompt states it as an absolute, the response schema makes citation fields required, and server-side validation checks that every cited page exists and every quoted string actually appears in the source. Items failing any check are dropped before they reach the client.

A study tool that invents facts is worse than no tool, because the student memorises the wrong thing and finds out during the exam.

Returning eight good questions instead of ten is acceptable, and the interface says why. Returning one invented question is not.

---

## How every cost was removed

| Would normally cost | Approach |
|---|---|
| File storage and upload bandwidth | Parsed in the browser; files never transit the network |
| Database | IndexedDB on the device |
| Authentication | Firebase Auth's free tier, not a custom-built one |
| Embedding API and vector store | BM25 keyword retrieval, locally |
| PDF generation | Browser print-to-PDF |
| Text-to-speech | Web Speech API |
| Analytics | None |
| Webfonts | System font stack |

The pattern is consistent: move work to the device, where compute is already paid for.

The two biggest savings — client-side parsing and no embeddings — would each, done conventionally, have made the project cost money at very modest usage.

Full accounting with named limits in [ZERO-COST-INFRASTRUCTURE.md](../04-OPERATIONS/ZERO-COST-INFRASTRUCTURE.md).

---

## What happens when the free quota runs out

A designed state, not a failure.

The app says what happened, states the reset time in the user's local time, and confirms everything already made still works offline. No alternative is offered — bring-your-own-key was removed ([ADR-0014](../08-DECISIONS/ADR-0014-REMOVE-BRING-YOUR-OWN-KEY.md)).

It never says "upgrade". It never mentions payment. The word "premium" does not exist in this product.

There is a Playwright assertion enforcing that no payment language appears anywhere, because a commitment without a test decays.

---

## Design position

Calm, legible, unfussy. The user is tired and under deadline pressure; the interface should reduce load rather than compete for it.

Generous whitespace, one accent colour used sparingly, system fonts, no decorative illustration, no animation that does not communicate something. The reference point is a well-set book rather than a dashboard.

**Words are part of the product.** All user-facing strings live in one place and are reviewed like code. Every error says what happened and what to do next, never blames the user, and never shows internals.

> This PDF is a scan, so there is no text in it for us to read, only pictures of text.
> Try a version where you can select the text with your cursor.

Full string inventory in [CONTENT-AND-COPY-GUIDE.md](../02-DESIGN/CONTENT-AND-COPY-GUIDE.md).

**Accessibility is WCAG 2.2 AA, treated as correctness rather than polish.** An inaccessible study tool excludes people from studying. Detail in [ACCESSIBILITY.md](../02-DESIGN/ACCESSIBILITY.md).

---

## Build sequence

| Milestone | Delivers |
|---|---|
| M0 | Skeleton, CI, deployed |
| M1 | PDF parsing |
| M2 | Local storage |
| M3 | Upload interface |
| M4 | The proxy, key protected |
| M5 | **v0.1** — quizzes work |
| M6 | **v0.2** — flashcards and spaced repetition |
| M7 | **v0.3** — all formats |
| M8 | **v0.4** — explanations and chat |
| M9 | **v0.5** — exams and export |
| M10 | **v0.6** — offline and installable |
| M11 | **v0.7** — dashboard and polish |
| M12 | **v1.0** — verification only, no new features |

M5 exists to answer the project's biggest risk early: are the generated questions actually good? If not, that is much better learned before seven more milestones are built on the assumption.

Task-level detail in [BUILD-ORDER.md](../06-PLANNING/BUILD-ORDER.md), exit criteria in [MILESTONE-PLAN.md](../06-PLANNING/MILESTONE-PLAN.md).

---

## Main risks

| Risk | Response |
|---|---|
| Generated questions are bad | Three-layer grounding enforcement; M5 tests the premise early; 100 questions manually reviewed before v1.0 |
| The shared key leaks | Never in the bundle, structurally; pre-commit and CI scanning; one-command kill switch |
| A user loses local data | Export as a first-class feature, prompted after significant work; persistent-storage request |
| A bad migration | Additive only, tested with realistic data, idempotent |
| Quota too small | Raise the ceiling toward the provider limit; no bring-your-own-key fallback remains (ADR-0014) |
| A free tier disappears | Provider behind one module; losing it degrades rather than kills the product |
| Scope creep | An explicit non-goals document, a five-question scope guard, and a v1.0 with no new features |

Full analysis in [RISKS-AND-MITIGATIONS.md](../06-PLANNING/RISKS-AND-MITIGATIONS.md).

---

## The five questions

Any change must answer yes to all five.

1. Does it cost nothing, with a named limit and a stated degradation?
2. Does it work on a cheap phone?
3. Does it avoid asking for anything beyond the required Google sign-in? (Superseded from "works without an account" by [ADR-0011](../08-DECISIONS/ADR-0011-MANDATORY-GOOGLE-SIGN-IN.md), which reversed the original no-accounts scope.)
4. Is generated content grounded in a real source?
5. Would a stressed student understand the words?

---

## Where the numbers are deliberately absent

Provider free-tier limits change without notice. Groq measured 1,000 requests/day and 8,000 tokens/minute at the time of the swap.

So no figure is hardcoded anywhere. The global ceiling is a configuration value, set from Google's official rate-limit page before launch, deliberately below the real limit, and reviewed quarterly.

This is the one number in the project that must not be guessed, and writing it into a document would guarantee it becomes wrong.

---

## Status

Planning complete. No application code written.

**Next:** M0 in [BUILD-ORDER.md](../06-PLANNING/BUILD-ORDER.md).
