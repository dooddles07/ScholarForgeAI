# ADR-0001 — Local-first storage, no accounts in v1

**Status:** Superseded by [ADR-0011](ADR-0011-MANDATORY-GOOGLE-SIGN-IN.md) (the "no accounts" part only — local-first storage itself is unchanged)
**Date:** 2026-07-30

## Context

The app needs to store uploaded documents, generated flashcard decks, quiz results, review schedules, and progress history. Three constraints shape where that data can live:

1. **Zero cost, permanently.** Not trial credits. A free tier that stays free.
2. **No signup friction.** The primary persona abandons tools that ask for an account before showing value (see [TARGET-USERS-AND-PERSONAS.md](../01-PRODUCT/TARGET-USERS-AND-PERSONAS.md)).
3. **Students uploading coursework** should not have to trust a solo-maintained project with their files.

The obvious managed option is Supabase, whose free tier includes a 500 MB Postgres database, 1 GB of file storage, 5 GB of egress, and 50,000 monthly active users. Generous on paper.

The problem is the pause behaviour. Supabase automatically pauses a free project that receives no database requests for seven consecutive days, and it stays down until someone manually unpauses it from the dashboard. Study-tool traffic is bursty and seasonal: heavy for an exam week, then silent for a month. That pattern triggers the pause reliably, and it triggers it precisely when a student returns for the next exam.

The free tier also caps you at two active projects, which means no separate staging environment without paying.

## Decision

**All user data lives in the browser.** IndexedDB via Dexie, no server-side storage, no accounts, no login in v1.

Cross-device movement is handled by explicit export and import of a portable `.json` study pack, not by automatic sync.

The app tells users plainly that their data is local to that browser, and prompts an export after meaningful work so nobody loses a month of review history to a cleared cache.

Cloud sync, behind an optional account, is deferred to v2 and only if users actually ask for it. See [ROADMAP.md](../06-PLANNING/ROADMAP.md).

## Alternatives considered

### Supabase accounts from day one

**Rejected.** The seven-day inactivity pause is disqualifying for seasonal usage. Beyond that, it forces a signup wall onto the primary flow, makes us the data controller for student coursework with the privacy obligations that implies, and consumes both free-tier project slots so there is no staging environment.

### Local storage with no export at all

**Rejected.** Too fragile. Browser storage can be cleared by the user, by a cleanup utility, or by the browser itself under storage pressure. Losing weeks of spaced-repetition scheduling with no recovery path is unacceptable, and export costs almost nothing to build.

### Hybrid from the start: local primary, optional cloud sync

**Rejected for v1, kept for v2.** This is probably the right end state, but building both storage paths at once means designing a conflict-resolution strategy before we have a single user. It doubles the surface area of the riskiest part of the app for a benefit nobody has requested yet.

### `localStorage` instead of IndexedDB

**Rejected.** `localStorage` is synchronous, which blocks the main thread, and is limited to roughly 5–10 MB. Parsed document text alone will exceed that. IndexedDB is asynchronous and effectively bounded only by disk quota.

## Consequences

### Easier

- Genuinely zero cost for storage, with no ceiling to monitor
- No signup, so the first-visit flow is as short as it can be
- Uploaded documents never leave the device, which makes the privacy claim simple and true
- Full offline capability comes almost for free, since the data is already local
- No GDPR data-subject obligations, because we hold no personal data
- No database to migrate, back up, monitor, or unpause

### Harder

- No automatic cross-device sync. Export and import is a manual step, and we have to make it discoverable enough that people actually use it.
- Data is lost if browser storage is cleared. Mitigated by prompting exports, not eliminated.
- No server-side history, so we cannot help a user recover anything.
- Storage quota varies by browser and device, so we need a quota-pressure warning at around 80% full.
- Private browsing mode gives ephemeral storage. The app must detect this and warn.

### Things we must build because of this decision

- A storage-quota monitor with a warning state
- Export and import as first-class, discoverable features, not buried in settings
- A first-run explanation that data is local to this browser
- Private-browsing detection with a clear warning
- A "delete everything" control, since there is no account deletion to fall back on

## Revisit if

Users are actively requesting sync, and export/import is demonstrably not covering the need. At that point write a superseding ADR covering the account model, the conflict-resolution strategy, and how the inactivity pause will be handled.
