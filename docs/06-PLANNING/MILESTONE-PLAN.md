# Milestone Plan

Purpose: the milestones with their exit criteria, so "done" is not a judgement call.
Last updated: 2026-07-30

Task detail in [BUILD-ORDER.md](BUILD-ORDER.md). Phase context in [ROADMAP.md](ROADMAP.md).

A milestone is complete when every exit criterion is demonstrably met. Not "mostly", not "except for one thing".

## M0 — Skeleton

**Delivers:** the scaffolding.

| Exit criterion |
|---|
| An empty page is live at a Cloudflare Pages URL |
| CI runs typecheck, lint, test, build, bundle size, and secret scan, and is green |
| Layer-boundary lint rules are active and enforced |
| Design tokens exist and are wired into Tailwind |
| The folder structure matches [PROJECT-STRUCTURE.md](../03-ARCHITECTURE/PROJECT-STRUCTURE.md) |

**Risk if skipped:** retrofitting layer-boundary rules later means fixing dozens of accumulated violations.

## M1 — PDF parsing

**Delivers:** documents become text.

| Exit criterion |
|---|
| A real 100-page university PDF extracts readable text |
| Page numbers are accurate, verified by hand against the source |
| Multi-column PDFs do not interleave columns |
| Hyphenated line breaks are rejoined |
| Scanned PDFs are detected and refused |
| Running headers and footers are removed, content is not |
| A topic outline is produced |
| Tests assert that no network request occurs during parsing |
| All PDF fixtures behave as expected |

**Verify by reading the extracted text.** Tests confirm the pipeline runs; only reading confirms the output is usable.

## M2 — Persistence

**Delivers:** things survive a reload.

| Exit criterion |
|---|
| Documents persist across a page reload |
| The version 1 Dexie schema matches [DATA-MODEL.md](../03-ARCHITECTURE/DATA-MODEL.md) |
| Storage-pressure thresholds fire at 80% and 95% |
| Persistence tests pass with `fake-indexeddb` |

## M3 — Upload interface

**Delivers:** a real front end.

| Exit criterion |
|---|
| The landing page has the drop zone above the fold at 320px |
| Drag-drop and tap-to-browse both work; the phone file picker opens |
| Parsing progress shows named stages with real page numbers |
| Every upload failure shows its message from [CONTENT-AND-COPY-GUIDE.md](../02-DESIGN/CONTENT-AND-COPY-GUIDE.md) |
| Every string is in `src/copy/`, none hardcoded |
| No horizontal scroll at 320px |
| Fully keyboard operable, focus visible |
| `axe-core` reports no violations |

## M4 — The proxy

**Delivers:** generation, with the key protected.

| Exit criterion |
|---|
| **The API key does not appear anywhere in the built bundle**, verified by searching the deployed JavaScript |
| **The key never appears in any response body, header, or error**, asserted in tests |
| A quiz generates end to end against the real provider |
| Per-IP and global quota counters work |
| The kill switch stops generation without a redeploy |
| A foreign origin is rejected |
| Ungrounded items are dropped before the response is returned |
| Over half ungrounded triggers one stricter retry, then an honest error |
| Every error code from [API-CONTRACTS.md](../03-ARCHITECTURE/API-CONTRACTS.md) is implemented |
| Mock mode runs the whole app with no key |

The first two criteria are the reason this milestone exists. See [ADR-0002](../08-DECISIONS/ADR-0002-SHARED-KEY-BEHIND-PROXY.md).

## M5 — Quizzes (v0.1)

**Delivers:** the first genuinely useful version.

| Exit criterion |
|---|
| A full quiz can be taken on a real phone, one-handed |
| Every question carries a page citation, and the citations are correct |
| The source-passage viewer opens from any citation |
| Answer positions are shuffled after generation |
| Flagging a question excludes it from scoring |
| A quiz survives a page reload mid-way |
| Results show a per-topic breakdown |
| Retry-missed works |
| The first Playwright spec passes at both viewports |
| Time from landing to first question is under two minutes |

**The gate for v0.1:** ten sound, correctly-cited questions from a genuine university PDF. If generation quality is poor here, stop and fix prompts before building anything else. Everything downstream assumes this works.

## M6 — Study loop (v0.2)

**Delivers:** a reason to come back tomorrow.

| Exit criterion |
|---|
| Cards generate, including cloze, each testing one thing |
| Review sessions serve due cards |
| Each of the four ratings changes the interval as FSRS specifies |
| Rating buttons show their resulting interval |
| Rating buttons are absent before the flip |
| Swipe works, with button equivalents |
| The streak tolerates exactly one missed day |
| Leeches are detected and flagged sympathetically |
| Convert-missed-to-cards works |
| Read-aloud works |
| Scheduling tests pass, including time-zone boundaries |

## M7 — All formats (v0.3)

| Exit criterion |
|---|
| PPTX parses, including speaker notes, labelled |
| DOCX parses with a heading-based outline |
| EPUB parses in spine order |
| TXT and Markdown parse |
| All four question types work |
| Fuzzy answer matching handles case and whitespace |
| Study sets combine up to 10 documents with correct per-file citations |
| Fixtures exist for every format |
| Every new failure case has proper copy |

## M8 — Understanding (v0.4)

| Exit criterion |
|---|
| Explanations work at all three depths |
| Switching depth preserves the previous version |
| **Asking about something absent from the document produces a refusal, not an invention** |
| Chat answers carry tappable inline page citations |
| BM25 retrieval activates for documents exceeding the context window |
| Query expansion improves recall on a synonym case |
| Save-answer-as-flashcard works |

The refusal behaviour is the one to check by hand. It is the difference between a study tool and a plausible-sounding hazard.

## M9 — Exams and export (v0.5)

| Exit criterion |
|---|
| Exams generate with the requested type mix and difficulty spread |
| Topic coverage roughly matches what was requested |
| The answer key includes a rationale and a page for every question |
| Individual questions can be regenerated |
| **Printed on actual paper:** no chrome, light colours, no question split across a page break, key on a new page |
| Anki CSV imports cleanly into Anki |
| Quizlet CSV imports cleanly into Quizlet |
| A study pack round-trips to an identical state |
| A malformed import is rejected with no partial write |
| Delete-everything works and confirms first |

Test the CSV exports by actually importing them into Anki and Quizlet.

## M10 — Offline (v0.6)

| Exit criterion |
|---|
| The app opens with no connection after a first load |
| Card review, saved quizzes, explanations, and exams all work offline |
| AI actions are disabled offline with a stated reason |
| The offline banner names what still works |
| Installs on real Android; opens standalone with a correct maskable icon |
| Installs on real iOS via Share; opens standalone |
| Airplane-mode tested on both real devices |
| Storage survives an app close and a device restart |
| The install prompt appears only after a first completed quiz, and dismissal is permanent |
| Storage warnings fire at 80% and 95% |
| Private browsing is detected and the user warned |

Real devices. Emulators do not reproduce Safari's storage eviction or install behaviour.

## M11 — Progress and polish (v0.7)

| Exit criterion |
|---|
| The dashboard shows per-topic accuracy and an accuracy trend |
| Drill-my-weak-spots generates a correctly weighted quiz |
| Dark mode works with no flash of the wrong theme on load |
| Reading mode increases spacing |
| Reduce-motion works from both the OS preference and the app setting |
| Full keyboard operation, with a `?` shortcut sheet |
| The charting decision in [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) is resolved and recorded |

## M12 — Release (v1.0)

No new features. Verification only.

| Exit criterion |
|---|
| Bring-your-own-key works, with the guide and the privacy note |
| A user-supplied key is provably never logged or stored server-side |
| Warning-before-the-wall works from `quotaRemaining` |
| The full manual accessibility checklist passes, including NVDA and VoiceOver |
| Lighthouse accessibility 95 or above |
| Real-device testing complete on Android and iOS |
| **100 generated questions reviewed; 90% or more sound with verified citations** |
| Every error state's copy reviewed against the guide |
| **No payment or upgrade language anywhere**, with a Playwright assertion enforcing it |
| `npx license-checker --summary` shows only permissive licences |
| `DAILY_GLOBAL_LIMIT` matches Google's current published limit |
| The kill switch tested and cleared |
| **Someone other than the author has followed the self-hosting guide successfully** |
| `SECURITY.md` and `CHANGELOG.md` written |
| Cloudflare dashboard shows $0 |
| Tagged v1.0 |

## Sequencing constraints

| Milestone | Blocked by | Because |
|---|---|---|
| M2 | M1 | Nothing to store until parsing produces something |
| M4 | M2 | Generated content needs somewhere to go |
| M5 | M4 | Quizzes need generation |
| M6 | M5 | Cards reuse the generation and review plumbing |
| M8 | M7 | Retrieval needs multi-format chunking to be settled |
| M10 | M9 | Caching a still-changing feature surface is wasted work |
| M12 | all | It is verification of everything |

M7 can run in parallel with M6 if there is appetite for it; nothing in either depends on the other.

## Progress tracking

Milestone status lives in [ACTIVITY-LOG.md](../ACTIVITY-LOG.md), updated at the end of each working session. GitHub milestones mirror these, one per M.

An exit criterion that cannot be met is recorded in [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) with the reason, not quietly dropped.
