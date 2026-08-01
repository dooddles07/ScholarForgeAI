# ScholarForge AI

**Turn your notes into practice.**

Upload a PDF, slide deck, or book. Get quizzes, flashcards, plain-language explanations, and a full
practice exam with an answer key.

Free forever. Sign in with Google. Works on your phone. Open source.

> **Status:** the interface is built, and questions come from a real model behind a server-side
> proxy ([`api/generate.ts`](api/generate.ts)) so nobody has to set anything up. Upload a PDF and it
> is genuinely parsed, stored, and quizzed, entirely in your browser — only the extracted text is
> ever sent anywhere, and only to generate what you asked for.
>
> Working: marketing page, library, upload and parsing (PDF, `.pptx`, `.docx`, `.epub`, text),
> document hub, quizzes, flashcards with spaced repetition, ask-your-document, printable exams,
> streaks, progress, settings, cloud sync, offline install, backup and Anki/Quizlet export.
> Not yet: three-depth explanations.

## Why

You have a 200-page PDF and an exam on Thursday. Reading it again will not help. What helps is
being asked questions, finding out what you do not know, and drilling that.

Making your own flashcards works, but it takes longer than the studying. Tools that automate it
cost money, which is a real barrier for a student. ScholarForge AI does the tedious part, for
nothing.

## What it does

| Feature               | What you get                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| **Upload**            | PDF, PowerPoint, Word, EPUB, text, Markdown                                                    |
| **Quizzes**           | Multiple choice, true/false, short answer, fill-in-the-blank — instant feedback, page citation |
| **Flashcards**        | Auto-generated, editable, swipeable, with cloze deletion                                       |
| **Explanations**      | Any concept, at three depths from simple to exam-ready                                         |
| **Exam generator**    | A full practice exam plus a separate answer key, printable                                     |
| **Spaced repetition** | Cards come back on a schedule based on what you forget                                         |
| **Ask your document** | Chat with your file; answers cite exact page numbers                                           |
| **Weak spots**        | See what you keep failing and drill it in one tap                                              |
| **Export**            | Anki and Quizlet CSV, printable PDF, portable backup file                                      |
| **Offline**           | Install it, and everything except generating new content works with no connection              |

## The principles

**Your files never leave your device.** Documents are parsed in your browser and stored in your
browser. Only the extracted text needed for a specific request is ever sent anywhere. Your study
data reaches the cloud only if you tap "Sync now"; your display preferences and study streak sync
automatically once you are signed in.

**Nothing is invented.** Every question, answer, and explanation comes from your document and cites
the page it came from. Anything we cannot trace to a real source is discarded before you see it. A
study tool that hallucinates is worse than no tool.

**Free means free.** No subscription, no trial, no feature paywall, no ads. Not a launch promotion
— a defining constraint. Every service in the stack sits inside a permanent free tier.

**Phone first.** Designed for a thumb on a small screen, then expanded for desktop.

## Tech

| Layer         | Choice                                                |
| ------------- | ----------------------------------------------------- |
| Frontend      | Vite, React, TypeScript, Tailwind, shadcn/ui          |
| Parsing       | `pdfjs-dist`, `mammoth`, `jszip` — all in the browser |
| Storage       | IndexedDB via Dexie                                   |
| Scheduling    | `ts-fsrs`                                             |
| Retrieval     | BM25, computed locally. No embeddings.                |
| AI            | Groq `gpt-oss-120b`, behind a Vercel Node Function    |
| Auth and sync | Firebase Auth and Firestore                           |
| Hosting       | Vercel, with Upstash Redis for quota counters         |

Every dependency is MIT, Apache-2.0, BSD, or ISC. Nothing you fork inherits a licence trap.

## Contributing

```bash
git clone https://github.com/<owner>/ScholarForgeAI.git
cd ScholarForgeAI
npm install
cp .env.example .env
npm run dev
```

Set `VITE_MOCK_AI=true` in `.env` to run on fixtures with **no API key needed**, so you can build
and test the entire interface without credentials. Leave it `false` to exercise the real pipeline.

```bash
npm run dev          # Vite dev server
npm run build        # tsc (app + api) then vite build
npm run typecheck
npm run lint
npm run format
npm test             # vitest run
npm run test:watch
npm run test:a11y    # axe sweep, needs a preview server on 5180
```

First-time contributors are genuinely welcome. The most useful thing you can do: find a document
that breaks the parser, then add it to `tests/fixtures/` with a test. Real-world files are where
the real bugs are.

Conventions are in [docs/RULES.md](docs/RULES.md).

## Running your own

About twenty minutes, and it costs nothing. You need a GitHub account, a Vercel account, an Upstash
account, a Groq API key, and a Firebase project. No licence fees, no usage fees, no expiring trial.

Vercel's Hobby tier prohibits commercial use, so a tutoring service or school charging for access
would need Vercel Pro. Free personal or non-commercial instances are unaffected.

### 1. Fork the repository

### 2. Get a Groq API key

At [console.groq.com](https://console.groq.com), create a key. **Check the current rate limits in
the console** — both requests/day and tokens/minute. Write them down; you need them in step 5, and
they are the one number you should not guess, since published figures vary and change.

### 3. Create an Upstash Redis database

At [upstash.com](https://upstash.com), create a free database and copy its REST URL and REST token.

### 4. Create a Firebase project

Firebase is **required**, not optional — every `/app` route is behind Google sign-in.

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. Add a Web app (Project settings → General → Your apps) and copy the six config values.
3. Enable Google sign-in: Authentication → Sign-in method → Google → Enable.
4. **Add your deployment's domain to Authorized domains** (Authentication → Settings). Add every
   domain you will sign in from, including Preview URLs. Skipping this is the most common Firebase
   setup mistake: sign-in fails with `auth/unauthorized-domain` on any domain not listed.
5. Create a Firestore database — production mode is fine, the rules lock it down.
6. Deploy the rules: `firebase deploy --only firestore:rules`. Not optional. `userSettings/{uid}`
   syncs preferences for every signed-in user, and without deployed rules every write is denied.
7. **Provision Firebase's auth handler by deploying once to Firebase Hosting.** Firebase serves its
   sign-in helper at `https://<project>.firebaseapp.com/__/auth/handler` and only provisions that
   path once something has been deployed to Hosting. Because this app is served from Vercel,
   Hosting is otherwise never initialised, those paths 404, and sign-in fails with no useful error:

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting     # any empty public dir; no to SPA rewrite and GitHub deploys
   firebase deploy --only hosting
   ```

### 5. Create a Vercel project

Import your fork. Framework preset Vite, build command `npm run build`, output directory `dist`,
Node 20. `api/generate.ts` deploys automatically as a Node Function — deliberately not an Edge
Function, since Vercel's Edge runtime has a hard 25s ceiling this project hit in production.

Set these for both Production and Preview:

| Variable                   | Type       | Value                                                                                                                                        |
| -------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `GROQ_API_KEY`             | **Secret** | Your key from step 2                                                                                                                         |
| `GROQ_MODEL`               | Plain      | `openai/gpt-oss-120b`. Only the gpt-oss models support the strict JSON schema this app depends on — llama, qwen, and compound all reject it. |
| `DAILY_GLOBAL_LIMIT`       | Plain      | Below your real daily limit                                                                                                                  |
| `DAILY_IP_LIMIT`           | Plain      | Per-user daily allowance                                                                                                                     |
| `ALLOWED_ORIGIN`           | Plain      | Your deployed origin. **Unset means the origin check is skipped entirely.**                                                                  |
| `IP_HASH_SALT`             | **Secret** | Any random string                                                                                                                            |
| `UPSTASH_REDIS_REST_URL`   | Plain      | From step 3                                                                                                                                  |
| `UPSTASH_REDIS_REST_TOKEN` | **Secret** | From step 3                                                                                                                                  |
| `VITE_FIREBASE_*` (six)    | Plain      | From step 4. Public client config, not credentials.                                                                                          |
| `VITE_MOCK_AI`             | Plain      | `false`                                                                                                                                      |

`GROQ_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`, and `IP_HASH_SALT` must be Secrets. Plain variables are
readable in the dashboard and can appear in logs. This is the one thing in the setup you must not
get wrong.

### 6. Deploy and verify

- [ ] The landing page loads and Google sign-in works
- [ ] A PDF uploads and parses
- [ ] A quiz generates with page citations
- [ ] **Search the deployed JavaScript for your API key.** It must not be there.
- [ ] Go offline and reload; the app still opens
- [ ] Install it to a phone home screen

The key check is the one that matters. Do it by actually searching the deployed bundle, not by
assuming.

### Picking your limits

| Situation       | Guidance                                                                                                               |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Just you        | Set both high; you cannot realistically drain your own quota                                                           |
| A class of 30   | Divide your daily limit generously. Students on one school network may share an IP, so lean high.                      |
| Public instance | Set `DAILY_IP_LIMIT` modestly. There is no bring-your-own-key fallback, so the global ceiling is your only protection. |

The shared-NAT problem is real for schools: an entire campus may appear as one address and share one
bucket. Set `DAILY_IP_LIMIT` high and let the global ceiling do the actual protecting.

### Operating it

A **kill switch** lives in Upstash: set the `killswitch` key to stop all generation in seconds
without a deployment. Use it for a suspected key compromise or an implausible traffic spike, then
revoke and rotate the key.

Watch two counters, both in Upstash: daily global requests, and per-IP requests. If the global
counter is consistently maxed out early, raise the ceiling toward the provider's real limit or add
a fallback provider — the answer is never to buy capacity.

## Documentation

| Document                                | Covers                                                      |
| --------------------------------------- | ----------------------------------------------------------- |
| [PRD.md](docs/PRD.md)                   | What the product is, who for, and the acceptance criteria   |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | How it is built, and why each major decision was made       |
| [SCHEMA.md](docs/SCHEMA.md)             | The database, the types, and what syncs                     |
| [DESIGN.md](docs/DESIGN.md)             | Tokens, screens, responsive rules, accessibility, copy      |
| [RULES.md](docs/RULES.md)               | Coding standards, testing, git workflow, definition of done |
| [SECURITY.md](docs/SECURITY.md)         | Privacy posture, threat model, rate limiting, CSP           |
| [ACTIVITY-LOG.md](docs/ACTIVITY-LOG.md) | What has been done, and where things stand                  |
| [CHANGELOG.md](CHANGELOG.md)            | Released changes                                            |

The planning is public, not just the code. If you disagree with a decision, the reasoning is there
to argue with.

## Licence

MIT. See [MIT.md](MIT.md).

---

Built so that students who cannot pay for study tools do not have to go without them.
