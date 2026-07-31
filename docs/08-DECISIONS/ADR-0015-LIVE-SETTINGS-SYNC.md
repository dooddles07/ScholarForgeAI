# ADR-0015 — Preferences sync live in their own document, separate from the backup blob

**Status:** Accepted
**Date:** 2026-07-31
**Extends:** [ADR-0010](ADR-0010-OPTIONAL-CLOUD-SYNC.md) (manual push/pull of study data is unchanged)

## Context

[ADR-0010](ADR-0010-OPTIONAL-CLOUD-SYNC.md) put cloud sync behind a manual "Sync now" button and deliberately excluded the `settings` table from the backup payload. The comment in `src/persistence/backup.ts` justified that exclusion on the grounds that settings held "the user's own API key" and a key should never travel inside a shareable file.

That reason stopped being true when [ADR-0014](ADR-0014-REMOVE-BRING-YOUR-OWN-KEY.md) deleted `Settings.userApiKey`. The exclusion outlived it, so the Settings screen kept promising "pick it up on another device" while theme, reading mode, cards-per-day, and the entire study streak stayed on the device that set them. Signing in on a second device and restoring a backup produced a library full of work and a set of default preferences.

The owner asked for preferences that are live across devices, not merely included in the next manual sync.

## Decision

**Preferences sync continuously through their own Firestore document, `userSettings/{uid}`, watched with `onSnapshot`.** Study data keeps ADR-0010's manual model at `backups/{uid}`; only preferences became live.

The split matters. `backups/{uid}` holds every parsed page of every upload — attaching a listener to it would re-download the whole corpus to learn that a toggle moved, and it is already close to Firestore's 1 MB per-document ceiling. A preferences document is a few hundred bytes.

Which fields travel is a deliberate subset (`SYNCED_SETTINGS_KEYS` in `src/domain/settings/synced.ts`): theme, reading mode, reduce motion, cards-per-day, focus timer, and the three streak fields. Left behind are `lastSyncedAt`, `lastExportAt`, and `hasSeenLocalDataWarning` — these describe *this browser's* history, and syncing them would make "Last synced 2 minutes ago" appear on a device that has never synced.

Conflicts settle by last-write-wins on a client `updatedAt` stamp, applied in the pure `mergeSettings` function.

Dexie remains the source of truth. A toggle writes locally first and the network follows, so the UI never waits on a round trip. Firestore's `persistentLocalCache` queues writes made offline and flushes them on reconnect.

## Alternatives considered

**Include settings in the existing backup payload and stop there.** One line of work, no new collection. Rejected because preferences would stay stale until the user remembered to press a button — the complaint that prompted this. Settings *were* added to the backup payload as well (`BACKUP_VERSION` 2), but as a second path, not the only one.

**Listen on `backups/{uid}` directly.** No new collection, no second document to reason about. Rejected on cost: every listener wake re-downloads the entire study corpus.

**Server timestamps instead of a client clock.** More correct in principle. Rejected because `serverTimestamp()` resolves to a `Timestamp` the client cannot compare against a locally stored number without a re-read, which complicates the merge for a conflict that requires the same user editing preferences on two devices within seconds of each other.

## Consequences

### Every signed-in user now downloads the Firestore SDK

This is the real cost. ADR-0010 kept Firestore in its own chunk precisely so that the majority who never sync would not pay for it, and `src/lib/firestore.ts` still carries the comment explaining that split. A live listener mounted in `AppLayout` means the ~137 KB gzipped chunk now loads on every signed-in route.

Mitigated, not eliminated: the listener starts on `requestIdleCallback` with a 2 s timeout, so it never competes with first paint. A preference arriving a second late costs nothing.

### Clock skew can misorder near-simultaneous edits

Last-write-wins on a client clock means a device with a badly wrong clock can win a conflict it should have lost. The blast radius is one preference value, correctable by setting it again.

### Security rules now validate shape, not just ownership

`userSettings/{uid}` restricts the key set and range-checks `dailyCardLimit`, because the client-side clamp ships in the browser and anyone can skip it. The same pass added a 1 MB size cap to `backups/{uid}`, which previously accepted an arbitrarily large document from any authenticated user.

### Easier

- Preferences behave the way users already assume an account-backed app behaves.
- The streak survives a device change, which was the loss most likely to be felt.
- `mergeSettings`, `pickSynced`, and the clamp are pure domain functions, so the conflict rule is unit-tested without touching Firestore.

## Revisit if

Firestore read costs from the listener become material, or preference conflicts turn out to be common enough that client-clock ordering visibly misbehaves. The upgrade path is server timestamps plus a re-read on write.
