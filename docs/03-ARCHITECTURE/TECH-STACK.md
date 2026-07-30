# Tech Stack

Purpose: every dependency, why it is here, its licence, and proof it costs nothing.
Last updated: 2026-07-30

## Rules for adding a dependency

A new dependency must clear all five:

1. **Permissive licence** — MIT, Apache-2.0, BSD, or ISC. No GPL, no AGPL, no source-available licences with usage restrictions.
2. **Free forever** — not a trial, not credit-limited.
3. **Actively maintained** — a release within the last twelve months.
4. **Justified** — replacing it with fifty lines of our own code would be worse.
5. **Reasonable size** — and if it is large, it must be lazy-loadable.

When in doubt, write the fifty lines.

## Core

| Package | Purpose | Licence | Cost |
|---|---|---|---|
| `react` | UI | MIT | Free |
| `react-dom` | DOM rendering | MIT | Free |
| `typescript` | Types | Apache-2.0 | Free |
| `vite` | Build and dev server | MIT | Free |
| `react-router` | Client routing | MIT | Free |

**Why React** — largest contributor pool, and the parsing and component ecosystems we need are React-first. See [ADR-0004](../08-DECISIONS/ADR-0004-VITE-SPA-OVER-NEXTJS.md).

**Why Vite over Next.js** — nothing to server-render, simpler Cloudflare deployment, smaller bundle, lower contribution barrier. Same ADR.

**Why TypeScript** — the data model has a lot of shapes (documents, chunks, questions, cards, schedules) and passing them between four layers without types would be needlessly painful. It also makes model responses safer to handle.

## Styling and components

| Package | Purpose | Licence | Cost |
|---|---|---|---|
| `tailwindcss` | Styling | MIT | Free |
| `shadcn/ui` | Component patterns | MIT | Free |
| `@radix-ui/*` | Accessible primitives | MIT | Free |
| `lucide-react` | Icons | ISC | Free |

**Why Tailwind** — responsive variants make the mobile-first requirement mechanical rather than a series of media-query decisions, and there is no runtime cost.

**Why shadcn/ui** — it is not a dependency in the usual sense; components are copied into the repository and owned by us. Nothing to version-bump, and every component is editable. Built on Radix, which gives correct keyboard behaviour, focus management, and ARIA semantics for dialogs, menus, and tabs. Getting those right by hand is where accessibility projects usually fail.

**Why Radix specifically** — [ACCESSIBILITY.md](../02-DESIGN/ACCESSIBILITY.md) commits us to WCAG 2.2 AA. Hand-rolled dialogs and comboboxes almost never meet it.

## Document parsing

All lazy-loaded. A user uploading a `.txt` file downloads none of this.

| Package | Format | Licence | Approx. size | Cost |
|---|---|---|---|---|
| `pdfjs-dist` | PDF | Apache-2.0 | Large | Free |
| `mammoth` | DOCX | BSD-2-Clause | Medium | Free |
| `jszip` | PPTX, EPUB containers | MIT | Small | Free |

`pdfjs-dist` is Mozilla's engine, the same one Firefox ships. Nothing else comes close for reliability across real-world PDFs.

PPTX and EPUB have no good client-side library, so we unzip with `jszip` and read the XML or HTML ourselves. Both formats are zip archives with predictable internal structure, so this is a modest amount of code rather than a project. Detail in [DOCUMENT-PROCESSING.md](DOCUMENT-PROCESSING.md).

Legacy `.doc` and `.ppt` are not supported. They are pre-XML binary formats with no viable client-side parser, and both are rare enough now that the cost is not worth it.

## Storage

| Package | Purpose | Licence | Cost |
|---|---|---|---|
| `dexie` | IndexedDB wrapper | Apache-2.0 | Free |

**Why Dexie rather than raw IndexedDB** — the native API is callback-based and unpleasant enough that hand-written wrappers reliably contain bugs. Dexie gives promises, typed tables, and a real schema-migration mechanism, which we will need the first time the data model changes after release.

**Why not `localStorage`** — synchronous, so it blocks the main thread, and capped at a few megabytes. Parsed document text exceeds that on its own.

## Learning algorithm

| Package | Purpose | Licence | Cost |
|---|---|---|---|
| `ts-fsrs` | Spaced-repetition scheduling | MIT | Free |

FSRS is the current best-evidenced scheduling algorithm, and it outperforms the older SM-2 at equivalent review load. A maintained MIT TypeScript implementation already exists, and reimplementing a scheduling algorithm incorrectly would directly damage the product's core value. This is exactly the case where a dependency beats writing it ourselves.

Runs entirely on the device.

## PWA

| Package | Purpose | Licence | Cost |
|---|---|---|---|
| `vite-plugin-pwa` | Service worker and manifest | MIT | Free |
| `workbox-*` | Caching strategies | MIT | Free |

Hand-writing a service worker is a known source of subtle, hard-to-debug caching bugs, including the classic case of users being permanently stuck on a stale version. Workbox handles the lifecycle correctly.

## Charts

| Package | Purpose | Licence | Cost |
|---|---|---|---|
| `recharts` | Dashboard charts | MIT | Free |

Under review. The dashboard needs one accuracy-trend line chart and one per-topic bar chart. That may be cheaper as hand-written SVG than as a charting library, given the bundle target. Decision deferred to implementation, recorded in [OPEN-QUESTIONS.md](../06-PLANNING/OPEN-QUESTIONS.md). If `recharts` is kept, it is lazy-loaded with the dashboard route.

## Testing

| Package | Purpose | Licence | Cost |
|---|---|---|---|
| `vitest` | Unit tests | MIT | Free |
| `@testing-library/react` | Component tests | MIT | Free |
| `playwright` | End-to-end | Apache-2.0 | Free |
| `fake-indexeddb` | Persistence tests | Apache-2.0 | Free |
| `axe-core` | Accessibility checks | MPL-2.0 | Free |

`axe-core` is MPL-2.0, which is weak copyleft, but it is a development dependency only and never ships in the bundle, so there is no licence implication for the product.

## Hosting and services

| Service | Purpose | Free tier | Cost |
|---|---|---|---|
| Cloudflare Pages | Static hosting | Unlimited bandwidth, unlimited sites, 500 builds/month, commercial use permitted | $0 |
| Cloudflare Pages Functions | AI proxy | Approx. 100,000 requests/day | $0 |
| Cloudflare Workers KV | Quota counters | Free tier read/write allowance | $0 |
| Google Gemini API | Generation | Free tier, no card required | $0 |
| GitHub | Repository, issues | Free for public repositories | $0 |
| GitHub Actions | CI | 2,000 minutes/month on public repos | $0 |

Limits, and what degrades when each is reached, in [ZERO-COST-INFRASTRUCTURE.md](../04-OPERATIONS/ZERO-COST-INFRASTRUCTURE.md).

**Why Cloudflare rather than Vercel** — Vercel's Hobby tier prohibits commercial use and pauses the site at the bandwidth cap. See [ADR-0003](../08-DECISIONS/ADR-0003-CLOUDFLARE-PAGES-OVER-VERCEL.md).

**Why Gemini** — free tier without a credit card, a context window large enough to send whole documents (which removes the need for embedding infrastructure entirely), and native structured JSON output, which makes parsing generated quizzes reliable rather than best-effort. See [ADR-0002](../08-DECISIONS/ADR-0002-SHARED-KEY-BEHIND-PROXY.md).

## Browser APIs used instead of dependencies

Each of these replaces a library we would otherwise have shipped:

| API | Replaces | Used for |
|---|---|---|
| Web Speech API | A TTS library or paid service | Read-aloud |
| Web Workers | — | Off-main-thread parsing |
| IndexedDB | A backend database | All storage |
| Service Worker | — | Offline |
| `window.print` + print CSS | A PDF generation library | Exam and answer-key export |
| File API | An upload library | File reading |
| `Intl` | A date formatting library | Dates, times, quota reset in local time |
| CSS `prefers-color-scheme` | A theme library | Dark mode |
| CSS `prefers-reduced-motion` | — | Motion accessibility |

The print-to-PDF choice is worth calling out: generating PDFs client-side would mean shipping a large library, and the browser already does it well. Detail in [FEATURES-SPECIFICATION.md](../01-PRODUCT/FEATURES-SPECIFICATION.md).

## Deliberately not used

| Not using | Why |
|---|---|
| Next.js | Nothing to server-render; complicates Cloudflare deploy. [ADR-0004](../08-DECISIONS/ADR-0004-VITE-SPA-OVER-NEXTJS.md) |
| Supabase / Firebase | No accounts in v1; free tiers pause or cap. [ADR-0001](../08-DECISIONS/ADR-0001-LOCAL-FIRST-STORAGE.md) |
| A vector database | No embeddings at all. [ADR-0006](../08-DECISIONS/ADR-0006-BM25-RETRIEVAL-NOT-EMBEDDINGS.md) |
| LangChain / LlamaIndex | Heavy abstraction over what is, for us, one fetch call with a JSON schema |
| Redux / Zustand / Jotai | React state plus Dexie's live queries cover it. Revisit only if it actually hurts. |
| An analytics SDK | Conflicts with the privacy commitment. [SUCCESS-METRICS.md](../01-PRODUCT/SUCCESS-METRICS.md) |
| A component library like MUI | Too large, too opinionated, harder to make distinctive |
| `axios` | `fetch` is native and sufficient |
| `moment` / `date-fns` | `Intl` covers our formatting needs |
| An i18n framework | English only in v1, though strings are centralised so it can be added later |
| An OCR library | Scanned documents out of scope for v1. [ADR-0005](../08-DECISIONS/ADR-0005-CLIENT-SIDE-PARSING.md) |

## Licence compatibility

Every shipped dependency is MIT, Apache-2.0, BSD, or ISC. All are compatible with a permissive project licence and none impose obligations on downstream users beyond attribution. `axe-core`'s MPL-2.0 applies to development tooling only.

This matters because we are explicitly encouraging forks, including by schools. Anyone forking this repository inherits no licence trap.

Verify with `npx license-checker --summary` before each release, per [DEFINITION-OF-DONE.md](../05-ENGINEERING/DEFINITION-OF-DONE.md).
