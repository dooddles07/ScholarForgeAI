# Roadmap

Purpose: what ships when, and what is deliberately later.
Last updated: 2026-07-30

No dates. This is a personal project built around other commitments, and invented deadlines would only be wrong. Phases are ordered by dependency and by value.

## v0.1 — Prove the core works

**Goal:** upload a real PDF, get a real quiz, on a phone.

| In | Not in |
|---|---|
| PDF parsing | Other formats |
| Quiz generation, multiple choice only | Other question types |
| Take a quiz, see a score | Saved history |
| The AI proxy with quota limits | Bring-your-own-key |
| Local storage of documents and quizzes | Export |
| Responsive layout | PWA install, offline |
| Deployed to Vercel | — |

**Done when:** a genuine 100-page university PDF produces ten sound, correctly-cited questions, taken on a real phone.

This phase exists to find out early whether the whole premise works. If generated questions from real documents are poor, everything after this needs rethinking — and that is much better to learn now than after building nine more features on top.

## v0.2 — The study loop

**Goal:** the product becomes something you return to, not something you try once.

- Flashcard generation and review
- FSRS spaced repetition, due counts, streaks
- All four question types
- Quiz results with per-topic breakdown
- Retry-missed and convert-missed-to-cards

That last pair is the hinge. Fail something, understand it, turn it into a card, meet it again later. Without it the product is a one-off toy; with it, it is a study tool.

## v0.3 — All the formats

**Goal:** works with whatever the student actually has.

- PPTX, including speaker notes
- DOCX with heading-based outlines
- EPUB with chapter structure
- TXT and Markdown
- Scan detection with a helpful refusal
- Every failure case with proper copy
- Multi-document study sets

Lecturers put the real explanation in speaker notes and the bullets on the slide, so PPTX notes support matters more than it sounds.

## v0.4 — Understanding

**Goal:** help when the student does not understand, not just test them.

- Explanations at three depths
- Ask-your-document chat with page citations
- BM25 retrieval for long documents
- Query expansion for tier-2 retrieval
- Source-passage viewer, reachable from every citation

## v0.5 — Exams and export

**Goal:** serve the teacher persona, and let people leave with their data.

- Exam generator with full configuration
- Answer key with rationales
- Print stylesheet
- Anki and Quizlet CSV export
- Study pack export and import
- Full archive backup

Export is not a nice-to-have. It is the only protection users have against losing local data, so it is a requirement of the local-first decision rather than a feature. See [ADR-0001](../08-DECISIONS/ADR-0001-LOCAL-FIRST-STORAGE.md).

## v0.6 — Offline and installable

**Goal:** feels like an app you own.

- Service worker and app-shell caching
- Full offline capability for everything except generation
- Install prompt, timed after a first completed quiz
- iOS install instructions, since iOS gives no prompt
- Offline indicator naming what still works
- Persistent-storage request
- Storage-pressure warnings

## v0.7 — Progress and polish

**Goal:** studying feels like it is going somewhere.

- Weak-spot dashboard
- Accuracy trend
- Drill-my-weak-spots
- Dark mode
- Read-aloud
- Reading mode for dyslexic readers
- Focus timer
- Keyboard shortcuts

## v1.0 — Release

**Goal:** good enough to tell people about.

- Bring-your-own-key flow, with the guide
- Every accessibility requirement met, verified manually
- Real-device testing on Android and iOS complete
- 100 generated questions manually reviewed at 90% or better
- Full documentation set current
- Self-hosting guide verified by someone other than the author
- Every error state with reviewed copy

**Done when** the criteria in [SUCCESS-METRICS.md](../01-PRODUCT/SUCCESS-METRICS.md) are met.

Note what is in this phase: no new features, only verification. A v1.0 that ships an unverified accessibility claim or an untested self-hosting guide is not a v1.0.

## v1.x — Response to actual use

Deliberately unplanned. This is where real bug reports go, and they will be better information than anything guessed now.

Likely candidates, from [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md):

- Parsing fixes for real-world documents that break
- Prompt improvements from reported bad questions
- A high-contrast theme
- Share-target registration, so a PDF can be shared into the app
- Stemming in BM25, if retrieval complaints appear
- A fallback AI provider, if the shared quota proves too small

## v2.0 — Only if asked for

Everything here is deferred until users actually request it. Building any of it speculatively would be a mistake.

| Candidate | Precondition |
|---|---|
| Optional accounts and cloud sync | Users say export/import is not enough. Needs a superseding ADR covering conflict resolution and the free-tier inactivity pause. |
| Teacher and classroom mode | Sustained teacher demand. A second product, effectively. |
| Multiple languages | An audience asking. Strings are already centralised, so this is contained. |
| OCR for scanned documents | "This looks like a scan" becomes a common complaint |
| App store listings | Somebody funds and maintains the paid developer accounts |

## Never

From [NON-GOALS-AND-SCOPE.md](../01-PRODUCT/NON-GOALS-AND-SCOPE.md):

- Homework-answering
- Analytics or user tracking
- Payments, subscriptions, or a paid tier
- Social features requiring moderation
- Enterprise features: SSO, admin consoles, LMS integration

## Ordering rationale

Two decisions in the sequence are worth explaining.

**Why quizzes before flashcards.** Quizzes prove the generation quality question fastest, and generation quality is the project's biggest single risk. Flashcards without spaced repetition are less compelling than a quiz, so they are better paired with v0.2's scheduler.

**Why offline late.** It is genuinely valuable, but nothing depends on it, and it is easier to add once the feature surface has stopped moving. Caching a shell that is still changing weekly is wasted work.

**Why bring-your-own-key at v1.0 rather than earlier.** Before launch, the shared quota comfortably covers development and a handful of testers. The escape hatch matters the moment real users arrive, which is exactly v1.0.

## Cutting

If time runs short, this is the order things go, worst-to-best case:

1. Focus timer
2. Read-aloud
3. Reading mode
4. Weak-spot dashboard
5. Ask-your-document chat

Never cut: grounding validation, accessibility, mobile support, or the honest quota messaging. Those are not features, they are the product being what it claims to be.
