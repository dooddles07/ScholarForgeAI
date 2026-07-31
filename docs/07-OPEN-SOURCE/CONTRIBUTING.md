# Contributing

Purpose: how to get set up and how to help.
Last updated: 2026-07-31

Contributions are welcome, including from people who have never contributed to an open-source project before. That is a real audience for this project, not a courtesy.

## Setup

```bash
git clone https://github.com/<owner>/ScholarForgeAI.git
cd ScholarForgeAI
npm install
cp .env.example .env
npm run dev
```

That is it. **No API key needed.**

The app runs in mock AI mode by default, returning fixture responses from `src/ai/mock/`. You can build and test the entire interface — upload, quiz, flashcards, review, exam, chat — without credentials.

This is deliberate. Requiring an API key before someone can see the app run would stop most first-time contributors before they started.

### Working on real generation

Only needed if you are changing prompts or the proxy itself.

1. Get a free key from Google AI Studio
2. Put it in `.env` as `GEMINI_API_KEY`, along with an Upstash Redis database's REST credentials (see `.env.example`)
3. `npx vercel dev`

`api/` runs on Vercel's Node.js runtime, the same as any other Node code — no special tooling needed to reproduce it locally, unlike the Cloudflare Workers runtime this project used to target.

### Commands

```bash
npm run dev          # dev server, mock AI
npm run build        # production build
npm run typecheck    # TypeScript
npm run lint         # ESLint
npm test             # unit tests
node tests/e2e/axe-audit.mjs   # accessibility sweep, against a running preview build
```

## Read first

You do not need all of these. Match them to what you are doing.

| Doing what | Read |
|---|---|
| Anything | [PROJECT-OVERVIEW.md](../01-PRODUCT/PROJECT-OVERVIEW.md), [CODING-STANDARDS.md](../05-ENGINEERING/CODING-STANDARDS.md) |
| Interface work | [DESIGN-SYSTEM.md](../02-DESIGN/DESIGN-SYSTEM.md), [RESPONSIVE-AND-MOBILE.md](../02-DESIGN/RESPONSIVE-AND-MOBILE.md), [ACCESSIBILITY.md](../02-DESIGN/ACCESSIBILITY.md) |
| Any user-facing text | [CONTENT-AND-COPY-GUIDE.md](../02-DESIGN/CONTENT-AND-COPY-GUIDE.md) |
| Parsing | [DOCUMENT-PROCESSING.md](../03-ARCHITECTURE/DOCUMENT-PROCESSING.md) |
| Prompts or the proxy | [AI-INTEGRATION.md](../03-ARCHITECTURE/AI-INTEGRATION.md), [PROMPT-LIBRARY.md](../03-ARCHITECTURE/PROMPT-LIBRARY.md) |
| Storage | [DATA-MODEL.md](../03-ARCHITECTURE/DATA-MODEL.md) |
| Before opening a PR | [DEFINITION-OF-DONE.md](../05-ENGINEERING/DEFINITION-OF-DONE.md) |

The reasoning behind the technical choices is in [08-DECISIONS](../08-DECISIONS/DECISION-LOG.md). Worth reading before proposing a change to the stack, since the alternative was probably already considered.

## The five constraints

Every contribution has to satisfy all five. They are what make this project what it is.

1. **It costs nothing.** Any new dependency or service must be permanently free, with a named limit and a stated behaviour at that limit.
2. **It works on a cheap phone.** Mid-range Android on mobile data, not a flagship on wifi.
3. **It works without an account.** Nothing may assume a login.
4. **Generated content cites its source.** No exceptions. An uncited item is not shown.
5. **The words are kind.** Especially error messages. The user is a stressed student.

A change that breaks one of these will not be merged, however good it is otherwise. Not out of pedantry — each one is load-bearing for the product.

## Where to start

**Good first issues** are labelled. They are genuinely small and self-contained, not busywork.

Areas that are approachable without deep context:

| Area | Why it is approachable |
|---|---|
| Copy improvements | Needs good judgement about words, not codebase knowledge |
| Test fixtures | Add a real document that breaks parsing; extremely valuable |
| Accessibility fixes | Well-specified in [ACCESSIBILITY.md](../02-DESIGN/ACCESSIBILITY.md) |
| Empty and error states | Self-contained, clear requirements |
| Domain-layer tests | Pure functions, no mocks needed |
| Responsive fixes at 320px | Findable by resizing a window |

**The single most useful thing a new contributor can do** is upload a real document that breaks, then add it to `tests/fixtures/` with a test describing what should happen. Parsing failures on real-world files are our most common bug class, and they are only findable with real files.

## Making a change

1. Open or claim an issue first, so nobody duplicates work
2. Fork, then branch: `feat/<slug>` or `fix/<slug>`
3. Make the change, following the standards
4. Add tests
5. Run `npm run typecheck && npm run lint && npm test`
6. Check it at 360px and 1280px
7. Check it with the keyboard only
8. Open a pull request

Steps 6 and 7 take a minute each and catch the two most common review comments.

### Commits

Conventional Commits. Details in [GIT-WORKFLOW.md](../05-ENGINEERING/GIT-WORKFLOW.md).

```
feat(quiz): add per-topic breakdown to results
fix(parsing): rejoin words split by hyphenation
```

Keep documentation changes in separate commits from code changes.

### Pull requests

Include what changed and why, how you verified it, and screenshots at both viewports for interface changes.

If something is deliberately left out, say so. A pull request that names its own limits is easier to review than one that hides them.

## Review

Reviews aim to be quick and specific. Expect comments about:

- Layer boundaries, since they are easy to cross by accident
- Copy, checked against the guide
- Accessibility: keyboard, labels, contrast, focus
- Behaviour at 320px
- Whether a simpler version exists

A review comment is about the code, not about you. If a comment seems wrong, say so with reasoning — sometimes the reviewer is missing context, and that is worth knowing.

## Things that will be declined

Not to be discouraging, but to save you the work.

| Proposal | Why |
|---|---|
| Adding accounts or login | Deliberate decision. [ADR-0001](../08-DECISIONS/ADR-0001-LOCAL-FIRST-STORAGE.md) |
| Adding a paid service | Breaks the core constraint |
| Adding analytics | Conflicts with the privacy commitment |
| Migrating to Next.js | [ADR-0004](../08-DECISIONS/ADR-0004-VITE-SPA-OVER-NEXTJS.md) |
| Embedding-based retrieval | [ADR-0006](../08-DECISIONS/ADR-0006-BM25-RETRIEVAL-NOT-EMBEDDINGS.md) |
| Homework-answering features | Against the purpose of the product |
| A large dependency for a small job | Write the fifty lines instead |
| A GPL or AGPL dependency | Licence incompatibility for forks |

If you think one of these decisions is wrong, open an issue arguing the case rather than a pull request. Decisions do get revisited — but with a superseding ADR, not silently.

## Reporting a bug

Include: what you did, what you expected, what happened, your browser and device, and the document that triggered it if you can share it.

The document matters most for parsing bugs. If you cannot share it, describe how it was produced — which tool exported it, whether it is scanned, how many pages.

For a security issue, do not open a public issue. See `SECURITY.md`.

## Requesting a feature

Say what problem you are trying to solve rather than proposing a solution directly. Then check it against the five constraints. A request that already addresses those is far more likely to happen.

## Licence

Contributions are licensed under the project's licence. By opening a pull request you agree to that.

## Conduct

See [CODE-OF-CONDUCT.md](CODE-OF-CONDUCT.md).

## Thanks

This project exists so that students who cannot pay for study tools do not have to. If you help make it work better, you are helping with that.
