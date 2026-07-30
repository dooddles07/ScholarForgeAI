# Activity Log

Purpose: running record of work done, decisions made, and where things stand. Read this first if you lose context.
Last updated: 2026-07-30

Newest entries at the top.

---

## 2026-07-30 — Deploy target switched to Vercel; PPTX/DOCX/EPUB parsing built

**Done**
- Switched deploy target from Cloudflare Pages to Vercel. `vercel.json` now carries the security headers previously in `public/_headers` (removed, along with `public/_redirects`, since Vercel doesn't read Cloudflare-style config files). See [ADR-0009](08-DECISIONS/ADR-0009-VERCEL-OVER-CLOUDFLARE-PAGES.md), which supersedes [ADR-0003](08-DECISIONS/ADR-0003-CLOUDFLARE-PAGES-OVER-VERCEL.md).
- Built real `.pptx`, `.docx`, and `.epub` parsing per [ADR-0005](08-DECISIONS/ADR-0005-CLIENT-SIDE-PARSING.md): `src/parsing/formats/pptx.ts` (jszip, slide XML), `docx.ts` (mammoth), `epub.ts` (jszip, container/OPF/spine reader). Wired into `src/parsing/index.ts`, replacing the "Milestone 7" placeholder that threw `unsupported` for these formats.
- Unit tests for pptx and epub parsers using in-memory zip fixtures (`pptx.test.ts`, `epub.test.ts`) — 6 new tests, all passing. No docx test yet; fabricating a real docx binary for mammoth needs a more involved fixture.

**Verified**
- Typecheck, lint, full test suite (15 tests), and build all green.

## 2026-07-30 — Real BM25 retrieval for ask-your-document chat

**Done**
- Built `src/domain/retrieval/bm25.ts`: client-side BM25 ranking with heading-path structural boosting, per [ADR-0006](08-DECISIONS/ADR-0006-BM25-RETRIEVAL-NOT-EMBEDDINGS.md).
- Replaced the naive term-overlap scoring in `src/ai/client.ts:answerQuestion` with `bm25Rank`, keeping the same function signature and citation shape — no caller changes needed.
- 5 unit tests in `bm25.test.ts` covering ranking correctness, empty query/document handling, heading boost, and topK.

**Verified**
- Typecheck, lint, full test suite (20 tests), and build all green.

## 2026-07-30 — Offline support via `vite-plugin-pwa`

**Done**
- Installed `vite-plugin-pwa`, configured in `vite.config.ts`: web app manifest (name, icons, theme color, standalone display), service worker precaching the app shell.
- Generated `public/icons/icon-192.png`, `icon-512.png`, `maskable-512.png` from the existing `favicon.svg` (one-time `sharp` conversion, then `sharp` removed — it was a dev-only tool, not a runtime dependency).
- Added `apple-touch-icon` link to `index.html` for iOS home-screen installs, per [ADR-0007](08-DECISIONS/ADR-0007-PWA-OVER-NATIVE.md).
- Excluded the PDF worker (1.3 MB) and the pdf/jszip vendor chunks from the service worker's precache list (`globIgnores`), and cache them at runtime instead, the first time a document of that type is actually opened. Precaching them upfront would have defeated the point of lazy-loading them (see [ADR-0005](08-DECISIONS/ADR-0005-CLIENT-SIDE-PARSING.md)).

**Note for later**
- `.github/workflows/ci.yml`'s bundle-size check picks `find dist/assets -name 'index-*.js' | head -1`, which assumed exactly one `index-*.js` chunk. Vite now also names some lazy dynamic-import chunks `index-*.js` (e.g. the chunk containing `mammoth`), so this check may not always grab the real entry chunk. Not fixed here since every current `index-*.js` chunk is still under the 300 KB gzip budget regardless of which one gets picked, but worth tightening the glob (e.g. match the hash from `dist/index.html`'s script tag) if this ever becomes a real gap.

**Verified**
- Typecheck, lint, full test suite (20 tests), and build all green. `dist/sw.js` and `dist/manifest.webmanifest` generate correctly; `dist/` stays gitignored.

## 2026-07-30 — Export: backup file, Anki/Quizlet CSV

**Done**
- Whole-app JSON backup: `src/domain/export/backup.ts` (payload shape, `isBackupPayload` type guard), `src/persistence/backup.ts` (`exportBackup`/`importBackup`, restore is a merge via `bulkPut`, never destructive). Settings (including the user's own API key) are deliberately excluded from the backup file, since a backup is meant to move between devices or be shared.
- Wired into Settings under "Your data" (`SettingsPage.tsx`, `src/hooks/use-backup.ts`): download a backup, or restore one from a file picker, with a status message on success or a bad file.
- Anki/Quizlet CSV export: `src/domain/export/csv.ts` (generic CSV builder with proper quoting) and `deck-export.ts` (`buildCardsCsv`, front/back, no header — both destinations import the same plain CSV with no app-specific format). Wired into the flashcards page as two buttons next to a deck once it has cards.
- `src/lib/download.ts`: shared client-side file-download helper (Blob + temporary anchor), used by both the backup and CSV exports.
- 7 new unit tests across `deck-export.test.ts` and `backup.test.ts`.

**Verified**
- Typecheck, lint, full test suite (27 tests), and build all green. Initial bundle unchanged at ~87 KB gzipped.

## 2026-07-30 — Streak mechanic

**Done**
- `src/domain/streak/streak.ts`: pure `recordStudyDay` function implementing the rule already implied by the existing copy (`streak.active`/`graceUsed`/`broken` in `copy/labels.ts`) and the existing `Settings` fields (`streakCount`, `streakLastDay`, `streakGraceUsed`) — both were already in place but nothing ever updated them. One missed day is forgiven once per streak; a second miss, or missing more than one day, resets it to 1.
- `src/hooks/use-streak.ts` (`useRecordStudyDay`): reads settings fresh and writes the update, called from `useRateCard` (flashcard rating) and `useQuizSession`'s `answer` callback (quiz question answered) — the two study actions that are actually wired up end to end today.
- The dashboard's streak stat (`DashboardPage.tsx`) already read `settings.streakCount`; it now reflects real activity instead of always showing 0.
- 7 unit tests in `streak.test.ts` covering same-day no-op, normal continuation, the one-day grace, breaking after the grace is spent, and breaking after a longer gap.

**Note for later**
- `saveAttempt` (`src/persistence/study.ts`) is defined but never called from the quiz or exam flow, so quiz/exam completions do not currently feed the dashboard's accuracy trend or weak-topics view, and are not counted toward the streak either. Not fixed here — it is a separate, pre-existing gap in the quiz/exam completion flow, not part of the streak mechanic itself.

**Verified**
- Typecheck, lint, full test suite (34 tests), and build all green.

## 2026-07-30 — Dependency cleanup: unused Radix packages

**Done**
- Removed `@radix-ui/react-progress`, `@radix-ui/react-radio-group`, `@radix-ui/react-label`, `@radix-ui/react-tabs` from `package.json` — confirmed unimported anywhere in `src`, since progress bars and tabs were already hand-rolled in CSS (`QuizProgress.tsx`, `ParseProgressPanel.tsx`).
- Left `@radix-ui/react-tooltip` and the `motion` package alone for now: both are candidates for actual use in the upcoming UI/motion pass (a citation hover-preview tooltip, and three specific motion moments), so the final keep/remove call happens there instead of removing them here and possibly re-adding them a third time.

**Verified**
- Typecheck, lint, full test suite (34 tests), and build all green. No behaviour change.

## 2026-07-30 — UI/UX pass: shadcn CLI, tooltip, motion in three places

**Done**
- Ran the real `shadcn@latest` CLI (`--base radix`, matching the Radix primitives already installed) to write `components.json`, formalizing what was previously hand-rolled without the tool. Aliases point at the project's actual structure (`@/ui/components`, `@/ui/components/primitives`), not the shadcn default `@/components/ui`.
  - The CLI's Windows path resolution didn't pick up the `@/*` alias from `tsconfig.app.json` (it only has an empty root `tsconfig.json` referencing it), so `add` wrote files under a literal `./@/...` folder; moved by hand into `src/ui/components/primitives/` after each add.
  - Added one new component this way: `tooltip.tsx`. Rewired its import from the CLI's default `radix-ui` unified package (not installed) to the project's existing `@radix-ui/react-tooltip`, and replaced the generated `bg-foreground`/`text-background` classes (this project has no such tokens) with the real ones (`bg-fg`/`text-bg`), plus a CSS keyframe (`.tooltip-content` in `globals.css`) instead of the Tailwind `animate-in` utilities this project doesn't have installed.
  - Did not re-add Button/Dialog/Accordion/Switch: shadcn's current default targets Base UI, a different primitive library from the Radix packages already installed and working. Re-adding would mean adopting a second, incompatible primitive library rather than a like-for-like diff. The hand-rolled Radix versions stay as they are.
  - Wired the new tooltip onto the one icon-only affordance in the app (the read-aloud button in `Flashcard.tsx`) — the only place a hover label actually helps, since it doesn't affect the `aria-label` mobile/screen-reader users already get.
- Motion, in exactly three places, per `App.tsx`'s own existing comment ("Marketing carries a display webfont and the motion library. The app must not pay for either"):
  1. **Hero entrance** (`Hero.tsx`, marketing-only, already lazy-loaded): a real `motion`-driven staggered fade/slide-up on eyebrow, headline, subhead, and the drop zone, respecting `useReducedMotion`. This is the only file importing `motion` in the whole app.
  2. **Route transitions** (`AppLayout.tsx`): a plain CSS cross-fade (`.route-fade` in `globals.css`), keyed on `location.pathname`, not the `motion` library — the app shell must not pay for a dependency that belongs to the marketing chunk.
  3. **Answer feedback** (`AnswerFeedback.tsx`): upgraded from the generic `.motion-enter` keyframe to a dedicated `.answer-feedback-enter` keyframe with a small overshoot-then-settle, closer to spring physics, still plain CSS.
- Everything else (progress bars, accordions, dialogs) stays untouched and CSS-only.

**Verified**
- Typecheck, lint, full test suite (34 tests), and build all green. Marketing's lazy chunk grew to carry `motion` (~45 KB gzipped) as expected; the app's initial entry chunk is unchanged at ~87.5 KB gzipped, still well under the 300 KB CI budget.

## 2026-07-30 — Frontend built: marketing page and full app shell

**Done**
- Scaffolded Vite + React 19 + TypeScript (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) + Tailwind v4.
- Built `src/styles/tokens.css` from [DESIGN-SYSTEM.md](02-DESIGN/DESIGN-SYSTEM.md), plus the new marketing tokens (`--ink`, `--mark`, `--paper`).
- ESLint layer boundaries wired from the first commit. They caught five real violations during the build, all fixed by routing through hooks.
- Marketing page at `/`: nine sections, working drop zone in the hero, scroll-driven amber thread, real cost table.
- Every app route built: library, parse, document hub, quiz, flashcards, review, chat, exam, dashboard, settings.
- Real PDF text extraction via `pdfjs-dist` with page numbers and bookmark outlines; page-range fallback when no outline exists. Real Dexie persistence on the v1 schema.
- FSRS scheduling through `ts-fsrs`, with the resulting interval shown on each rating button.
- Mock generation in `src/ai/client.ts`. On the sample document it serves hand-written questions; on a real upload it builds genuinely grounded fill-in-the-blank and true/false questions from the user's own sentences, citing real pages.
- All copy in `src/copy/`, taken verbatim from [CONTENT-AND-COPY-GUIDE.md](02-DESIGN/CONTENT-AND-COPY-GUIDE.md) where it existed.
- Print stylesheet for exams. `_headers` with the CSP from [SECURITY-AND-PRIVACY.md](04-OPERATIONS/SECURITY-AND-PRIVACY.md), including a hash for the inline theme script. CI with typecheck, lint, test, build, key scan, payment-language scan, bundle budget, and an axe sweep.

**Decisions**

| Area | Decision | Recorded in |
|---|---|---|
| Visual direction | Expressive marketing page, calm app, one codebase | [ADR-0008](08-DECISIONS/ADR-0008-TWO-VISUAL-REGISTERS.md) |
| Citation styling | Promoted from muted 12px caption to an amber tappable chip | [DESIGN-SYSTEM.md](02-DESIGN/DESIGN-SYSTEM.md) |
| Charts | Hand-written SVG. `recharts` never installed. | [OPEN-QUESTIONS.md](06-PLANNING/OPEN-QUESTIONS.md) Q1 |
| Animation | CSS `animation-timeline`, no library. `motion` installed, found unnecessary, removed. GSAP rejected on licensing. | [TECH-STACK.md](03-ARCHITECTURE/TECH-STACK.md) |
| Typography | Newsreader variable serif, self-hosted, marketing route only | [ADR-0008](08-DECISIONS/ADR-0008-TWO-VISUAL-REGISTERS.md) |

**Verified**
- Typecheck, lint, and 9 unit tests green.
- axe-core clean across all 10 routes at 390px and 1280px, with no horizontal scroll at 320px.
- A real PDF uploaded through the hero drop zone, parsed, stored, and quizzed end to end.
- Initial bundle 87 KB gzipped against a 300 KB budget. `pdfjs` (108 KB gz) lazy-loads only for PDFs. Marketing CSS and font are in their own chunk.

**Bugs found and fixed during the build**
- `getSettings()` wrote a default row inside a `useLiveQuery`, which Dexie runs in a read-only transaction. Split the read from the seed.
- StrictMode double-invoked the parse effect, and a destructive `takePendingFile()` left the second pass with no file. Now peeks and clears once parsing settles.
- Quiz silently returned three questions when ten were asked for. Now says how many were left out and why.

**Status**
Marketing page and full app shell working on mock generation. Milestones 0, 2, 3, 5, 6, 8, 9, and 11 are substantially covered; Milestone 4 (the proxy) is not started.

**Next action**
Milestone 4: write `functions/api/generate.ts`, the quota counters, and the grounding validator, then point `src/ai/client.ts` at it.

**Blockers**
None for coding. Three things cannot be verified from this environment and remain open: printing an exam on actual paper, real-device testing on Android and iOS, and the Gemini daily request figure.

**Not yet built**
`.pptx`, `.docx`, and `.epub` parsing (Milestone 7); the Milestone 1 parsing refinements (multi-column clustering, hyphen rejoining, running-header stripping, scan detection); BM25 retrieval; explanations at three depths; Anki and Quizlet export; the service worker and offline support; the streak mechanic.

---

## 2026-07-30 — Planning phase complete

**Done**
- Ran a full brainstorming session and locked eight foundational decisions (see table below).
- Verified free-tier facts for Gemini API, Cloudflare Pages, Vercel Hobby, Supabase, and OpenRouter against current public sources.
- Wrote the complete planning documentation set under `docs/` — product, design, architecture, operations, engineering, planning, open-source governance, and seven ADRs.
- Rewrote the root `README.md` as a real project README.

**Decisions locked**

| Area | Decision | Recorded in |
|---|---|---|
| AI provider | Google Gemini 2.5 Flash, free tier, single shared project key | [ADR-0002](08-DECISIONS/ADR-0002-SHARED-KEY-BEHIND-PROXY.md) |
| Key protection | Shared key held server-side in a Cloudflare Pages Function; per-IP daily quota; optional user-supplied key as escape hatch | [ADR-0002](08-DECISIONS/ADR-0002-SHARED-KEY-BEHIND-PROXY.md) |
| Storage | Local-first in the browser (IndexedDB). No accounts in v1. Cloud sync deferred to v2. | [ADR-0001](08-DECISIONS/ADR-0001-LOCAL-FIRST-STORAGE.md) |
| Hosting | Cloudflare Pages, not Vercel | [ADR-0003](08-DECISIONS/ADR-0003-CLOUDFLARE-PAGES-OVER-VERCEL.md) |
| Framework | Vite + React SPA, not Next.js | [ADR-0004](08-DECISIONS/ADR-0004-VITE-SPA-OVER-NEXTJS.md) |
| File parsing | Entirely in the browser | [ADR-0005](08-DECISIONS/ADR-0005-CLIENT-SIDE-PARSING.md) |
| Retrieval | Client-side BM25 keyword search, no embedding API | [ADR-0006](08-DECISIONS/ADR-0006-BM25-RETRIEVAL-NOT-EMBEDDINGS.md) |
| Mobile | Responsive installable PWA, not a native app | [ADR-0007](08-DECISIONS/ADR-0007-PWA-OVER-NATIVE.md) |
| Language | English only for v1, both UI and generated content | [NON-GOALS-AND-SCOPE.md](01-PRODUCT/NON-GOALS-AND-SCOPE.md) |
| Primary user | Student studying alone, close to an exam | [TARGET-USERS-AND-PERSONAS.md](01-PRODUCT/TARGET-USERS-AND-PERSONAS.md) |

**Notable finding during research**
Vercel's Hobby plan explicitly forbids commercial use and pauses the site when the bandwidth cap is hit. Cloudflare Pages permits commercial use and does not cap bandwidth. This flipped the hosting choice.

Supabase pauses free projects after seven days without a database request. For a study tool with bursty, exam-season usage, that is a serious failure mode. It is the main reason v1 stores everything locally instead.

**Status**
Planning done. No application code written yet.

**Next action**
Begin Milestone 0 in [BUILD-ORDER.md](06-PLANNING/BUILD-ORDER.md): scaffold the Vite + React + TypeScript + Tailwind project and get an empty page deploying to Cloudflare Pages.

**Blockers**
None. One item needs doing before launch, not before coding: confirm the current Gemini free-tier request-per-day figure against Google's official rate-limit page, since public sources disagree (see [ZERO-COST-INFRASTRUCTURE.md](04-OPERATIONS/ZERO-COST-INFRASTRUCTURE.md)).

---

## How to use this log

Add an entry whenever you finish a work session or make a decision worth remembering. Keep the shape consistent:

- **Done** — what actually got finished
- **Decisions** — what was decided and where it is recorded
- **Status** — where things stand right now
- **Next action** — the single next thing to do
- **Blockers** — what is stopping progress, or "None"

Do not commit this file together with feature code. Keep it in its own commit.
