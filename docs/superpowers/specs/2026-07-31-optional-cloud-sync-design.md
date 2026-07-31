# Optional Cloud Sync — Design

Purpose: let a user carry their documents, decks, quizzes, and progress between devices, without weakening the app's local-first default for anyone who doesn't want that.
Status: Approved by project owner, 2026-07-31. Not yet implemented.

## Context

ScholarForge AI is local-first by design ([ADR-0001](../../08-DECISIONS/ADR-0001-LOCAL-FIRST-STORAGE.md)): everything lives in the browser's IndexedDB, no accounts, no server-side data. That ADR scoped itself explicitly as "no accounts in v1" — this design is the v2 extension it anticipated, not a reversal of it.

The project owner wants long-term, cross-device access to their own study data (same user, phone and laptop), while keeping the app free forever and keeping "no account needed to use it" true for every visitor who doesn't want sync.

## Goals

- A signed-in user's data (documents, decks, cards, quizzes, attempts, exams, conversations, review log) is available on any device they sign into.
- Signing in is entirely optional. The app works exactly as it does today for anyone who never touches it.
- Zero cost, indefinitely, at portfolio-project traffic levels — no service that pauses on inactivity, no credit card required.
- No new dependency loaded into the app's initial bundle for people who never sign in.

## Non-goals (for this version)

- Real-time sync between two open tabs/devices. Sync is an explicit user action (sign in, or tap "Sync now"), not a live background process.
- Conflict resolution beyond "the version you push replaces the version in the cloud, the version you pull replaces your local copy after you confirm." No merge-by-field, no CRDTs.
- Sharing data between different users (decks, study sets). This is single-user sync, not collaboration.
- Migrating the local storage model itself. IndexedDB via Dexie remains the source of truth on-device; the cloud is a backup/relay, not a second live database the app queries directly.

## Provider choice: Firebase (Auth + Firestore), not Supabase

Both are free-tier and pair naturally with Google sign-in. Firebase Firestore's Spark (free) plan does not pause on inactivity — it stays available indefinitely within its daily quota (50K reads / 20K writes / 20K deletes per day), which is enormous headroom for portfolio-scale traffic. Supabase's free tier pauses a project after about a week of no activity, requiring a manual un-pause from the dashboard — a real long-term maintenance burden for a site with sporadic visitors, and directly in tension with the "long-term, low-maintenance, free" requirement. Firestore's document-store shape is also a natural fit here, since the sync payload is one JSON blob per user rather than normalized relational rows.

## Architecture

**One Firestore collection: `backups`, one document per user, keyed by Firebase Auth UID (`backups/{uid}`).** The document holds exactly the shape `src/domain/export/backup.ts` already defines as `BackupPayload` (version, exportedAt, documents, studySets, decks, cards, quizzes, attempts, exams, conversations, reviewLog) — no new schema to design, no per-entity table mapping.

**Firestore security rule:**
```
match /backups/{uid} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```
Enforced at the database level: a signed-in user can only ever touch their own document, regardless of app-code bugs.

**Auth: Google sign-in only, via `signInWithRedirect`, not `signInWithPopup`.** Redirect is more reliable on mobile browsers (popup blockers, Safari quirks), matching the project's phone-first principle.

## Sync flow

1. **Sign in** (Settings → new "Sync across devices" section → "Sign in with Google"): Firebase Auth redirect flow. On return, we have a UID.
2. **Check for an existing backup**: read `backups/{uid}`.
   - Exists → show "Found a backup from `<date>`. Restore it here?" [Restore] [Not now]. Restore calls the existing `importBackup()` — the same non-destructive `bulkPut` merge already used for file-based backup restore, so nothing local is ever wiped by a sync pull.
   - Doesn't exist → show "Signed in. Nothing synced yet — tap Sync now to back up this device."
3. **"Sync now"** (visible whenever signed in): calls the existing `exportBackup()`, writes the payload to `backups/{uid}`, overwriting whatever was there. Shows a "Last synced `<time>`" line afterward.
4. **Sign out**: clears the Firebase Auth session only. Local IndexedDB data is never touched by sign-out.

No automatic background sync in this version — every push and pull is a deliberate tap, which sidesteps needing any conflict-resolution logic at all: whichever direction the user chose is simply what happens.

## UI changes

- `SettingsPage.tsx`: new group "Sync across devices", sitting near the existing "Your data" backup export/import group (same page, related concept, distinct mechanism — file-based backup stays as-is for people who want a local file rather than an account).
- New copy needed (extend `src/copy/labels.ts`'s `settings` object, following the existing pattern): sign-in button label, "found a backup" prompt, restore/skip actions, "last synced" label, sign-out label.
- Firebase SDK (`firebase/app`, `firebase/auth`, `firebase/firestore` — the modular, tree-shakeable imports) is dynamically imported only when the Sync section is opened or "Sign in" is tapped, the same lazy-loading pattern already used for `pdfjs-dist`/`jszip`/`mammoth`. It must never appear in the app's main entry chunk.

## Data model changes

- `Settings` (in `src/domain/types.ts`) gains a `lastSyncedAt: number | null` field, tracked separately from the existing `lastExportAt` (file export and cloud sync are different actions worth showing separately in the UI).
- No changes to any other domain type. The sync payload reuses `BackupPayload` exactly as it exists today.

## Error handling

- Offline: the Sync section shows the existing offline messaging pattern (see `OfflineBanner.tsx`/`copy/labels.ts`'s `offline` object) and disables Sign in/Sync now rather than letting them fail confusingly.
- Firestore read/write failure: an honest inline error (reuse the pattern in `src/lib/generation-error.ts` — a small message, not a stack trace), and critically, a failed sync never touches local data. Local storage is unaffected by any cloud failure in either direction.

## Documentation

A new ADR (next number after ADR-0009, so ADR-0010) records this decision: optional cloud sync via Firebase, additive to the local-first default from ADR-0001, not a replacement for it. Written during implementation, not as part of this spec.

## Testing

- Unit: the existing backup/restore merge logic already has coverage (`src/domain/export/backup.test.ts`); extend if the sync wrapper adds any new branching (e.g. the "existing backup found" check).
- Manual: sign in on two separate browser profiles (simulating two devices) with the same Google account — push from one, pull on the other, confirm the data appears; confirm signing out never deletes anything locally; confirm the app is fully usable with no sign-in at all, exactly as today.

## Open questions / risks

- Firestore document size limit is 1 MiB. A very large study history (many documents/cards/attempts) could theoretically approach that. Not a concern at expected portfolio-project scale, but worth a size check before writing if this becomes a real product with heavy users — out of scope to solve now.
- `google-services`/Firebase config values (API key, project ID, etc.) are not secret in the traditional sense (Firebase's client config is meant to be public, security is enforced by the Firestore rules above, not by hiding the config) — but this should be called out explicitly in the implementation so nobody mistakenly treats it like `GEMINI_API_KEY` and tries to hide it server-side unnecessarily.
