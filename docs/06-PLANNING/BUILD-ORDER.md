# Build Order

Purpose: the concrete task sequence. Hand this to a developer with no other context and they should be able to start.
Last updated: 2026-07-30

Tasks are ordered so that each one can be verified when it is finished. Nothing depends on something built later.

---

## Milestone 0 — Skeleton

**Exit criteria:** an empty page deployed to Cloudflare with CI green.

1. `npm create vite@latest` with the React + TypeScript template
2. Configure TypeScript strict mode, including `noUncheckedIndexedAccess`, per [CODING-STANDARDS.md](../05-ENGINEERING/CODING-STANDARDS.md)
3. Install and configure Tailwind; create `src/styles/tokens.css` with the tokens from [DESIGN-SYSTEM.md](../02-DESIGN/DESIGN-SYSTEM.md)
4. Map tokens into the Tailwind theme so utilities read semantically
5. Create the folder structure from [PROJECT-STRUCTURE.md](../03-ARCHITECTURE/PROJECT-STRUCTURE.md)
6. Configure ESLint, including `no-restricted-imports` for the layer boundaries
7. Configure Prettier and a pre-commit hook that formats, lints, and scans for key-shaped strings
8. Add React Router with placeholder routes
9. Add `public/_headers` and `public/_redirects`, per [DEPLOYMENT.md](../04-OPERATIONS/DEPLOYMENT.md)
10. Write `.github/workflows/ci.yml` with typecheck, lint, test, build, bundle size, and secret scan
11. Create the Cloudflare Pages project and deploy

**Do step 6 now, not later.** The layer boundaries are the most important structural rule in the codebase, and retrofitting the lint rule after the fact means fixing dozens of violations.

---

## Milestone 1 — Parse a PDF

**Exit criteria:** upload a real PDF, see extracted text and a topic outline, with no network request.

1. Create the parsing Web Worker and its `parseFile` public API
2. Implement `formats/pdf.ts` with `pdfjs-dist`, lazy-imported
3. Extract text with page numbers
4. Handle multi-column reading order by clustering on x-coordinate
5. Rejoin hyphenated line breaks
6. Normalise ligatures and smart quotes
7. Implement scan detection by text density
8. Implement cleaning: running headers, footers, page numbers
9. Build the outline, preferring PDF bookmarks over heuristics
10. Implement chunking per [DOCUMENT-PROCESSING.md](../03-ARCHITECTURE/DOCUMENT-PROCESSING.md)
11. Implement token estimation
12. Add fixtures: clean PDF, two-column, scanned, password-protected, corrupt, ligature-heavy
13. Write parsing tests against the fixtures, including the assertion that no network request occurs

Verify by parsing a genuine 100-page university PDF and reading the extracted text end to end. Automated tests will not tell you whether the text is actually usable.

---

## Milestone 2 — Store it

**Exit criteria:** documents survive a page reload.

1. Set up Dexie with the version 1 schema from [DATA-MODEL.md](../03-ARCHITECTURE/DATA-MODEL.md)
2. Implement `persistence/documents.ts`
3. Implement `persistence/settings.ts` with the singleton row
4. Implement `persistence/quota-check.ts` for storage pressure
5. Add `use-document` and `use-documents` hooks
6. Write persistence tests with `fake-indexeddb`

Get the schema right now. Changing it later means writing a migration and testing it against realistic data, which is much more work than thinking carefully at this point.

---

## Milestone 3 — Upload interface

**Exit criteria:** a working landing page and document page on a phone.

1. Create `src/copy/` and move every string into it as you go
2. Build the landing page per [UI-UX-DESIGN.md](../02-DESIGN/UI-UX-DESIGN.md), drop zone dominant
3. Implement drag-and-drop plus tap-to-browse
4. Implement pre-flight validation: size, extension, emptiness
5. Build the parsing progress screen with named stages and real page numbers
6. Build the document page with the four actions and the topic outline
7. Implement every upload failure state with copy from [CONTENT-AND-COPY-GUIDE.md](../02-DESIGN/CONTENT-AND-COPY-GUIDE.md)
8. Build the library page with its empty state
9. Verify at 320, 360, and 1280
10. Verify keyboard operation and run `axe-core`

---

## Milestone 4 — The proxy

**Exit criteria:** a quiz generates end to end, and the key is not in the bundle.

1. Write `functions/api/generate.ts`, Web-standard APIs only
2. Implement the origin check
3. Create the KV namespace; implement `_lib/quota.ts` with per-IP and global counters and the kill switch
4. Implement `_lib/prompts.ts` with the shared system instruction and the quiz prompt from [PROMPT-LIBRARY.md](../03-ARCHITECTURE/PROMPT-LIBRARY.md)
5. Implement `_lib/schemas.ts` with the quiz response schema
6. Call Gemini with structured output
7. Implement `_lib/validate.ts`: schema conformance, then grounding checks
8. Drop ungrounded items; retry once if over half fail
9. Implement the error envelope and every code from [API-CONTRACTS.md](../03-ARCHITECTURE/API-CONTRACTS.md)
10. Write `src/ai/client.ts` with retries, cancellation, and error translation
11. Create `src/ai/mock/` fixtures, including failure cases
12. Add the mock-mode flag, defaulting to on for development
13. Write function tests with a mocked provider
14. **Assert the key never appears in any response, header, or error**
15. **Search the built bundle for key-shaped strings**

Steps 14 and 15 are the point of this milestone. Everything else is plumbing; those two are why the proxy exists at all. See [ADR-0002](../08-DECISIONS/ADR-0002-SHARED-KEY-BEHIND-PROXY.md).

---

## Milestone 5 — Quizzes

**Exit criteria:** v0.1 complete. Take a quiz on a real document, on a phone.

1. Build the quiz configuration screen, pre-filled and skippable
2. Implement `domain/quiz/shuffle.ts` and shuffle options after generation
3. Build the question card: one per screen, action bottom-anchored
4. Implement answer checking and `domain/quiz/scoring.ts`
5. Build the feedback state: correctness with icon and label, answer, explanation, citation
6. Build the source-passage viewer
7. Implement the flag-a-bad-question control, excluding it from scoring
8. Implement pause and resume via the incomplete-attempt record
9. Build the results screen with per-topic breakdown
10. Implement retry-missed
11. Write domain tests: all correct, none correct, all flagged, empty
12. Write the first Playwright spec: land, upload, quiz, answer, see a citation

Verify by taking a full quiz one-handed on a real phone. That is the actual product experience and it reveals things no test will.

---

## Milestone 6 — Flashcards and review

**Exit criteria:** v0.2. Cards come back on schedule.

1. Add the flashcards prompt and schema
2. Implement deck and card persistence
3. Build card generation, including cloze
4. Build the flashcard component; rating buttons appear only after the flip
5. Implement swipe gestures with button equivalents
6. Integrate `ts-fsrs` in `domain/scheduling/fsrs-adapter.ts`
7. Implement `due-selection.ts` with the daily limit
8. Build the review session
9. Show the resulting interval on each rating button
10. Implement the review log
11. Implement leech detection
12. Implement the streak with one forgiven day
13. Implement convert-missed-to-cards
14. Add card editing, creation, and deletion
15. Add read-aloud via the Web Speech API
16. Write scheduling tests, including time-zone boundaries

The streak grace day and the interval hints on rating buttons both look like small touches. They are not — the first prevents a single slip destroying momentum, and the second makes the scheduler legible enough that people rate honestly.

---

## Milestone 7 — Remaining formats

**Exit criteria:** v0.3.

1. `formats/pptx.ts` with `jszip`, including speaker notes
2. `formats/docx.ts` with `mammoth`, HTML output for headings
3. `formats/epub.ts` with `jszip`, spine ordering
4. `formats/text.ts` for TXT and Markdown
5. Add remaining question types: true/false, short answer, fill-in-the-blank
6. Implement fuzzy matching in `answer-matching.ts`
7. Implement study sets
8. Add fixtures for every new format
9. Copy for every new failure case

---

## Milestone 8 — Understanding

**Exit criteria:** v0.4.

1. Add the explain prompt and schema, with the `coveredByDocument` field
2. Build the explanation panel with depth switching that preserves previous versions
3. Implement text selection as a trigger
4. Implement `domain/search/bm25.ts` with structural boosting
5. Implement `retrieval-tier.ts`
6. Add the query-expansion task
7. Add the chat prompt
8. Build the chat interface with an input that rises with the keyboard
9. Extract and validate inline `[p. N]` citations
10. Implement save-answer-as-flashcard
11. Write BM25 tests with known-input ranking

Verify the honest-refusal path explicitly: ask about something the document does not cover and confirm it says so rather than answering from general knowledge. This is the single most important behaviour to check by hand.

---

## Milestone 9 — Exams and export

**Exit criteria:** v0.5.

1. Add the exam prompt and schema
2. Build the exam configuration screen
3. Build the preview with per-question regeneration
4. Implement answer-key generation with rationales
5. Write `src/styles/print.css`: light colours forced, no chrome, `break-inside: avoid`, key on a new page
6. Implement in-app exam taking with a countdown
7. Implement Anki and Quizlet CSV export
8. Implement study-pack export and import with validation
9. Implement full-archive export
10. Implement delete-everything with confirmation
11. Write export round-trip tests, including special characters
12. Verify print output on actual paper

Print on paper. A print stylesheet that looks right in a preview and breaks a question across a page break in reality is a common and embarrassing failure.

---

## Milestone 10 — Offline

**Exit criteria:** v0.6.

1. Add `vite-plugin-pwa` and the manifest with a full icon set including maskable
2. Configure caching strategies per [OFFLINE-AND-PWA.md](../03-ARCHITECTURE/OFFLINE-AND-PWA.md)
3. Implement the update notice, non-blocking, never mid-session
4. Implement offline detection and the banner naming what works
5. Disable AI actions offline with a stated reason
6. Implement the install prompt, timed after a first completed quiz
7. Add iOS-specific install instructions
8. Request persistent storage
9. Implement storage warnings at 80% and 95%
10. Implement private-browsing detection
11. Implement the export nudge
12. Write offline Playwright specs
13. Install on real Android and iOS devices and test in airplane mode

---

## Milestone 11 — Progress and polish

**Exit criteria:** v0.7.

1. Build the dashboard
2. Implement per-topic accuracy
3. Implement the accuracy trend chart, and decide the charting question in [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md)
4. Implement drill-my-weak-spots
5. Implement dark mode with no flash of wrong theme
6. Implement reading mode
7. Implement the reduce-motion setting
8. Implement the focus timer
9. Implement keyboard shortcuts and the `?` sheet
10. Build the settings screen

---

## Milestone 12 — Release

**Exit criteria:** v1.0. No new features in this milestone.

1. Build the bring-your-own-key flow with the three-step guide and the privacy note
2. Verify a user key is never logged or stored server-side
3. Implement warning-before-the-wall using `quotaRemaining`
4. Complete the manual accessibility checklist in [ACCESSIBILITY.md](../02-DESIGN/ACCESSIBILITY.md)
5. Complete real-device testing on Android and iOS
6. Review 100 generated questions; require 90% sound with verified citations
7. Review every error state's copy against the guide
8. Verify no payment language exists anywhere; add a Playwright assertion for it
9. Confirm `npx license-checker --summary` shows only permissive licences
10. Set `DAILY_GLOBAL_LIMIT` from Google's current published limit
11. Test the kill switch, then clear it
12. Have someone else follow [SELF-HOSTING-GUIDE.md](../07-OPEN-SOURCE/SELF-HOSTING-GUIDE.md) start to finish
13. Write `SECURITY.md` and `CHANGELOG.md`
14. Tag v1.0

Step 12 matters more than it looks. A self-hosting guide verified only by its author is a guide that does not work.

---

## Rules throughout

| Rule |
|---|
| Every user-facing string goes into `src/copy/` as you write it, never afterwards |
| Check every screen at 320px before considering it finished |
| Check every screen with the keyboard before considering it finished |
| Every generated item must carry a citation, from milestone 4 onward |
| Run `axe-core` on every new route |
| Commit atomically; keep documentation commits separate from code |
| Update [ACTIVITY-LOG.md](../ACTIVITY-LOG.md) at the end of each session |

Moving strings into `src/copy/` retroactively is tedious and gets skipped. Do it as you go.

## If something takes longer than expected

The cut order is in [ROADMAP.md](ROADMAP.md). Never cut grounding validation, accessibility, mobile support, or honest quota messaging.
