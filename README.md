# ScholarForge AI

**Turn your notes into practice.**

Upload a PDF, slide deck, or book. Get quizzes, flashcards, plain-language explanations, and a full practice exam with an answer key.

Free forever. No account. Works on your phone. Open source.

> **Status: planning complete, code not started.** The full design lives in [`docs/`](docs/README.md). Build sequence in [BUILD-ORDER.md](docs/06-PLANNING/BUILD-ORDER.md).

---

## Why

You have a 200-page PDF and an exam on Thursday. Reading it again will not help. What helps is being asked questions, finding out what you do not know, and drilling that.

Making your own flashcards works, but it takes longer than the studying. Tools that automate it cost money, which is a real barrier for a student.

ScholarForge AI does the tedious part, for nothing.

## What it does

| Feature | What you get |
|---|---|
| **Upload** | PDF, PowerPoint, Word, EPUB, text, Markdown |
| **Quizzes** | Multiple choice, true/false, short answer, fill-in-the-blank — with instant feedback and a page citation |
| **Flashcards** | Auto-generated, editable, swipeable, with cloze deletion |
| **Explanations** | Any concept, at three depths from simple to exam-ready |
| **Exam generator** | A full practice exam plus a separate answer key, printable |
| **Spaced repetition** | Cards come back on a schedule based on what you forget |
| **Ask your document** | Chat with your file; answers cite exact page numbers |
| **Weak spots** | See what you keep failing and drill it in one tap |
| **Export** | Anki and Quizlet CSV, printable PDF, portable backup file |
| **Offline** | Install it, and everything except generating new content works with no connection |

## The principles

**Your files never leave your device.** Documents are parsed in your browser and stored in your browser. Nothing is uploaded. There is no account, no database, and no tracking.

**Nothing is invented.** Every question, answer, and explanation comes from your document and cites the page it came from. Anything we cannot trace to a real source is discarded before you see it. A study tool that hallucinates is worse than no tool.

**Free means free.** No subscription, no trial, no feature paywall, no ads. Not a launch promotion — a defining constraint. Every service in the stack sits inside a permanent free tier, documented with its actual limit.

**Phone first.** Designed for a thumb on a small screen, then expanded for desktop.

## Tech

| Layer | Choice |
|---|---|
| Frontend | Vite, React, TypeScript, Tailwind, shadcn/ui |
| Parsing | `pdfjs-dist`, `mammoth`, `jszip` — all in the browser |
| Storage | IndexedDB via Dexie |
| Scheduling | `ts-fsrs` |
| Retrieval | BM25, computed locally. No embeddings. |
| AI | Google Gemini 2.5 Flash, behind a Cloudflare Pages Function |
| Hosting | Cloudflare Pages |

Every dependency is MIT, Apache-2.0, BSD, or ISC. Nothing you fork inherits a licence trap.

The reasoning behind each choice is in [`docs/08-DECISIONS/`](docs/08-DECISIONS/DECISION-LOG.md).

## Running your own

Takes about twenty minutes and costs nothing. You need a GitHub account, a Cloudflare account, and a free Google AI Studio key.

Full walkthrough: [SELF-HOSTING-GUIDE.md](docs/07-OPEN-SOURCE/SELF-HOSTING-GUIDE.md).

Useful if you want your own API quota, if your school wants its own instance, or if you want to change how the questions are written.

## Contributing

```bash
git clone https://github.com/<owner>/ScholarForgeAI.git
cd ScholarForgeAI
npm install
cp .env.example .env
npm run dev
```

**No API key needed.** The app runs in mock mode by default, so you can build and test the entire interface without credentials.

First-time contributors are genuinely welcome. Start with [CONTRIBUTING.md](docs/07-OPEN-SOURCE/CONTRIBUTING.md), and look for issues labelled `good-first-issue`.

The most useful thing you can do: find a document that breaks the parser, then add it to `tests/fixtures/` with a test. Real-world files are where the real bugs are.

## Documentation

Everything is in [`docs/`](docs/README.md) — product, design, architecture, operations, engineering, planning, and the decision records.

Start with:

1. [PROJECT-OVERVIEW.md](docs/01-PRODUCT/PROJECT-OVERVIEW.md) — what and why
2. [FEATURES-SPECIFICATION.md](docs/01-PRODUCT/FEATURES-SPECIFICATION.md) — what it does
3. [ARCHITECTURE.md](docs/03-ARCHITECTURE/ARCHITECTURE.md) — how it works
4. [BUILD-ORDER.md](docs/06-PLANNING/BUILD-ORDER.md) — what gets built first

The planning is public, not just the code. If you disagree with a decision, the reasoning is there to argue with.

## Licence

See [LICENSE](LICENSE).

---

Built so that students who cannot pay for study tools do not have to go without them.
