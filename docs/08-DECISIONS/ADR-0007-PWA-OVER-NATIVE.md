# ADR-0007 — Ship an installable PWA rather than native apps

**Status:** Accepted
**Date:** 2026-07-30

## Context

The primary persona studies mainly on a phone. The product therefore has to feel like a phone app, not a website squeezed onto a small screen.

Three routes to that: a responsive progressive web app, a web app wrapped in Capacitor and submitted to the stores, or separate native or React Native applications.

The zero-cost constraint settles most of this immediately. **A Google Play developer account costs a one-time fee and an Apple Developer account costs an annual fee.** Both are unavoidable to list in the stores, and both break the constraint outright — the Apple fee particularly, because it recurs, meaning the project would go dark the year nobody pays it.

## Decision

**One responsive, installable progressive web app.** Mobile-first layout, service worker for offline use, web app manifest for home-screen installation. No store submissions.

## Why

**Zero cost, permanently.** No developer accounts, no annual fees, no review process.

**One codebase.** A solo maintainer with occasional contributors cannot keep three applications in agreement. Every feature would need building three times.

**Ship instantly.** A fix reaches every user on their next load. No review queue, no waiting a week for approval of a one-line bug fix, no users stranded on an old version.

**Installation still works.** A PWA installs to the home screen with its own icon, opens full screen without browser chrome, and runs offline. For this product the practical gap against a native app is small.

**Everything we need is available on the web platform.** File access via the file input, local storage via IndexedDB, offline via service worker, speech via the Web Speech API, printing via the print stylesheet. We need no camera, no push notifications, no background processing, no platform integration.

**No store policy risk.** App store review of AI-powered educational tools is inconsistent, and both stores have rejected apps for having user-supplied API keys. Sidestepping that entirely is worth something.

**Discoverable by link.** A student can send a URL to a friend and it works immediately, with no install step at all. That is a better sharing story than a store listing.

## Alternatives considered

### Capacitor wrap, submitted to the stores

**Rejected for v1, documented as a possible future.** Would reuse the same codebase, so the incremental effort is modest. But it needs both paid developer accounts, which breaks the core constraint. It also adds store review to the release process and native build tooling to the repository.

Recorded in [NON-GOALS-AND-SCOPE.md](../01-PRODUCT/NON-GOALS-AND-SCOPE.md) as revisitable if someone else wants to fund and maintain the listings.

### React Native or Expo

**Rejected.** A second codebase to build and maintain, still needs the paid accounts to ship, and gains us nothing the web platform does not already provide for this product.

### Responsive website with no PWA features

**Rejected.** Cheap to build but loses the two things that matter most to the persona: offline use, and a home-screen icon that makes the tool feel like something you own rather than a tab you have to find again.

## Consequences

### Easier

- Zero platform cost, forever
- One codebase, one test surface, one release
- Instant updates for everyone
- Shareable by link
- No store review or policy exposure
- Contributors need only web skills

### Harder

- **iOS PWA support lags.** Safari's PWA implementation is weaker than Android's: storage is more aggressively evicted, and some install affordances are less discoverable. Needs real testing on real iOS hardware, and an install hint that explains the Share-then-Add-to-Home-Screen path, since iOS gives no automatic prompt.
- **No store presence**, so no store search discovery. Accepted; discovery comes from the repository, from links, and from word of mouth.
- **Installation is less obvious to users** than a store button. Mitigated by prompting at the right moment, after a first completed quiz rather than on arrival.
- **Storage can be evicted** by the browser under pressure, particularly on iOS. This raises the importance of the export feature from [ADR-0001](ADR-0001-LOCAL-FIRST-STORAGE.md) from convenient to necessary.
- **No push notifications on all platforms**, so study reminders cannot be relied upon. We do not build reminder notifications in v1.

### Things we must build because of this decision

- A web app manifest with a full icon set
- A service worker caching the app shell and stored content
- A contextual install prompt, shown after engagement and permanently dismissible
- Platform-specific install instructions for iOS, since there is no automatic prompt
- Storage-eviction resilience, with export prompting after significant work
- Real-device testing on both Android and iOS, not emulators

Implementation detail in [OFFLINE-AND-PWA.md](../03-ARCHITECTURE/OFFLINE-AND-PWA.md).

## Revisit if

A funded party wants store listings, or a required capability turns out to be genuinely unavailable on the web platform.
