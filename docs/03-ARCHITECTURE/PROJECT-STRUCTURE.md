# Project Structure

Purpose: the folder layout, what belongs where, and the rules that keep it from rotting.
Last updated: 2026-07-30

## Layout

```
ScholarForgeAI/
├── docs/                          planning documentation (this folder)
├── functions/                     Cloudflare Pages Functions
│   └── api/
│       ├── generate.ts            the AI proxy, the only server code
│       └── _lib/
│           ├── prompts.ts         prompt templates per task
│           ├── schemas.ts         JSON response schemas
│           ├── quota.ts           Workers KV counters
│           └── validate.ts        grounding and schema checks
├── public/
│   ├── manifest.webmanifest
│   ├── icons/
│   └── robots.txt
├── src/
│   ├── main.tsx                   entry point
│   ├── App.tsx                    routes only
│   │
│   ├── ui/                        LAYER 1 — presentation
│   │   ├── components/            shared, reusable, no feature knowledge
│   │   │   ├── primitives/        shadcn/ui components live here
│   │   │   └── ...
│   │   ├── layouts/
│   │   └── pages/                 one folder per route
│   │       ├── landing/
│   │       ├── library/
│   │       ├── document/
│   │       ├── quiz/
│   │       ├── flashcards/
│   │       ├── review/
│   │       ├── exam/
│   │       ├── chat/
│   │       ├── dashboard/
│   │       └── settings/
│   │
│   ├── domain/                    LAYER 2 — pure logic, no I/O
│   │   ├── quiz/
│   │   │   ├── scoring.ts
│   │   │   ├── answer-matching.ts
│   │   │   └── shuffle.ts
│   │   ├── scheduling/
│   │   │   ├── fsrs-adapter.ts
│   │   │   └── due-selection.ts
│   │   ├── text/
│   │   │   ├── chunking.ts
│   │   │   ├── cleaning.ts
│   │   │   ├── outline.ts
│   │   │   └── token-estimate.ts
│   │   ├── search/
│   │   │   ├── bm25.ts
│   │   │   └── retrieval-tier.ts
│   │   ├── export/
│   │   │   ├── anki-csv.ts
│   │   │   └── study-pack.ts
│   │   ├── validation/
│   │   │   └── grounding.ts
│   │   └── types.ts               shared domain types
│   │
│   ├── parsing/                   LAYER 3a — document formats
│   │   ├── worker.ts              the Web Worker entry
│   │   ├── index.ts               public API: parseFile(file)
│   │   ├── detect-scan.ts
│   │   └── formats/
│   │       ├── pdf.ts             the only file importing pdfjs-dist
│   │       ├── pptx.ts
│   │       ├── docx.ts
│   │       ├── epub.ts
│   │       └── text.ts
│   │
│   ├── persistence/               LAYER 3b — storage
│   │   ├── db.ts                  Dexie schema and migrations
│   │   ├── documents.ts
│   │   ├── decks.ts
│   │   ├── quizzes.ts
│   │   ├── progress.ts
│   │   ├── settings.ts
│   │   └── quota-check.ts         storage pressure monitoring
│   │
│   ├── ai/                        LAYER 3c — network
│   │   ├── client.ts              the only file calling fetch
│   │   ├── tasks.ts               one function per generation task
│   │   ├── errors.ts              wire errors → domain errors
│   │   └── mock/                  fixture responses for key-free dev
│   │
│   ├── hooks/                     the bridge from UI to everything else
│   │   ├── use-document.ts
│   │   ├── use-generation.ts
│   │   ├── use-due-cards.ts
│   │   └── ...
│   │
│   ├── copy/                      all user-facing strings
│   │   ├── errors.ts
│   │   ├── empty-states.ts
│   │   └── labels.ts
│   │
│   └── styles/
│       ├── globals.css
│       ├── tokens.css             design tokens
│       └── print.css              exam and answer-key printing
│
├── tests/
│   ├── fixtures/                  real sample documents
│   └── e2e/                       Playwright specs
├── .github/workflows/ci.yml
├── LICENSE
└── README.md
```

## Layer rules

Dependencies point one direction. This is the single most important rule in the codebase.

| Layer | May import from | May never import |
|---|---|---|
| `ui/` | `domain/`, `hooks/`, `copy/` | `parsing/`, `persistence/`, `ai/` directly |
| `domain/` | other `domain/` modules only | anything with I/O, React, or browser APIs |
| `parsing/` | `domain/` | `ui/`, `persistence/`, `ai/` |
| `persistence/` | `domain/` | `ui/`, `parsing/`, `ai/` |
| `ai/` | `domain/` | `ui/`, `parsing/`, `persistence/` |
| `hooks/` | everything | — |
| `functions/` | `functions/_lib/` only | anything under `src/` |

**Why UI cannot touch infrastructure directly.** The moment a component imports Dexie, that component can no longer be tested without a database, and swapping storage means editing components. Hooks are the seam. Keep it.

**Why the domain layer has no I/O.** Pure functions are testable exhaustively with no mocks. Scoring, scheduling, and ranking are the parts most likely to contain real bugs, so they are the parts most worth making cheap to test.

**Why `functions/` cannot import from `src/`.** Pages Functions run on the Workers runtime, not Node or the browser. Sharing code would drag browser assumptions into an environment that lacks them. Duplicate the handful of shared types instead.

Enforce with ESLint `no-restricted-imports`. A boundary that is only documented is a boundary that will be crossed.

## File size discipline

Guidance, not lint rules, but treat a breach as a signal.

| Kind | Target | Hard ceiling |
|---|---|---|
| React component | under 150 lines | 250 |
| Domain module | under 200 lines | 300 |
| Hook | under 100 lines | 150 |
| Test file | no limit | — |

A file over its ceiling is doing more than one thing. The fix is to split it, not to raise the number.

This matters practically as well as aesthetically: small focused files are easier for a contributor to understand in isolation, and easier to modify correctly.

## Naming

| Thing | Convention | Example |
|---|---|---|
| Files and folders | kebab-case | `answer-matching.ts` |
| React components | PascalCase, one per file | `QuestionCard.tsx` |
| Hooks | `use-` prefix | `use-due-cards.ts` |
| Types and interfaces | PascalCase | `ParsedDocument` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_FILE_BYTES` |
| Test files | mirror the source | `scoring.test.ts` |
| Markdown docs | ALL-CAPS-KEBAB | `TECH-STACK.md` |

## Page folder shape

Each route folder is self-contained:

```
pages/quiz/
├── QuizPage.tsx           the route component
├── components/            used only by this page
│   ├── QuestionCard.tsx
│   ├── AnswerFeedback.tsx
│   └── QuizProgress.tsx
└── use-quiz-session.ts    page-specific hook
```

A component used by two or more pages moves up to `src/ui/components/`. A component used by one page stays local. Resist the urge to promote things early; a shared component with two callers and three configuration props is usually worse than two clear components.

## Where user-facing text lives

All of it in `src/copy/`. No user-visible string is hardcoded in a component.

Reasons: the copy guide in [CONTENT-AND-COPY-GUIDE.md](../02-DESIGN/CONTENT-AND-COPY-GUIDE.md) can then be reviewed against one place; wording can be improved without touching component logic; and adding translations later becomes a contained change rather than a hunt through every file.

## Code splitting

Route-level splitting by default, plus:

- Each parser dynamically imported on first use of its format
- The dashboard charting code loaded with the dashboard route
- The print stylesheet loaded only when printing

The target is under 300 KB gzipped for the initial bundle. `pdfjs-dist` alone would blow that, hence lazy loading.

## Tests

Unit tests sit beside their source: `scoring.ts` and `scoring.test.ts` in the same folder. End-to-end tests live in `tests/e2e/`. Real sample documents live in `tests/fixtures/` and are committed, since parsing regressions are only catchable against genuine files.

Detail in [TESTING-STRATEGY.md](../05-ENGINEERING/TESTING-STRATEGY.md).
