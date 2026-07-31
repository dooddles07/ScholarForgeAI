# ADR-0012 — Google sign-in via popup rather than redirect

**Status:** Accepted
**Date:** 2026-07-31
**Supersedes:** [ADR-0010](ADR-0010-OPTIONAL-CLOUD-SYNC.md)'s "redirect, not popup" choice (that ADR's Firebase/Firestore decisions are otherwise unchanged)

## Context

[ADR-0010](ADR-0010-OPTIONAL-CLOUD-SYNC.md) chose `signInWithRedirect` over `signInWithPopup`, reasoning that redirect is more reliable on mobile browsers (popup blockers, Safari quirks) and that this matched the project's phone-first principle. That ADR also flagged, in its Consequences, that the redirect flow's dependency on Firebase's cross-site `*.firebaseapp.com` authDomain could be "degraded" in browsers that block third-party storage.

That degradation turned out to be a total failure, not a partial one, and in Chrome rather than only the Safari/Firefox cases the docs anticipated.

**Observed in production:** a user clicked "Sign in with Google" on `scholar-forge-ai.vercel.app`, completed Google's consent screen, and was returned to the app still signed out — `AuthGate` rendered "Sign in to continue" again, with no error surfaced. The app's `authDomain` is `scholarforge-ai-2fbd9.firebaseapp.com`, a different site from the app's own origin, so the redirect flow's session handoff runs through third-party storage that Chrome now blocks by default.

Two other real problems were found and fixed while diagnosing this, both prerequisites rather than the root cause:

1. **The `/__/auth/handler` and `/__/firebase/init.json` paths 404'd.** Firebase only provisions them once *something* has been deployed to Firebase Hosting for the project. Because this project deploys to Vercel, Hosting had never been initialized. A one-time `firebase init hosting` + `firebase deploy --only hosting` (deploying a placeholder page to `<project>.firebaseapp.com`) provisions them. This is required for the popup flow too, not just redirect.
2. **The CSP blocked several Google origins** Firebase Auth needs. These were fixed one domain per deploy cycle before being done properly in one pass — see [SECURITY-AND-PRIVACY.md](../04-OPERATIONS/SECURITY-AND-PRIVACY.md)'s CSP section for the full documented set.

## Decision

**`signInWithPopup`**, in `src/hooks/use-auth-user.ts`'s `signInWithGoogle()`.

A popup opened synchronously from the sign-in button's own click handler is a user gesture, which is the case popup blockers are built to allow. The session is established in the popup and passed back via `postMessage` to the opener, with no cross-site storage handoff for a browser to block.

`getRedirectResult()` and its error handling were removed from the auth singleton's initialization, since nothing returns from a redirect any more.

`Cross-Origin-Opener-Policy: same-origin-allow-popups` was added to `vercel.json`. Without it the browser severs the opener relationship, and Firebase's polling of `window.closed` on the popup logs a stream of console errors — benign, but noisy and misleading to anyone debugging later.

## Consequences

### Easier

- Sign-in works in Chrome, which it did not before. This is the whole point.
- **Fixes [ADR-0011](ADR-0011-MANDATORY-GOOGLE-SIGN-IN.md)'s documented rough edge for free.** That ADR accepted that `signInWithRedirect`'s full page navigation wipes the in-memory pending file (`src/lib/pending-file.ts`), forcing a visitor who drops a file while signed out to drop it again after signing in. A popup never navigates the opener, so the pending file survives.
- No dependency on third-party storage, so this is not at the mercy of further browser privacy changes in the way redirect was.

### Harder

- **Reverses ADR-0010's phone-first reasoning.** Popups are genuinely worse than redirects on some mobile browsers. The mitigating fact is that this popup is opened directly from a tap, not programmatically after an async gap, which is the case blockers permit. **This has not been verified on a real phone** — it should be, and it is the most likely place this decision breaks.
- Firebase Hosting must stay provisioned for the project, even though the app is served from Vercel. Deleting that Hosting site would break sign-in. See [DEPLOYMENT.md](../04-OPERATIONS/DEPLOYMENT.md).

## Revisit if

Real-device testing shows popups being blocked or badly degraded on mobile. The fallback in that case is not to return to plain redirect — that would reintroduce this exact bug — but to proxy Firebase's auth handler onto the app's own domain (Vercel rewrites for `/__/auth/*` plus setting `VITE_FIREBASE_AUTH_DOMAIN` to the app's domain), which makes the redirect flow same-site and therefore immune to third-party storage blocking. That approach was considered here and set aside as the heavier option once popup proved sufficient.
