# Activity Log

Purpose: running record of work done, decisions made, and where things stand. Read this first if you lose context.
Last updated: 2026-07-30

Newest entries at the top.

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
