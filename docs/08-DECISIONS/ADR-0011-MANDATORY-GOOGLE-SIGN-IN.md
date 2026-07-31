# ADR-0011 — Mandatory Google sign-in for app access

**Status:** Accepted
**Date:** 2026-07-31
**Supersedes:** [ADR-0001](ADR-0001-LOCAL-FIRST-STORAGE.md)'s "no accounts in v1" scope

## Context

[ADR-0001](ADR-0001-LOCAL-FIRST-STORAGE.md) chose no accounts and no signup friction as a core value: the primary persona abandons tools that ask for an account before showing value. [ADR-0010](ADR-0010-OPTIONAL-CLOUD-SYNC.md) later added Google sign-in, but kept it strictly opt-in — the app worked fully without ever signing in.

The project owner has decided to reverse that specific piece: every visitor must sign in with Google before using the app at all, including dropping a file on the landing page. The motivation is access control on who uses the product, not curbing abuse of the shared Gemini API key — the AI proxy's existing per-IP quota (`api/_lib/quota.ts`) is unchanged and out of scope for this decision.

## Decision

**All `/app/*` routes are gated behind an authenticated Firebase (Google) session**, enforced client-side by `AuthGate` (`src/ui/components/AuthGate.tsx`), wrapped around `AppLayout`. A signed-out visitor sees only a "Sign in to continue" screen; no app route renders until `useAuthUser()` reports `signedIn`.

The landing page's file-drop flow needed no separate gate: it already routes through `/app/parse` (`setPendingFile` + `navigate`), so it inherits the same gate for free. One accepted rough edge: `signInWithRedirect` is a full page navigation, which wipes the in-memory pending file (see `src/lib/pending-file.ts`'s module-scope comment). A visitor who drops a file while signed out lands back on an empty parse page after signing in and must drop it again. Building IndexedDB persistence to avoid that one extra step was considered and rejected as unnecessary complexity for a single re-drop.

**This does not change local-first storage.** IndexedDB via Dexie remains the only place study data is written by default. Firestore is still touched only when a signed-in user explicitly taps "Sync now" — [ADR-0010](ADR-0010-OPTIONAL-CLOUD-SYNC.md)'s manual push/pull model is unchanged. What changed is who may reach the app at all, not where data lives once they're in it.

## Alternatives considered

### Server-side enforcement (verify a Firebase ID token in `api/generate.ts`)

**Rejected for this decision.** The gate here is about UI access, not tightening the AI proxy's abuse controls — that would be a separate, larger change (verifying tokens server-side, re-keying quota by `uid` instead of hashed IP) and was explicitly ruled out of scope when this ADR was written.

### Keep sign-in optional, add a lighter "preview mode" gate

**Rejected.** The owner's explicit instruction was that no interaction — including the landing page demo — should proceed without sign-in. A partial preview would contradict that directly.

## Consequences

### Easier

- One access path to reason about, instead of two (signed-in vs signed-out) for every app route.

### Harder

- **Reverses ADR-0001's "no signup friction" value.** A visitor now needs a Google account before ever seeing the product work, which is the exact friction ADR-0001 was written to avoid. This is a deliberate, acknowledged trade-off, not an oversight.
- **This is a UX gate, not a security boundary.** `AuthGate` is a client-side React check; it controls what the UI renders, not what data is reachable. The actual data-layer protection is unchanged: Firestore's security rules (`firestore.rules`) already restrict `backups/{uid}` to its owner regardless of this gate. Nothing sensitive was being protected by this change that Firestore's rules didn't already protect.
- All public-facing copy claiming "no account needed" (README, PWA manifest description, marketing page, settings copy) had to be corrected — tracked alongside this ADR in the same change.

## Revisit if

Signup friction measurably hurts adoption enough that the owner wants a no-account preview mode back, or if AI-quota abuse becomes a real problem — at which point the server-side token-verification alternative above should be reconsidered as its own ADR.
