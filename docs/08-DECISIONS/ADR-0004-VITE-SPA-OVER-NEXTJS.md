# ADR-0004 — Build a Vite React SPA rather than a Next.js app

**Status:** Accepted
**Date:** 2026-07-30

## Context

We need a frontend framework. Next.js is the default choice for React projects in 2026, so the burden of proof is on choosing something else.

What the app actually is, though, matters more than what is fashionable. Given [ADR-0001](ADR-0001-LOCAL-FIRST-STORAGE.md) and [ADR-0005](ADR-0005-CLIENT-SIDE-PARSING.md), ScholarForge AI is an offline-capable, local-first application with exactly one server endpoint. There is no user-specific server-rendered content, because there are no user accounts and no server-side data. There is nothing to render on a server.

## Decision

**Vite + React + TypeScript, built as a static single-page app**, deployed to Cloudflare Pages alongside one Pages Function.

Routing via React Router. Styling via Tailwind CSS with shadcn/ui components. PWA behaviour via `vite-plugin-pwa`.

## Why

**There is nothing to server-render.** Next.js earns its complexity through server components, server-side rendering, data fetching on the server, and incremental static regeneration. We use none of it. Every screen depends on data that exists only in the user's browser.

**The app must work offline.** A client-rendered SPA with a service worker is the natural shape for offline-first. Getting robust offline behaviour out of a framework built around server rendering is working against the grain.

**Cloudflare deployment is simpler.** Static output plus a function is precisely what Cloudflare Pages is designed to serve. Next.js on Cloudflare needs an adapter and brings edge-runtime caveats. Every layer of adaptation is a layer where a student contributor gets stuck.

**Smaller bundle and faster builds.** We have a hard target of under 300 KB gzipped for the initial bundle, on the assumption of a mid-range phone on metered data. Vite ships less framework by default.

**Lower barrier for contributors.** A Vite React app is close to plain React. Understanding it does not require knowing which of several rendering modes a given file runs in. For the student-contributor persona in [TARGET-USERS-AND-PERSONAS.md](../01-PRODUCT/TARGET-USERS-AND-PERSONAS.md), this is a real advantage.

**SEO does not apply.** The only page worth indexing is the landing page. That can be pre-rendered as static HTML in the built output. Nothing behind the upload step should be indexed, since it is all local user data.

## Alternatives considered

### Next.js

**Rejected.** We would pay for server rendering, server components, and a routing model built around them, and use none of it. It complicates Cloudflare deployment, complicates offline support, and raises the contribution barrier. Next.js is the right answer for a content or commerce site with server-side data. This is neither.

### SvelteKit

**Rejected, though it was genuinely close.** Smaller bundles, excellent developer experience, first-class Cloudflare adapter. It loses on ecosystem: the document-parsing libraries we depend on and the component libraries we want are React-first, and the pool of contributors who can pick up a React codebase is considerably larger.

### Plain React with no build step

**Rejected.** No TypeScript, no tree shaking, no code splitting. We need lazy loading for the parser libraries specifically, since loading a PDF parser for a user who uploads a `.txt` file would be wasteful.

### Astro with React islands

**Rejected.** Excellent for content-heavy sites with sprinkles of interactivity. Ours is the opposite: a lightly-marketed application that is almost entirely interactive.

## Consequences

### Easier

- Simple mental model: it is a React app, and it runs in the browser
- Straightforward offline support with `vite-plugin-pwa`
- Fast builds, which matters against Cloudflare's 500 builds per month
- Trivial deployment: build to static files, upload, done
- Smaller bundle, which serves the mid-range-phone target
- Lazy-loading the parsers is a natural fit with Vite's dynamic imports

### Harder

- No server rendering available if we ever want it
- Routing, data fetching, and code splitting are decisions we make rather than conventions we inherit. This is manageable but must be documented in [PROJECT-STRUCTURE.md](../03-ARCHITECTURE/PROJECT-STRUCTURE.md).
- The landing page needs deliberate pre-rendering for SEO rather than getting it free
- Some React tooling assumes Next.js and will need adapting

### Things we must build because of this decision

- A pre-rendered static landing page in the build output
- An explicit code-splitting strategy, with parsers loaded on demand
- A documented routing structure, since there is no file-system convention to lean on

## Revisit if

We find ourselves needing server-rendered, user-specific pages. That would only follow from adding accounts, which is a v2 question tied to [ADR-0001](ADR-0001-LOCAL-FIRST-STORAGE.md).
