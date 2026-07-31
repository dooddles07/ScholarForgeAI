# ADR-0010 — Optional cloud sync via Firebase, additive to local-first

**Status:** Accepted
**Date:** 2026-07-31

## Context

[ADR-0001](ADR-0001-LOCAL-FIRST-STORAGE.md) scoped local-first storage explicitly as "no accounts in v1" — anticipating this could change later. The project owner wants the same user's study data to follow them across devices (phone and laptop), while keeping the app fully usable with no account for anyone who doesn't want that, and keeping it free indefinitely.

## Decision

**Firebase Authentication (Google sign-in) plus Firestore, opt-in, additive to the existing local-first default.** One Firestore document per user, `backups/{uid}`, holding the same JSON shape the existing file-based backup feature already produces (`BackupPayload`). Sync is a manual action — sign in to pull an existing backup, tap "Sync now" to push — not a real-time background process.

Chosen over Supabase specifically because Supabase's free tier pauses a project after about a week of inactivity, requiring a manual dashboard action to resume. A portfolio project with sporadic traffic would risk sync being silently broken for whoever visits after a quiet week. Firebase's Firestore free tier (Spark plan) does not pause on inactivity and stays available indefinitely within its daily quota (50K reads / 20K writes per day — far beyond this project's expected scale).

## Why

**Reuses real, already-tested code.** The sync payload is exactly `BackupPayload`; push and pull are thin wrappers around the existing `exportBackup()`/`importBackup()` functions built for file-based backup. No new data model, no schema-mapping work.

**No conflict-resolution engine to build.** Manual push/pull sidesteps the entire class of problems real-time bidirectional sync creates (conflicting edits on two devices, merge strategies, CRDTs). Whichever direction the user chose is simply what happens.

**Stays true to the local-first promise regardless of sign-in.** Signing out never touches local data — only the auth session. (Sign-in itself later became mandatory app-wide, see [ADR-0011](ADR-0011-MANDATORY-GOOGLE-SIGN-IN.md) — but the sync action described here, pushing/pulling a Firestore backup, remains a separate, manual, opt-in step even for a signed-in user.)

**Zero cost, long-term.** Firebase Spark plan, no credit card, no inactivity pause.

## Alternatives considered

### Supabase (Postgres + Auth)

**Rejected**, specifically because of the inactivity-pause behavior described above — real operational risk for a low-traffic portfolio site, in direct tension with the "long-term, free, low-maintenance" requirement that prompted this ADR.

### Real-time bidirectional sync

**Rejected for this version.** A genuinely hard problem (this is what dedicated offline-sync products exist to solve), and unnecessary for a single user moving between their own devices, who can tap a button when they actually want to sync.

### Fully normalized relational tables (one per Dexie table)

**Rejected for this version.** Would need real schema/migration work and per-table security rules for no benefit over a single JSON document, given there are no cross-user features (sharing, leaderboards) planned. Revisit if that changes.

## Consequences

### Easier

- A user's data now survives a lost or replaced device, if they chose to sync.
- Almost no new domain logic — the hard part (backup shape, merge-safe restore) was already built for the file-export feature.

### Harder

- A second external service to operate (Firebase project, alongside Vercel, Upstash, Google AI Studio) — still zero-cost, but one more dashboard to know about.
- Firestore's public client config key looks like a leaked secret to naive scanning (see the note in `.github/workflows/ci.yml`'s key-scan step) — anyone touching that CI step later needs to understand why it's still safe.
- **The production CSP had to be relaxed for every visitor, not just signed-in ones.** `vercel.json`'s `connect-src` now allows `https://identitytoolkit.googleapis.com` (Auth), `https://securetoken.googleapis.com` (token refresh), and `https://firestore.googleapis.com` (Firestore reads/writes); `script-src` now allows `https://apis.google.com` (the `gapi` redirect resolver `signInWithRedirect` loads); `frame-src` now allows `https://*.firebaseapp.com` (Firebase's default authDomain, used during the auth redirect). This is a measurable widening of a previously very tight CSP that applies to the whole site's response headers, accepted because the redirect-flow Auth chosen above (see "Why", redirect over popup) requires it — there is no way to scope a CSP header to only signed-in requests. If a custom Firebase authDomain is ever configured instead of the default `*.firebaseapp.com`, the `frame-src` entry in `vercel.json` must be updated to match, or sign-in will fail.

## Revisit if

Cross-user features are ever wanted (shared decks, a leaderboard) — that would need real per-entity tables and access rules, not a single JSON blob per user.
