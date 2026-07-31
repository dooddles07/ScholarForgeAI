# Optional Cloud Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in user carry their documents/decks/quizzes/progress between devices via Firebase (Google sign-in + Firestore), without requiring sign-in for anyone who doesn't want it.

**Architecture:** One Firestore document per user (`backups/{uid}`) holding the exact JSON shape the app's existing file-based backup already uses. Sync is a manual push/pull, not real-time — reuses `exportBackup()`/`importBackup()` from `src/persistence/backup.ts` unchanged. Firebase's SDK is only pulled into the bundle via dynamic `import()`, never a static import reachable from the app's main entry chunk.

**Tech Stack:** Firebase JS SDK v9+ (modular: `firebase/app`, `firebase/auth`, `firebase/firestore`), React 19, Vite 6, Vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-31-optional-cloud-sync-design.md` — read it before starting if anything below is unclear.
- Zero cost, indefinitely: Firebase Spark (free) plan only, no credit card.
- Firebase SDK must never appear in the app's main entry chunk (`dist/assets/index-*.js`) — verify with a build after the feature is wired in.
- Signing out must never delete or modify local IndexedDB data. Only clears the Firebase Auth session.
- No comments except where the *why* is non-obvious (project convention, see `CLAUDE.md`). One-liner max.
- All copy strings live in `src/copy/labels.ts`'s `settings` object, following the file's existing pattern — never inline JSX strings.
- Run `npm run typecheck && npm run lint && npm test && npm run build` before every commit.
- This repo's existing tests never render React components or test hooks directly — only domain/persistence logic gets unit tests. Follow that pattern; UI and hook behavior are manually verified in a browser.

---

### Task 1: Firebase project config plumbing and lazy-loadable client module

**Files:**
- Create: `src/lib/firebase.ts`
- Modify: `src/vite-env.d.ts`
- Modify: `.env.example`
- Modify: `package.json` (add `firebase` dependency)

**Interfaces:**
- Produces: `firebaseAuth(): Auth`, `firestore(): Firestore`, `googleProvider: GoogleAuthProvider` — all exported from `src/lib/firebase.ts`. Later tasks reach these only via `await import('@/lib/firebase')`, never a static import.

- [ ] **Step 1: Install the Firebase SDK**

Run: `npm install firebase`

- [ ] **Step 2: Add Firebase env var types**

Edit `src/vite-env.d.ts` to:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 3: Write the lazy Firebase client module**

Create `src/lib/firebase.ts`:

```typescript
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

/*
 * This file is only ever reached via a dynamic import() from src/hooks/use-cloud-sync.ts, never
 * a static import — that keeps the whole Firebase SDK out of the app's main bundle for the
 * majority of visitors who never open Settings' sync section.
 *
 * The config values below are Firebase's public client identifiers, not secrets: Firebase's own
 * security model expects them to be visible in the bundle and enforces access control via
 * Firestore's security rules instead (see firestore.rules). This is a different trust model from
 * GEMINI_API_KEY, which must never appear in any client bundle.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;

function firebaseApp(): FirebaseApp {
  if (!app) app = initializeApp(config);
  return app;
}

export function firebaseAuth(): Auth {
  return getAuth(firebaseApp());
}

export function firestore(): Firestore {
  return getFirestore(firebaseApp());
}

export const googleProvider = new GoogleAuthProvider();
```

- [ ] **Step 4: Document the env vars**

Edit `.env.example`, appending at the end:

```
# Firebase (optional cloud sync). Public client config, not secret -- see src/lib/firebase.ts.
# Get these from Firebase Console -> Project settings -> General -> Your apps -> Web app.
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

- [ ] **Step 5: Typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: both succeed. The build succeeds even with empty env var values (Firebase just won't connect, which is fine — nothing calls `firebaseAuth()`/`firestore()` yet).

- [ ] **Step 6: Confirm firebase.ts is not in the main bundle**

Run: `grep -rl "firebase/app\|FirebaseApp" dist/assets/index-*.js`
Expected: no match (empty output, or the command reports no files found). If it matches, something is statically importing `src/lib/firebase.ts` from the main entry — stop and find it before continuing.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/firebase.ts src/vite-env.d.ts .env.example
git commit -m "feat(sync): add lazy-loadable Firebase client module"
```

---

### Task 2: `Settings.lastSyncedAt` field

**Files:**
- Modify: `src/domain/types.ts:192-207` (the `Settings` interface)
- Modify: `src/persistence/db.ts:45-59` (`DEFAULT_SETTINGS`)

**Interfaces:**
- Produces: `Settings.lastSyncedAt: number | null` — read by the UI in Task 5, written by the sync hook in Task 4.

- [ ] **Step 1: Add the field to the type**

In `src/domain/types.ts`, inside the `Settings` interface, add after `lastExportAt: number | null;`:

```typescript
  lastSyncedAt: number | null;
```

- [ ] **Step 2: Add the default value**

In `src/persistence/db.ts`, inside `DEFAULT_SETTINGS`, add after `lastExportAt: null,`:

```typescript
  lastSyncedAt: null,
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: passes. (If any other file constructs a full `Settings` object as a literal rather than via `DEFAULT_SETTINGS`, this step will surface it — there shouldn't be one, but this is the check that would catch it.)

- [ ] **Step 4: Commit**

```bash
git add src/domain/types.ts src/persistence/db.ts
git commit -m "feat(sync): add Settings.lastSyncedAt field"
```

---

### Task 3: Cloud read/write functions, with tests

**Files:**
- Create: `src/persistence/sync.ts`
- Test: `src/persistence/sync.test.ts`

**Interfaces:**
- Consumes: `firestore()` from `@/lib/firebase` (Task 1); `BackupPayload`, `isBackupPayload` from `@/domain/export/backup` (already exist).
- Produces: `pushBackupToCloud(uid: string, payload: BackupPayload): Promise<void>`, `pullBackupFromCloud(uid: string): Promise<BackupPayload | null>` — consumed by the hook in Task 4.

- [ ] **Step 1: Write the failing tests**

Create `src/persistence/sync.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { BackupPayload } from '@/domain/export/backup';

const mockDoc = vi.fn(() => 'doc-ref');
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
}));

vi.mock('@/lib/firebase', () => ({
  firestore: () => 'fake-firestore',
}));

const { pullBackupFromCloud, pushBackupToCloud } = await import('./sync');

const payload: BackupPayload = {
  version: 1,
  exportedAt: 0,
  documents: [],
  studySets: [],
  decks: [],
  cards: [],
  quizzes: [],
  attempts: [],
  exams: [],
  conversations: [],
  reviewLog: [],
};

beforeEach(() => {
  mockDoc.mockClear();
  mockGetDoc.mockReset();
  mockSetDoc.mockReset();
});

describe('pushBackupToCloud', () => {
  it('writes the payload to backups/{uid}', async () => {
    await pushBackupToCloud('user-1', payload);
    expect(mockDoc).toHaveBeenCalledWith('fake-firestore', 'backups', 'user-1');
    expect(mockSetDoc).toHaveBeenCalledWith('doc-ref', payload);
  });
});

describe('pullBackupFromCloud', () => {
  it('returns null when no backup document exists', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    expect(await pullBackupFromCloud('user-1')).toBeNull();
  });

  it('returns the payload when a valid backup exists', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => payload });
    expect(await pullBackupFromCloud('user-1')).toEqual(payload);
  });

  it('returns null when the stored document is not a valid backup shape', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ nonsense: true }) });
    expect(await pullBackupFromCloud('user-1')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/persistence/sync.test.ts`
Expected: FAIL — `Failed to resolve import "./sync"` (the file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/persistence/sync.ts`:

```typescript
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { isBackupPayload, type BackupPayload } from '@/domain/export/backup';

function backupDocRef(uid: string) {
  return doc(firestore(), 'backups', uid);
}

export async function pushBackupToCloud(uid: string, payload: BackupPayload): Promise<void> {
  await setDoc(backupDocRef(uid), payload);
}

export async function pullBackupFromCloud(uid: string): Promise<BackupPayload | null> {
  const snapshot = await getDoc(backupDocRef(uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return isBackupPayload(data) ? data : null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/persistence/sync.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Full typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add src/persistence/sync.ts src/persistence/sync.test.ts
git commit -m "feat(sync): add Firestore push/pull backup functions"
```

---

### Task 4: `useCloudSync` hook

**Files:**
- Create: `src/hooks/use-cloud-sync.ts`

**Interfaces:**
- Consumes: `exportBackup`, `importBackup` from `@/persistence/backup` (existing); `updateSettings` from `@/persistence/settings` (existing); dynamically imports `@/lib/firebase` (Task 1) and `@/persistence/sync` (Task 3) and the `firebase/auth` package at point of use, never statically.
- Produces: `useCloudSync()` returning `{ status: CloudSyncStatus; email: string | null; signIn(): Promise<void>; signOut(): Promise<void>; restoreFoundBackup(): Promise<void>; dismissFoundBackup(): void; syncNow(): Promise<void>; }`, where `CloudSyncStatus = 'loading' | 'signedOut' | 'checkingBackup' | 'backupFound' | 'signedIn' | 'syncing' | 'error'`. Consumed by `CloudSyncSection.tsx` in Task 5. The `'error'` status alone is the signal the UI needs; no separate error-message string is tracked, since the UI only ever shows one fixed message for it (see Task 5).

- [ ] **Step 1: Write the hook**

Create `src/hooks/use-cloud-sync.ts`:

```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
import { exportBackup, importBackup } from '@/persistence/backup';
import { updateSettings } from '@/persistence/settings';
import type { BackupPayload } from '@/domain/export/backup';

export type CloudSyncStatus =
  | 'loading'
  | 'signedOut'
  | 'checkingBackup'
  | 'backupFound'
  | 'signedIn'
  | 'syncing'
  | 'error';

/*
 * Every Firebase import below is dynamic, including inside the effect: Settings is a route many
 * visitors open without ever touching sync, and this keeps the SDK out of that page's chunk
 * until this hook actually runs (see Task 1's note on bundle isolation).
 */
export function useCloudSync() {
  const [status, setStatus] = useState<CloudSyncStatus>('loading');
  const [email, setEmail] = useState<string | null>(null);
  const foundBackupRef = useRef<BackupPayload | null>(null);
  const uidRef = useRef<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const [{ firebaseAuth }, { onAuthStateChanged }] = await Promise.all([
        import('@/lib/firebase'),
        import('firebase/auth'),
      ]);
      if (cancelled) return;

      unsubscribe = onAuthStateChanged(firebaseAuth(), (user) => {
        if (!user) {
          uidRef.current = null;
          setEmail(null);
          setStatus('signedOut');
          return;
        }

        uidRef.current = user.uid;
        setEmail(user.email);
        setStatus('checkingBackup');

        void (async () => {
          try {
            const { pullBackupFromCloud } = await import('@/persistence/sync');
            const backup = await pullBackupFromCloud(user.uid);
            if (backup) {
              foundBackupRef.current = backup;
              setStatus('backupFound');
            } else {
              setStatus('signedIn');
            }
          } catch {
            setStatus('signedIn');
          }
        })();
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const signIn = useCallback(async () => {
    const [{ firebaseAuth, googleProvider }, { signInWithRedirect }] = await Promise.all([
      import('@/lib/firebase'),
      import('firebase/auth'),
    ]);
    await signInWithRedirect(firebaseAuth(), googleProvider);
  }, []);

  const signOut = useCallback(async () => {
    const [{ firebaseAuth }, { signOut: firebaseSignOut }] = await Promise.all([
      import('@/lib/firebase'),
      import('firebase/auth'),
    ]);
    await firebaseSignOut(firebaseAuth());
  }, []);

  const restoreFoundBackup = useCallback(async () => {
    if (!foundBackupRef.current) return;
    await importBackup(foundBackupRef.current);
    foundBackupRef.current = null;
    setStatus('signedIn');
  }, []);

  const dismissFoundBackup = useCallback(() => {
    foundBackupRef.current = null;
    setStatus('signedIn');
  }, []);

  const syncNow = useCallback(async () => {
    const uid = uidRef.current;
    if (!uid) return;
    setStatus('syncing');
    try {
      const { pushBackupToCloud } = await import('@/persistence/sync');
      const payload = await exportBackup();
      await pushBackupToCloud(uid, payload);
      await updateSettings({ lastSyncedAt: Date.now() });
      setStatus('signedIn');
    } catch {
      setStatus('error');
    }
  }, []);

  return { status, email, signIn, signOut, restoreFoundBackup, dismissFoundBackup, syncNow };
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: passes. If `onAuthStateChanged`'s callback parameter type doesn't infer as `User | null`, add `import type { User } from 'firebase/auth';` at the top and annotate the callback parameter explicitly as `(user: User | null) => { ... }` — try without the annotation first, since TypeScript generally infers through dynamic `import()` correctly.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-cloud-sync.ts
git commit -m "feat(sync): add useCloudSync hook"
```

---

### Task 5: Settings UI

**Files:**
- Create: `src/ui/pages/settings/CloudSyncSection.tsx`
- Modify: `src/copy/labels.ts:186-209` (the `settings` object)
- Modify: `src/ui/pages/settings/SettingsPage.tsx`

**Interfaces:**
- Consumes: `useCloudSync()` (Task 4), `useSettings()` (existing, `src/hooks/use-settings.ts`), `relativeTime()` (existing, `src/lib/format.ts`), `Button` (existing, `src/ui/components/primitives/Button.tsx`).

- [ ] **Step 1: Add copy strings**

In `src/copy/labels.ts`, inside the `settings` object, add after `importError: 'That did not look like a ScholarForge backup file.',`:

```typescript
  syncHeading: 'Sync across devices',
  syncIntro:
    'Sign in with Google to back up your data and pick it up on another device. Everything else about this app still works with no account at all.',
  signInWithGoogle: 'Sign in with Google',
  syncChecking: 'Checking for a backup...',
  syncBackupFound: 'Found a backup from another device.',
  syncRestore: 'Restore it',
  syncSkip: 'Not now',
  syncSignedInAs: (email: string) => `Signed in as ${email}`,
  syncNow: 'Sync now',
  syncing: 'Syncing...',
  syncLastSynced: (when: string) => `Last synced ${when}`,
  syncSignOut: 'Sign out',
  syncError: 'Could not reach sync right now. Your local data is unaffected.',
```

- [ ] **Step 2: Write the component**

Create `src/ui/pages/settings/CloudSyncSection.tsx`:

```typescript
import { useCloudSync } from '@/hooks/use-cloud-sync';
import { useSettings } from '@/hooks/use-settings';
import { relativeTime } from '@/lib/format';
import { Button } from '@/ui/components/primitives/Button';
import { settings as copy } from '@/copy/labels';

export function CloudSyncSection() {
  const { status, email, signIn, signOut, restoreFoundBackup, dismissFoundBackup, syncNow } =
    useCloudSync();
  const { settings } = useSettings();

  if (status === 'loading') return null;

  if (status === 'signedOut') {
    return (
      <div className="p-4">
        <p className="max-w-[62ch] text-sm text-fg-muted">{copy.syncIntro}</p>
        <Button variant="secondary" className="mt-3" onClick={() => void signIn()}>
          {copy.signInWithGoogle}
        </Button>
      </div>
    );
  }

  if (status === 'checkingBackup') {
    return (
      <div className="p-4">
        <p className="text-sm text-fg-muted">{copy.syncChecking}</p>
      </div>
    );
  }

  if (status === 'backupFound') {
    return (
      <div className="p-4">
        <p className="text-sm text-fg">{copy.syncBackupFound}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => void restoreFoundBackup()}>{copy.syncRestore}</Button>
          <Button variant="secondary" onClick={dismissFoundBackup}>
            {copy.syncSkip}
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="p-4">
        <p role="alert" className="text-sm text-incorrect">
          {copy.syncError}
        </p>
        <Button variant="secondary" className="mt-3" onClick={() => void syncNow()}>
          {copy.syncNow}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <p className="text-sm text-fg">{copy.syncSignedInAs(email ?? '')}</p>
      {settings.lastSyncedAt && (
        <p className="mt-1 text-sm text-fg-muted">
          {copy.syncLastSynced(relativeTime(settings.lastSyncedAt))}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => void syncNow()}
          disabled={status === 'syncing'}
        >
          {status === 'syncing' ? copy.syncing : copy.syncNow}
        </Button>
        <Button variant="ghost" onClick={() => void signOut()}>
          {copy.syncSignOut}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire it into the Settings page**

In `src/ui/pages/settings/SettingsPage.tsx`, add the import near the other local imports:

```typescript
import { CloudSyncSection } from './CloudSyncSection';
```

Then find this exact block (the end of the `copy.ai` group, immediately before the `copy.yourData` group):

```tsx
          <Group title={copy.ai}>
            <ApiKeyField
              value={settings.userApiKey}
              onSave={(userApiKey) => void update({ userApiKey })}
            />
          </Group>

          <Group title={copy.yourData}>
```

And insert a new `Group` between them, so it reads:

```tsx
          <Group title={copy.ai}>
            <ApiKeyField
              value={settings.userApiKey}
              onSave={(userApiKey) => void update({ userApiKey })}
            />
          </Group>

          <Group title={copy.syncHeading}>
            <CloudSyncSection />
          </Group>

          <Group title={copy.yourData}>
```

- [ ] **Step 4: Typecheck, lint, build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: all pass.

- [ ] **Step 5: Confirm the main bundle is still untouched**

Run: `grep -rl "firebase/app\|GoogleAuthProvider" dist/assets/index-*.js`
Expected: no match. `dist/assets/SettingsPage-*.js` (or whatever chunk it lands in) is allowed to reference it; the main entry chunk is not.

- [ ] **Step 6: Manual verification**

You need a real Firebase project for this step — see Task 7 for setup, then come back here.

1. `npm run dev`, fill in the six `VITE_FIREBASE_*` values in `.env`, restart the dev server.
2. Open `/app/settings`. Confirm the "Sync across devices" section shows the sign-in button and no console errors.
3. Click "Sign in with Google", complete the redirect flow.
4. Confirm the section now shows "Signed in as `<your email>`" with Sync now / Sign out buttons.
5. Click "Sync now". Confirm "Last synced just now" appears, and check the Firebase Console's Firestore data tab for a new `backups/<your-uid>` document containing your local data.
6. Click "Sign out". Confirm the section returns to the signed-out state, and confirm (via Library) that your local documents are still there, untouched.

- [ ] **Step 7: Commit**

```bash
git add src/copy/labels.ts src/ui/pages/settings/CloudSyncSection.tsx src/ui/pages/settings/SettingsPage.tsx
git commit -m "feat(sync): add Sync across devices UI to Settings"
```

---

### Task 6: Firestore security rules, CI note, and ADR

**Files:**
- Create: `firestore.rules`
- Create: `docs/08-DECISIONS/ADR-0010-OPTIONAL-CLOUD-SYNC.md`
- Modify: `docs/08-DECISIONS/DECISION-LOG.md`
- Modify: `.github/workflows/ci.yml`
- Modify: `docs/04-OPERATIONS/DEPLOYMENT.md`

**Interfaces:** None — documentation and config only.

- [ ] **Step 1: Write the Firestore security rules**

Create `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /backups/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Paste this into Firebase Console → your project → Firestore Database → Rules tab, and publish. This repo doesn't run the Firebase CLI as part of its build, so this file is the source of truth to copy from, not something that deploys itself.

- [ ] **Step 2: Note the CI secret-scan's Firebase exception**

In `.github/workflows/ci.yml`, find the step named `Scan the bundle for key-shaped strings`. Add a comment directly above its `run:` line explaining why it stays safe:

```yaml
      - name: Scan the bundle for key-shaped strings
        # This intentionally does not need updating for Firebase's client config key: CI never
        # sets VITE_FIREBASE_API_KEY, so Vite bakes in `undefined`, not a real "AIza..." string,
        # and this check never sees one. GEMINI_API_KEY is the one this check exists to catch.
        run: |
          if grep -rEq 'AIza[0-9A-Za-z_-]{35}|sk-[0-9A-Za-z]{20,}' dist/; then
            echo "A key-shaped string is present in the build output."
            exit 1
          fi
          echo "No key-shaped strings in dist/."
```

- [ ] **Step 3: Write ADR-0010**

Create `docs/08-DECISIONS/ADR-0010-OPTIONAL-CLOUD-SYNC.md`:

```markdown
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

**Stays true to the local-first promise for everyone who doesn't opt in.** Signing in is discoverable in Settings, never required. Signing out never touches local data — only the auth session.

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

## Revisit if

Cross-user features are ever wanted (shared decks, a leaderboard) — that would need real per-entity tables and access rules, not a single JSON blob per user.
```

- [ ] **Step 4: Add the ADR to the decision log**

In `docs/08-DECISIONS/DECISION-LOG.md`, add a row to the index table:

```markdown
| [ADR-0010](ADR-0010-OPTIONAL-CLOUD-SYNC.md) | Optional cloud sync via Firebase, additive to local-first | Accepted | 2026-07-31 |
```

- [ ] **Step 5: Add Firebase project setup to the deployment doc**

In `docs/04-OPERATIONS/DEPLOYMENT.md`, add a new section (placement: after the existing "Turning on real AI generation" section, or wherever the file's structure best fits at the time — read the current file first):

```markdown
## Turning on cloud sync

Optional. The app works fully without this — see [ADR-0010](../08-DECISIONS/ADR-0010-OPTIONAL-CLOUD-SYNC.md).

1. Create a free Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
2. Add a Web app to the project (Project settings → General → Your apps). Copy the six config values it gives you.
3. Enable Google as a sign-in provider: Authentication → Sign-in method → Google → Enable.
4. Create a Firestore database (production mode is fine — the rules below lock it down).
5. Paste the contents of `firestore.rules` (repo root) into Firestore → Rules, and publish.
6. In the Vercel dashboard, add the six `VITE_FIREBASE_*` variables from step 2 as environment variables (Plain, not Secret — these are public client config, not credentials, see `src/lib/firebase.ts`), for both Production and Preview.
7. Redeploy. Sign-in should now work at `/app/settings`.
```

- [ ] **Step 6: Commit**

```bash
git add firestore.rules docs/08-DECISIONS/ADR-0010-OPTIONAL-CLOUD-SYNC.md docs/08-DECISIONS/DECISION-LOG.md .github/workflows/ci.yml docs/04-OPERATIONS/DEPLOYMENT.md
git commit -m "docs(sync): add ADR-0010, Firestore rules, deployment steps for cloud sync"
```

---

### Task 7: Final verification

**Files:** None — verification only.

- [ ] **Step 1: Full local check**

Run: `npm run typecheck && npm run lint && npm test && npm run build`
Expected: all green.

- [ ] **Step 2: Confirm bundle isolation one more time, against the final build**

Run: `grep -rl "firebase" dist/assets/index-*.js`
Expected: no match.

- [ ] **Step 3: Two-profile manual test**

Using two separate browser profiles (or one normal + one incognito window) signed into the *same* Google account:

1. Profile A: upload a document, generate a quiz, sign in, tap "Sync now".
2. Profile B: sign in with the same Google account. Confirm the "Found a backup from another device" prompt appears; tap "Restore it".
3. Profile B: confirm the document and quiz from Profile A now appear in the Library.
4. Profile B: sign out. Confirm the document is still there (sign-out never deletes local data).
5. Either profile: reload with no sign-in at all (fresh incognito window, never touch Settings). Confirm the app is fully usable — upload, quiz, chat all work with zero mention of accounts.

- [ ] **Step 4: Update the activity log**

Add an entry to `docs/ACTIVITY-LOG.md` (newest entry at the top, following the file's existing format) summarizing what was built, referencing ADR-0010, and noting the two-profile manual verification result.

- [ ] **Step 5: Final commit**

```bash
git add docs/ACTIVITY-LOG.md
git commit -m "docs: log optional cloud sync feature completion"
```
