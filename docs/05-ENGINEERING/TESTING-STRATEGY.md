# Testing Strategy

Purpose: what we test, how, and why the balance sits where it does.
Last updated: 2026-07-30

## Where the risk is

Testing effort should follow risk, not code volume. In this project the risk is concentrated in three places:

1. **Parsing real documents.** The most likely source of user-visible failure, and only detectable against genuine files.
2. **Data migrations.** There is no server backup. A bad migration destroys a user's work permanently.
3. **Grounding validation.** If an ungrounded question reaches a student, the product has failed at its core promise.

Those three get disproportionate attention. Presentational components get very little, because a misaligned button is cheap to notice and cheap to fix.

## The shape

| Layer | Tool | Coverage aim | Why |
|---|---|---|---|
| Domain logic | Vitest | High, near-exhaustive | Pure functions, cheap to test, where real bugs live |
| Parsing | Vitest + real fixtures | Every format and every failure case | Highest-risk area |
| Persistence | Vitest + `fake-indexeddb` | Every migration | Irreversible if wrong |
| AI client | Vitest, mocked network | Retry, cancel, error mapping | Error paths rot untested |
| Function | Vitest, mocked provider | Quota, validation, error codes | Guards the key and the quota |
| Components | Testing Library | Interactive ones only | Presentational components are not worth it |
| Flows | Playwright | The flows in [USER-FLOWS.md](../01-PRODUCT/USER-FLOWS.md) | Catches integration failures |
| Accessibility | axe-core | Every route | Non-negotiable requirement |

No global coverage percentage target. A number invites tests written to raise the number, which are the least useful tests there are.

## Domain layer

Pure functions with no I/O, so tests need no mocks and run in milliseconds.

**Quiz scoring** — all correct, none correct, partial, flagged questions excluded from both numerator and denominator, empty quiz, every question flagged, fuzzy matching for fill-in-the-blank including case and whitespace differences.

**Scheduling** — each of the four ratings moves the interval in the direction FSRS specifies; a new card enters learning; repeated failures set the leech flag; the streak tolerates exactly one missed day and no more; time-zone boundaries do not double-count or skip a day.

**Chunking** — never splits mid-sentence; never splits across a heading; overlap is present; `headingPath` is correct; short chunks merge into a neighbour; page numbers are accurate and 1-indexed.

Page-number accuracy matters more than it looks. Every citation shown to a user is a page number, and an off-by-one error destroys trust in the entire grounding mechanism.

**BM25** — known-input ranking; structural boosting from headings actually changes order; stopwords excluded; empty query handled.

**Export** — Anki CSV round-trips; special characters, commas, and quotes escape correctly; a study pack exports and re-imports to an identical state.

**Grounding validation** — an item with no page is rejected; a page outside the document range is rejected; a quote absent from the source is rejected; a quote differing only in whitespace is accepted.

## Parsing

The highest-value tests in the project, because they are the only way to catch the failures users will actually hit.

**Committed fixtures** in `tests/fixtures/`. Real files, not generated ones:

| Fixture | Asserts |
|---|---|
| Clean text PDF | Text extracted, page numbers correct |
| Two-column academic paper | Columns not interleaved |
| PDF with heavy ligatures | `ﬁ` normalised, so search matches |
| PDF with running headers | Headers stripped, content kept |
| Hyphenated line breaks | Words rejoined correctly |
| Scanned PDF | Detected and refused |
| Password-protected PDF | Detected and refused |
| Corrupt PDF | Fails cleanly with a named reason |
| PPTX with speaker notes | Notes included and labelled |
| DOCX with heading styles | Outline built from headings |
| EPUB with navigation | Chapters ordered correctly |
| Markdown | Headings become the outline |
| Empty document | Handled without crashing |

Fixtures are committed rather than generated because parsing regressions only appear against real-world file quirks.

**Also asserted:** no network request occurs during parsing. This is the privacy promise from [ADR-0005](../08-DECISIONS/ADR-0005-CLIENT-SIDE-PARSING.md), and it should be a test rather than a hope.

## Persistence

Using `fake-indexeddb`.

**Migrations get the most attention.** For each schema version: populate a database in the previous shape with realistic data, run the migration, and assert nothing was lost and everything is in the new shape. Also assert idempotency, since a migration can be interrupted by a closed tab.

There is no server backup, so a bad migration is unrecoverable for that user. This is the one place where thorough testing is not optional.

**Also tested:** queries return what they should; the due-cards query respects dates and time zones; storage-pressure thresholds fire at 80% and 95%; a write failure leaves no partial state.

## AI client and function

Mocked provider, no real requests, no quota consumed.

**Client** — retry on retryable codes and not on others; retry count capped; cancellation aborts in flight; partial results preserved on cancel; every error code maps to a domain error; `quotaRemaining` surfaced.

**Function** — quota checked before the provider call; counters increment even on provider failure; foreign origin rejected; kill switch honoured; oversized text rejected before any provider call; ungrounded items dropped. (No retry logic exists today — see AI-INTEGRATION.md.)

**Explicitly asserted:** the API key never appears in any response body, header, or error. This is the single most important assertion in the suite.

## Components

Only the interactive ones. Testing that a heading renders its prop is not worth the file.

Worth testing: the question card, including flag-and-exclude; the flashcard, including that rating buttons are absent before the flip; the upload drop zone, including rejection paths; the settings key field, including that the value is not logged.

Presentational components are covered incidentally by the end-to-end tests.

## End-to-end

Playwright, **always in mock AI mode**, so tests are deterministic and consume no quota.

Specs mirror [USER-FLOWS.md](../01-PRODUCT/USER-FLOWS.md):

1. **First visit to first question** — the flow that matters most. Land, upload, quiz, answer, see feedback with a citation.
2. **Cram session** — due cards, drill weak spots, results, convert misses to cards.
3. **Exam and print** — configure, generate, preview, and assert the print stylesheet hides interface chrome.
4. **Ask the document** — question, cited answer, tap a citation to open the source.
5. **Export and import** — export a pack, clear storage, import, assert identical state.
6. **Offline** — load, go offline, reload, assert the app opens and review works while AI actions are disabled with a reason.
7. **Quota exhausted** — mock the error and assert the message names the reset time and never mentions payment.

That last assertion is unusual and deliberate. "No payment language anywhere" is a product commitment, and a test is the only way it stays true as the app grows.

### Viewports

Every spec runs at 360px and 1280px. Additionally, one spec asserts no horizontal scrolling at 320px on every route.

## Accessibility

**Automated, in CI:** `axe-core` on every route, failing the build on any violation. Lighthouse accessibility minimum 95. All interactive elements have accessible names.

Automated tools catch roughly a third of real problems, so they are a floor rather than a standard.

**Manual, per release:** the checklist in [ACCESSIBILITY.md](../02-DESIGN/ACCESSIBILITY.md) — keyboard-only completion of a quiz and a review session, NVDA on desktop, VoiceOver on iOS, 200% zoom on every screen, greyscale check, reduced-motion check, and touch targets measured on a real device.

## Real-device testing

Not automatable, and not skippable. Emulators do not reproduce touch accuracy, on-screen keyboard behaviour, memory pressure, Safari's quirks, or VoiceOver.

Per release, on at least one mid-range Android phone and one iPhone:

- Parse a 100-page PDF; confirm under 10 seconds and no frozen interface
- Complete a quiz one-handed; confirm the primary action is thumb-reachable
- Install to the home screen; confirm standalone launch and the correct icon
- Airplane mode; confirm the app opens and review works
- Confirm storage survives an app close and a device restart
- Rotate to landscape on every screen

The 100-page parse on real hardware is the check most likely to reveal a genuine problem.

## Mock AI mode

Enabled by an environment flag. `src/ai/client.ts` short-circuits to fixtures in `src/ai/mock/`.

Three things it buys us:

- **Contributors work without credentials**, which removes the largest onboarding barrier
- **End-to-end tests are deterministic and free**
- **Development does not burn the shared quota**

Fixtures include the awkward cases, not only the happy path: items that fail grounding validation, a malformed response, `QUOTA_EXHAUSTED_GLOBAL`, and a provider timeout. Testing only success paths is how error handling rots.

## CI

```
1. typecheck
2. lint
3. unit tests
4. build
5. bundle size          — fail above 300 KB gzipped initial JS
6. secret scan          — fail if anything key-shaped is in the bundle
7. playwright           — mock AI, both viewports
8. axe-core             — fail on any violation
9. npm audit            — fail on high or critical
```

Steps 5 and 6 exist because of this project's specific constraints, and they are the ones most worth having. Everything is free on GitHub Actions for public repositories.

## What we do not test

| Not tested | Why |
|---|---|
| Third-party library internals | Not our code |
| The real provider API | Costs quota, non-deterministic, and provider behaviour is not our contract |
| Prompt output quality | Not assertable. Manual review instead, per [PROMPT-LIBRARY.md](../03-ARCHITECTURE/PROMPT-LIBRARY.md) |
| Exact visual appearance | Screenshot tests break on every intentional change and teach nothing |
| Presentational components in isolation | Covered by end-to-end |

Prompt quality is the notable gap. It cannot be unit tested, so the gate is manual review of at least twenty generated items after any prompt change, with the before and after recorded in [ACTIVITY-LOG.md](../ACTIVITY-LOG.md).

## Writing a test

- Name it after the behaviour: `excludes flagged questions from the score`
- Arrange, act, assert; one behaviour per test
- No shared mutable state between tests
- Test the contract, not the implementation, so refactoring does not break the suite
- A bug fix gets a test that fails before the fix

## Before merging

See [DEFINITION-OF-DONE.md](DEFINITION-OF-DONE.md).
