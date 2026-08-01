# Rules

Coding standards, testing, git workflow, and the checklists that gate a merge.

The audience for this code includes student contributors reading it for the first time. Optimise
for that, not for cleverness.

## TypeScript

Strict mode, no exceptions: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`,
`noFallthroughCasesInSwitch`. `noUncheckedIndexedAccess` is deliberate — we index into arrays of
chunks, questions, and options constantly, and it catches the class of bug where an index is out of
range.

| Rule                                                                 | Reason                                   |
| -------------------------------------------------------------------- | ---------------------------------------- |
| No `any`. Use `unknown` and narrow.                                  | `any` disables the reason we have types  |
| No non-null assertion `!` except where provably safe, with a comment | It is a lie to the compiler              |
| Prefer `type` for unions, `interface` for object shapes              | Consistency                              |
| Discriminated unions over optional-field soup                        | Makes invalid states unrepresentable     |
| Return types on exported functions                                   | Documents the contract and catches drift |
| No enums; use `as const` unions                                      | Smaller output, simpler semantics        |

Model responses arrive as `unknown` and are narrowed by validation. Never cast them.

## Naming

Files and folders kebab-case. Components PascalCase, one per file. Hooks `use-` prefixed. Types
PascalCase, functions and variables camelCase, constants SCREAMING_SNAKE_CASE. Booleans take an
`is`/`has`/`should`/`can` prefix. Async functions name the result, not the act: `loadDocument`, not
`doLoad`.

Names say what, not how. `getDueCards`, not `queryIndexedDBForDueCards` — the storage mechanism is
an implementation detail that will change.

## Comments

**One line, one sentence.** No block comments, no JSDoc ceremony on internal code. Comment **why**,
never **what** — the code says what.

```ts
// Models favour certain answer positions, so shuffle after generation.
const shuffled = shuffleOptions(question);
```

Delete a comment that has become wrong. A stale comment is worse than none, because it is trusted.
A comment explaining a non-obvious workaround should name the cause: `// pdfjs returns items in
visual order, which interleaves columns.`

No emojis in comments or code. No decorative banner comments.

## Functions and components

Functions: one job each, under 40 lines as a guide, under 4 parameters before taking an options
object, early return over nested conditionals, pure wherever possible and especially in `domain/`.

Components: one per file, under 150 lines as a target and 250 as a ceiling, props typed as
`<Component>Props`, no default exports so renaming is safe and imports are greppable, function
declarations rather than arrow constants. Extract logic into hooks; components should mostly
render. Hooks stay under 100 lines, domain modules under 200.

## Layer boundaries

Enforced by ESLint in `eslint.config.js`, not by review:

| Layer          | May import                   | May never import                  |
| -------------- | ---------------------------- | --------------------------------- |
| `ui/`          | `domain/`, `hooks/`, `copy/` | `parsing/`, `persistence/`, `ai/` |
| `domain/`      | other `domain/` modules only | everything else, including React  |
| `parsing/`     | `domain/`                    | `ui/`, `persistence/`, `ai/`      |
| `persistence/` | `domain/`                    | `ui/`, `parsing/`, `ai/`          |
| `ai/`          | `domain/`                    | `ui/`, `parsing/`, `persistence/` |
| `hooks/`       | everything                   | — the only sanctioned bridge      |

Test files are exempt from the import restriction. A test asserting that a control actually
persisted has to read the database to do it, and routing that through a hook would test the hook
instead of the component.

## Testing

Testing effort follows risk, not code volume. The risk is concentrated in three places:

1. **Parsing real documents** — the most likely source of user-visible failure, and only detectable
   against genuine files.
2. **Data migrations** — there is no server backup, so a bad migration destroys a user's work
   permanently.
3. **Grounding validation** — if an ungrounded question reaches a student, the product has failed at
   its core promise.

Those get disproportionate attention. Presentational components get very little, because a
misaligned button is cheap to notice and cheap to fix.

| Layer         | Tool                      | Coverage aim                              |
| ------------- | ------------------------- | ----------------------------------------- |
| Domain logic  | Vitest                    | High, near-exhaustive                     |
| Parsing       | Vitest + real fixtures    | Every format and failure case             |
| Persistence   | Vitest + `fake-indexeddb` | Every migration                           |
| AI client     | Vitest, mocked network    | Cancel, error mapping, failure injection  |
| API function  | Vitest, mocked provider   | Quota, validation, grounding, error codes |
| Components    | Testing Library           | Interactive ones only                     |
| Accessibility | axe-core                  | Every route, both viewports               |

**No global coverage percentage target.** A number invites tests written to raise the number, which
are the least useful tests there are.

What gets tested, specifically: quiz scoring (all correct, none, partial, flagged questions excluded
from both numerator and denominator, fuzzy matching); scheduling (each rating moves the interval as
FSRS specifies, leech flagging, the streak tolerating exactly one missed day, time-zone boundaries);
chunking (never splits mid-sentence or across a heading, `headingPath` correct, page numbers
accurate and 1-indexed); BM25 (known-input ranking, structural boosting actually changes order);
export (Anki CSV round-trips, special characters escape); grounding (an item with no page, a page
outside range, or an absent quote is rejected; whitespace-only differences accepted).

Page-number accuracy matters more than it looks. Every citation shown to a user is a page number,
and an off-by-one error destroys trust in the entire grounding mechanism.

**Parsing fixtures are committed, not generated** — real files in `tests/fixtures/`, because parsing
regressions only appear against real-world quirks: two-column papers, heavy ligatures, running
headers, hyphenated line breaks, scanned and password-protected and corrupt PDFs, PPTX speaker
notes, DOCX heading styles, EPUB navigation, empty documents. Also asserted: **no network request
occurs during parsing**, which should be a test rather than a hope.

Mock mode covers failure states too. `VITE_MOCK_FAILURE` forces any proxy error code, plus
`UNGROUNDED`, which succeeds and returns nothing — the case where every item fails the citation
check, a 200 with an empty result and therefore a different UI path from an error.

```bash
npm test                 # vitest run
npm run test:watch
npm run test:a11y        # axe sweep, needs a preview server on 5180
npx vitest run -t "excludes flagged questions"
```

## Git

| Branch                                                  | Purpose                                              |
| ------------------------------------------------------- | ---------------------------------------------------- |
| `main`                                                  | Always deployable. Every push deploys to production. |
| `feat/<slug>` `fix/<slug>` `docs/<slug>` `chore/<slug>` | Everything else                                      |

No `develop` branch. A solo-maintained project with continuous deployment does not need a second
integration branch; having one just delays feedback. `main` is protected: CI must pass.

Conventional Commits, `<type>(<scope>): <subject>`. Types: `feat`, `fix`, `docs`, `refactor`,
`test`, `perf`, `chore`, `style`. Scopes match the structure: `parsing`, `quiz`, `flashcards`,
`review`, `exam`, `chat`, `dashboard`, `ai`, `persistence`, `ui`, `copy`, `proxy`, `pwa`,
`settings`, `a11y`.

Subject in imperative mood, no trailing full stop, under 72 characters, one logical change per
commit. The body explains **why** when the reason is not obvious from the diff:

```
fix(quiz): shuffle answer options after generation

Models place the correct answer in position B far more often than
chance, which makes quizzes guessable without knowing the material.
Prompting does not fix it reliably, so shuffle client-side once and
store the result so resumed sessions stay consistent.
```

That is the shape to aim for: a non-obvious reason, and why the alternative was rejected. A good
history is the cheapest debugging tool available, and `git bisect` only works if commits are
individually coherent.

**Never committed:** API keys, tokens, or `.env`; `node_modules` or `dist`; emulator debug logs.

## Definition of done

**Correctness.** Does what the issue asked, no more and no less. Edge cases handled: empty, one
item, many items, failure. No regression in an existing feature.

**Architecture.** Layer boundaries respected. `domain/` stays pure with no I/O. File sizes within
guidance. No new dependency without justification.

**Copy.** Every user-facing string in `src/copy/`. Errors say what happened **and** what to do next.
No internals shown. No payment or upgrade language anywhere.

**Accessibility.** Fully operable by keyboard. Focus visible everywhere. Icon-only buttons have an
`aria-label`. Inputs have real labels. Colour is never the only carrier of meaning. Contrast meets
AA. `prefers-reduced-motion` respected. `axe-core` reports no new violation.

**Responsive.** Works at 320px with no horizontal scrolling; checked at 360px and 1280px. Touch
targets at least 44×44px. Primary action within thumb reach. The on-screen keyboard does not obscure
the focused input. Safe-area insets respected.

**Grounding**, for any change touching generated content. Every generated item carries a citation.
Items without a verifiable source are dropped before display. Cited page numbers fall within the
document's real range. Partial results are reported honestly rather than silently reduced.

**Privacy and security.** No API key in any committed file or in the built bundle. No document text
logged anywhere. No new network request sending more than the request needs. No new cookie, no new
third-party script.

**Tests.** Logic changes have unit tests. `npm run typecheck && npm run lint && npm test` all pass.

## Dependencies

A new dependency needs justification. The bar: does it do something we genuinely should not write
ourselves, is it permissively licensed, is it maintained, and what does it cost in bundle size on a
cheap phone over slow data? Prefer the platform. GSAP was rejected on licensing; `motion` was
rejected at ~34 KB gzipped to do what a keyframe already does.

## Contributing

Issues describe the problem before the solution. Pull requests stay focused — one logical change,
with unrelated cleanups split out. Be kind in review; the person on the other end is usually a
student doing this in their spare time. Assume good faith, ask before rewriting someone's approach,
and say why rather than only what.
