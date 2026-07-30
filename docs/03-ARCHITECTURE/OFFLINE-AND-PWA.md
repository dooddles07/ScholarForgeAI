# Offline and PWA

Purpose: how the app installs, caches, and works without a connection.
Last updated: 2026-07-30

Decision context in [ADR-0007](../08-DECISIONS/ADR-0007-PWA-OVER-NATIVE.md).

## What works offline

Because storage is local ([ADR-0001](../08-DECISIONS/ADR-0001-LOCAL-FIRST-STORAGE.md)) and parsing is local ([ADR-0005](../08-DECISIONS/ADR-0005-CLIENT-SIDE-PARSING.md)), almost everything does.

| Works offline | Needs a connection |
|---|---|
| Reviewing flashcards | Generating a quiz |
| Retaking a saved quiz | Generating flashcards |
| Reading saved explanations | Generating an explanation |
| Taking a saved exam | Generating an exam |
| The weak-spot dashboard | Ask-your-document chat |
| Editing and creating cards | — |
| Uploading and parsing a new document | — |
| Export and import | — |
| All settings | — |

Uploading works offline, which surprises people. Parsing needs no server, so a student on a plane can add a document and get flashcards from it the moment they reconnect.

Only generation needs the network, because only generation needs the model.

## Service worker

Via `vite-plugin-pwa` with Workbox. Hand-written service workers are a well-known source of users permanently stuck on a stale build, and Workbox handles the lifecycle correctly.

### Caching strategies

| Asset | Strategy | Why |
|---|---|---|
| App shell: HTML, JS, CSS | Precache, cache-first | Instant load, works offline |
| Fonts | Cache-first, long expiry | Never change |
| Icons and static images | Cache-first | Never change |
| Lazy parser chunks | Cache-on-first-use | Only cached for formats actually used |
| `/api/generate` | Network only, never cached | Responses are unique; caching them would be wrong |

Parser chunks caching on first use is a nice property: a user who only ever uploads PDFs never caches the DOCX parser, so their offline bundle stays small.

### Updates

The classic PWA failure is a user stuck on a build from six weeks ago with no idea why a fixed bug persists. So:

- New versions are detected on load
- A non-blocking notice offers to reload: *"A new version is ready. Reload to update."*
- Dismissible, and applied automatically on the next cold start
- The service worker never activates mid-session, because swapping code under a running session risks a broken state

We do not force an immediate reload. A student mid-quiz should not lose their place to a version bump.

## Manifest

```json
{
  "name": "ScholarForge AI",
  "short_name": "ScholarForge",
  "description": "Turn your notes into quizzes, flashcards, and practice exams.",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#0f172a",
  "theme_color": "#0f172a",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

`display: standalone` gives a full-screen app without browser chrome. The maskable icon matters on Android, where without it the icon gets an unattractive white box behind it.

`orientation: portrait-primary` reflects the primary use case, but does not lock rotation, since a user reading a document may well want landscape.

## Install prompt

Timing is the whole thing. A prompt on first load, before the user knows whether the tool is any good, gets dismissed and poisons the well permanently.

**Trigger:** after a first completed quiz or a first review session. The user has now seen value.

**Presentation:** a dismissible bar, not a modal. Copy along the lines of *"Add ScholarForge to your home screen so it works offline and opens like an app."*

**Dismissal:** permanent. Recorded in settings as `hasSeenInstallPrompt`, and never shown again. There is a manual install option in settings for anyone who changes their mind.

### iOS

iOS gives no automatic install prompt, so the path has to be explained. Detected via user agent, and shown platform-specific instructions: tap Share, then Add to Home Screen. Without this, iOS users simply never install.

## Offline indicator

Detected via `navigator.onLine` plus a failed request as confirmation, since `navigator.onLine` reports connectivity rather than reachability and can be wrong.

When offline:

- A persistent but unobtrusive banner
- The banner names what still works, rather than only what does not
- AI actions are visibly disabled with an explanation, not left to fail on tap

That last point matters. A disabled button with a reason is respectful. A button that looks fine, gets tapped, spins, and then errors is not.

When the connection returns, the banner clears and actions re-enable without a reload.

## Storage persistence

Browsers may evict IndexedDB under storage pressure. Losing a month of review scheduling is a serious failure with no recovery path, since there is no server copy.

Mitigations:

**Request persistent storage.** `navigator.storage.persist()` asks the browser not to evict. Chrome grants it based on engagement signals, including installation. Another reason to encourage installing.

**Prompt exports.** After significant work, and never more than once a week, suggest exporting a backup. Driven by `lastExportAt` in settings.

**Detect private browsing.** Storage is ephemeral there. Detected on first run and stated plainly: nothing will be saved after the window closes. We do not block usage, since some people genuinely want a throwaway session.

**Warn on first run.** The first-run notice explains that data lives in this browser, that there is no account, and that export is how you move or back it up. Shown once, recorded as `hasSeenLocalDataWarning`.

iOS is the weakest platform here: Safari evicts more aggressively and grants persistent storage less readily. The export prompt matters most for iOS users.

## Cache size

| Component | Approximate |
|---|---|
| App shell | Under 300 KB gzipped, per the bundle target |
| Fonts | Small; system font stack preferred where possible |
| Icons | Tens of kilobytes |
| Parser chunks | Only formats actually used, cached on demand |

User content lives in IndexedDB rather than the cache, and dominates total storage. Documents are the largest contributor. Pressure handling in [DATA-MODEL.md](DATA-MODEL.md).

## Testing offline

Automated, in Playwright:

- Load the app, go offline, reload, and assert it still opens
- Assert card review works with no network
- Assert AI actions are disabled with a stated reason rather than failing
- Assert the offline banner appears and clears correctly
- Assert an update notice appears when a new service worker is available

Manual, on real devices:

- Install on Android and confirm standalone launch and the maskable icon
- Install on iOS via Share and confirm standalone launch
- Airplane-mode test on both
- Confirm storage survives an app close and a device restart

Real hardware, not emulators. Per [TESTING-STRATEGY.md](../05-ENGINEERING/TESTING-STRATEGY.md).

## Deliberately not built

| Not building | Why |
|---|---|
| Push notifications for study reminders | Support is inconsistent across platforms, particularly iOS, so a reminder feature would be unreliable in exactly the way that makes it useless |
| Background sync | Nothing to sync; storage is local |
| Periodic background generation | Would spend shared quota without the user asking |
| Share target registration | Under consideration; would let a user share a PDF straight into the app from another app. Recorded in [OPEN-QUESTIONS.md](../06-PLANNING/OPEN-QUESTIONS.md) |
