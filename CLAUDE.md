# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Vite dev server (mock AI mode by default, no API key needed)
npm run build         # tsc -b (app) + tsc -p tsconfig.api.json (api/) + vite build
npm run typecheck     # both tsconfig projects, no emit
npm run lint          # eslint . (includes layer-boundary rules, see below)
npm run format        # prettier --write .
npm test              # vitest run
npm run test:watch    # vitest watch mode
```

Single test file: `npx vitest run src/domain/quiz/scoring.test.ts`
Single test by name: `npx vitest run -t "excludes flagged questions"`

No Playwright script in `package.json` yet; `tests/e2e/axe-audit.mjs` is run directly with `node`.

## Architecture

**The browser is the application; the server is a keyhole.** Parsing, storage, search, scheduling, and scoring all happen on-device. The only server code is `api/generate.ts`, a Vercel Node function whose sole job is to hold `GEMINI_API_KEY` somewhere the client can't read it, enforce quota, and validate that every generated item is grounded in a real page citation before it reaches the client.

### Layered `src/` structure — dependencies point one direction only

| Layer | May import | May never import (ESLint-enforced, `eslint.config.js`) |
|---|---|---|
| `ui/` | `domain/`, `hooks/`, `copy/` | `parsing/`, `persistence/`, `ai/` directly |
| `domain/` | other `domain/` modules only | `ui/`, `parsing/`, `persistence/`, `ai/`, `hooks/`, React |
| `parsing/` | `domain/` | `ui/`, `persistence/`, `ai/` |
| `persistence/` | `domain/` | `ui/`, `parsing/`, `ai/` |
| `ai/` | `domain/` | `ui/`, `parsing/`, `persistence/` |
| `hooks/` | everything | — (the only sanctioned bridge from UI to infrastructure) |

- `domain/` is pure logic, no I/O, no React — runs unchanged in Node. This is where scoring, FSRS scheduling, chunking, BM25, and grounding validation live, and where the test suite is densest.
- `parsing/` is the only place importing `pdfjs-dist`, `mammoth`, `jszip` — takes a `File`, returns a `ParsedDocument`. Runs in a Web Worker so a large PDF doesn't freeze the UI.
- `persistence/` owns Dexie/IndexedDB; nothing else touches the database directly.
- `ai/client.ts` is the only file that calls `fetch`; `ai/mock/` provides fixture responses for mock mode.
- Route pages live under `src/ui/pages/<route>/`, each self-contained with local `components/` and hooks; a component used by 2+ pages moves up to `src/ui/components/`.
- All user-facing copy lives in `src/copy/` — never hardcode a string in a component.

### Auth (recent addition, not yet reflected in most of `docs/03-ARCHITECTURE/`)

All `/app/*` routes are gated behind Firebase Google sign-in via `AuthGate` (`src/ui/components/AuthGate.tsx`) wrapped around `AppLayout`. This is a **UI gate, not a data-layer security boundary** — the real protection is `firestore.rules` (`backups/{uid}` restricted to its owner). IndexedDB via Dexie is still the only place study data is written by default; `backups/{uid}` is touched only when a signed-in user taps "Sync now" (manual push/pull, `useCloudSync`, built on `useAuthUser`). Preferences are the exception — `userSettings/{uid}` syncs live for every signed-in user via `useSettingsSync`, mounted in `AppLayout`. See [ADR-0011](docs/08-DECISIONS/ADR-0011-MANDATORY-GOOGLE-SIGN-IN.md), [ADR-0010](docs/08-DECISIONS/ADR-0010-OPTIONAL-CLOUD-SYNC.md), and [ADR-0015](docs/08-DECISIONS/ADR-0015-LIVE-SETTINGS-SYNC.md).

### Hosting reality vs. docs

The project is deployed on **Vercel** (`api/`, `@vercel/node`, `vercel.json`, Upstash Redis for quota counters), per [ADR-0009](docs/08-DECISIONS/ADR-0009-VERCEL-OVER-CLOUDFLARE-PAGES.md). A 2026-07-31 sweep brought every doc's hosting/infra prose (`ARCHITECTURE.md`, `PROJECT-STRUCTURE.md`, `TECH-STACK.md`, `AI-INTEGRATION.md`, `MONITORING-AND-LIMITS.md`, `CODING-STANDARDS.md`, `CONTRIBUTING.md`, and others) in line with the real Vercel/Upstash/Firebase stack; ADRs and `ACTIVITY-LOG.md`/`DECISION-LOG.md` were deliberately left untouched as point-in-time historical records. One known remaining gap: `AI-INTEGRATION.md`'s wire-protocol description (`task`, an `X-User-Key` header, a `quiz`/`flashcards`/`explain`/`exam`/`chat`/`expandQuery` task list) doesn't match `api/generate.ts`'s real shape (`kind`, an `apiKey` body field, `questions`/`cards`/`chat` only) — a pre-existing spec-vs-implementation drift, not a hosting issue, still open.

### Data flow — quiz generation

Domain layer picks a retrieval tier (whole document if it fits context, else BM25-selected chunks) → `ai/client.ts` POSTs `{ chunkId, text }` chunks to `/api/generate` (no file, no key) → function checks origin, quota, kill switch → assembles prompt + JSON schema → calls Gemini → **drops any item whose citation doesn't map back to a chunk it actually sent** → client shuffles answer positions (models have positional bias) → persisted via Dexie.

**Never crosses the network:** the original file, stored decks, quiz results, review schedules, progress history, any user identifier beyond what Firebase auth itself requires for sign-in.

**One exception, since [ADR-0015](docs/08-DECISIONS/ADR-0015-LIVE-SETTINGS-SYNC.md):** display preferences and the study streak sync automatically to `userSettings/{uid}` for every signed-in user, live via `onSnapshot` and without a button. No study content travels with them. Study data still moves only on a manual "Sync now."

## Conventions

- TypeScript strict, plus `noUncheckedIndexedAccess`. No `any`; narrow `unknown` instead. No enums — `as const` unions.
- Components: PascalCase, one per file, function declarations (no arrow consts, no default exports), target under 150 lines / ceiling 250. Props typed as `<Component>Props`.
- Domain modules target under 200 lines; hooks under 100.
- Comments: one line, explain *why* not *what*. No block comments, no emojis.
- Tailwind with semantic tokens only (`bg-surface`, never `bg-slate-100`).
- Errors are typed domain unions (`AppError`), never raw throws surfaced to the user; user copy comes from `src/copy/errors.ts`.
- Conventional Commits (`feat(quiz): ...`), one logical change per commit, docs/activity-log changes in separate commits from code. Full scope list and branch naming in [GIT-WORKFLOW.md](docs/05-ENGINEERING/GIT-WORKFLOW.md).

## Where to look first

- [docs/README.md](docs/README.md) — doc index
- [docs/03-ARCHITECTURE/ARCHITECTURE.md](docs/03-ARCHITECTURE/ARCHITECTURE.md) / [PROJECT-STRUCTURE.md](docs/03-ARCHITECTURE/PROJECT-STRUCTURE.md) — system design (note the Vercel caveat above)
- [docs/08-DECISIONS/DECISION-LOG.md](docs/08-DECISIONS/DECISION-LOG.md) — every ADR, why each call was made
- [docs/05-ENGINEERING/CODING-STANDARDS.md](docs/05-ENGINEERING/CODING-STANDARDS.md) — full conventions
- [docs/05-ENGINEERING/TESTING-STRATEGY.md](docs/05-ENGINEERING/TESTING-STRATEGY.md) — what's tested and why (parsing fixtures, migrations, and grounding validation get the most weight)
- [docs/ACTIVITY-LOG.md](docs/ACTIVITY-LOG.md) — current build state
