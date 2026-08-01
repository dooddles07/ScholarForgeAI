# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Vite dev server (calls the real proxy unless VITE_MOCK_AI=true)
npm run build         # tsc -b (app) + tsc -p tsconfig.api.json (api/) + vite build
npm run typecheck     # both tsconfig projects, no emit
npm run lint          # eslint . (includes layer-boundary rules, see below)
npm run format        # prettier --write .
npm test              # vitest run
npm run test:watch    # vitest watch mode
npm run test:a11y     # axe sweep; needs a preview server on 5180
```

Single test file: `npx vitest run src/domain/quiz/scoring.test.ts`
Single test by name: `npx vitest run -t "excludes flagged questions"`

## Architecture

**The browser is the application; the server is a keyhole.** Parsing, storage, search, scheduling,
and scoring all happen on-device. The only server code is `api/generate.ts`, a Vercel Node function
whose sole job is to hold `GROQ_API_KEY` somewhere the client can't read it, enforce quota, and
validate that every generated item is grounded in a real page citation before it reaches the client.

### Layered `src/` structure — dependencies point one direction only

| Layer          | May import                   | May never import (ESLint-enforced, `eslint.config.js`)    |
| -------------- | ---------------------------- | --------------------------------------------------------- |
| `ui/`          | `domain/`, `hooks/`, `copy/` | `parsing/`, `persistence/`, `ai/` directly                |
| `domain/`      | other `domain/` modules only | `ui/`, `parsing/`, `persistence/`, `ai/`, `hooks/`, React |
| `parsing/`     | `domain/`                    | `ui/`, `persistence/`, `ai/`                              |
| `persistence/` | `domain/`                    | `ui/`, `parsing/`, `ai/`                                  |
| `ai/`          | `domain/`                    | `ui/`, `parsing/`, `persistence/`                         |
| `hooks/`       | everything                   | — (the only sanctioned bridge from UI to infrastructure)  |

Test files (`**/*.test.{ts,tsx}`) are exempt from the import restriction: a test asserting that a
control persisted has to read the database to do it.

- `domain/` is pure logic, no I/O, no React — runs unchanged in Node. Scoring, FSRS scheduling,
  chunking, BM25, grounding validation, and the settings merge rules live here, and the test suite
  is densest here.
- `parsing/` is the only place importing `pdfjs-dist`, `mammoth`, `jszip` — takes a `File`, returns
  a `ParsedDocument`. Runs in a Web Worker so a large PDF doesn't freeze the UI.
- `persistence/` owns Dexie/IndexedDB and the Firestore sync modules; nothing else touches storage.
- `ai/client.ts` is the only file that calls `fetch`; `ai/mock/` provides fixture responses.
- Route pages live under `src/ui/pages/<route>/`, each self-contained with local `components/`; a
  component used by 2+ pages moves up to `src/ui/components/`.
- All user-facing copy lives in `src/copy/` — never hardcode a string in a component.
- `api/_lib/grounding.ts` is pure and tested: it drops any item whose `chunkId` doesn't match a
  chunk we actually sent, and takes page numbers from our own data rather than a model claim.

### Auth and sync

All `/app/*` routes are gated behind Firebase Google sign-in via `AuthGate`, wrapped around
`AppLayout`. This is a **UI gate, not a data-layer security boundary** — the real protection is
`firestore.rules`.

IndexedDB via Dexie is the only place study data is written by default; `backups/{uid}` is touched
only when a signed-in user taps "Sync now" (`useCloudSync`). **Preferences are the exception** —
`userSettings/{uid}` syncs live for every signed-in user via `useSettingsSync`, mounted in
`AppLayout` alongside `useAppearance`. No study content travels with them.

### Environment

`VITE_MOCK_AI=true` serves fixtures and needs no credentials; anything else calls the real proxy,
dev included. `VITE_MOCK_FAILURE` forces an error code (or `UNGROUNDED`) so failure states are
reachable in mock mode. `VITE_FIREBASE_AUTH_EMULATOR_HOST` is set only by the CI accessibility job.

`ALLOWED_ORIGIN` unset means the origin check is skipped entirely, so it must be set in production.

### Data flow — quiz generation

Domain picks a retrieval tier (whole document if it fits context, else BM25-selected chunks) →
`ai/client.ts` POSTs `{ kind, chunks, ... }` to `/api/generate` (no file, no key) → function checks
origin, quota, kill switch → assembles prompt + JSON schema → calls Groq → **drops any item whose
citation doesn't map back to a chunk it actually sent** → client shuffles answer positions (models
have positional bias) → persisted via Dexie.

**Never crosses the network:** the original file, and any study content the user hasn't chosen to
sync.

## Conventions

- TypeScript strict, plus `noUncheckedIndexedAccess`. No `any`; narrow `unknown` instead. No enums
  — `as const` unions.
- Components: PascalCase, one per file, function declarations (no arrow consts, no default
  exports), target under 150 lines / ceiling 250. Props typed as `<Component>Props`.
- Domain modules target under 200 lines; hooks under 100.
- Comments: one line, explain _why_ not _what_. No block comments, no emojis.
- Tailwind with semantic tokens only (`bg-surface`, never `bg-slate-100`).
- Errors are typed domain unions, never raw throws surfaced to the user; user copy comes from
  `src/copy/errors.ts`.
- Conventional Commits (`feat(quiz): ...`), one logical change per commit.

## Documentation

Eight documents in `docs/`, plus `README.md` and `MIT.md` at the root. There are no other
documentation files, and new ones should not be created — extend the relevant document instead.

| Document                                     | Covers                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| [docs/PRD.md](docs/PRD.md)                   | What the product is, who for, acceptance criteria, what's out of scope |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How it's built, the wire format, and why each major decision was made  |
| [docs/SCHEMA.md](docs/SCHEMA.md)             | Dexie tables, types, what syncs to Firestore, migrations               |
| [docs/DESIGN.md](docs/DESIGN.md)             | Tokens, components, responsive rules, accessibility, copy rules        |
| [docs/RULES.md](docs/RULES.md)               | Coding standards, testing strategy, git workflow, definition of done   |
| [docs/SECURITY.md](docs/SECURITY.md)         | Privacy posture, threat model, rate limiting, CSP                      |
| [docs/ACTIVITY-LOG.md](docs/ACTIVITY-LOG.md) | Running record of work and current state                               |
| [docs/CHANGELOG.md](docs/CHANGELOG.md)       | Released, user-facing changes                                          |

`ACTIVITY-LOG.md` is a point-in-time record: entries describe what was true when written and are
not edited afterwards, so some reference documents that have since been consolidated away.
