# Decision Log

Purpose: index of every architecture decision record, so the reasoning behind the stack is findable.
Last updated: 2026-07-30

An ADR captures one decision: what we chose, what we rejected, and why. ADRs are not edited after acceptance. If a decision changes, write a new ADR that supersedes the old one and mark the old one Superseded.

## Index

| ADR | Decision | Status | Date |
|---|---|---|---|
| [ADR-0001](ADR-0001-LOCAL-FIRST-STORAGE.md) | Store everything in the browser; no accounts in v1 | Accepted | 2026-07-30 |
| [ADR-0002](ADR-0002-SHARED-KEY-BEHIND-PROXY.md) | One shared AI key, held server-side behind a proxy | Accepted | 2026-07-30 |
| [ADR-0003](ADR-0003-CLOUDFLARE-PAGES-OVER-VERCEL.md) | Host on Cloudflare Pages rather than Vercel | Superseded by ADR-0009 | 2026-07-30 |
| [ADR-0004](ADR-0004-VITE-SPA-OVER-NEXTJS.md) | Build a Vite React SPA rather than a Next.js app | Accepted | 2026-07-30 |
| [ADR-0005](ADR-0005-CLIENT-SIDE-PARSING.md) | Parse all document formats in the browser | Accepted | 2026-07-30 |
| [ADR-0006](ADR-0006-BM25-RETRIEVAL-NOT-EMBEDDINGS.md) | Use client-side BM25 retrieval, not vector embeddings | Accepted | 2026-07-30 |
| [ADR-0007](ADR-0007-PWA-OVER-NATIVE.md) | Ship an installable PWA rather than native apps | Accepted | 2026-07-30 |
| [ADR-0008](ADR-0008-TWO-VISUAL-REGISTERS.md) | Expressive marketing page, calm app, one codebase | Accepted | 2026-07-30 |
| [ADR-0009](ADR-0009-VERCEL-OVER-CLOUDFLARE-PAGES.md) | Host on Vercel rather than Cloudflare Pages | Accepted | 2026-07-30 |
| [ADR-0010](ADR-0010-OPTIONAL-CLOUD-SYNC.md) | Optional cloud sync via Firebase, additive to local-first | Accepted | 2026-07-31 |

## Format

Every ADR uses the same five sections:

- **Status** — Proposed, Accepted, Superseded, or Rejected
- **Context** — the situation and constraints that forced a choice
- **Decision** — what we are doing, stated plainly
- **Alternatives considered** — what else was on the table and why it lost
- **Consequences** — what this makes easy, what it makes hard, and what we will have to live with

## Writing a new one

Copy the structure from any existing ADR. Number sequentially. Filename in capitals: `ADR-NNNN-SHORT-TITLE.md`. Add a row to the table above. Record the decision in [ACTIVITY-LOG.md](../ACTIVITY-LOG.md) too.
