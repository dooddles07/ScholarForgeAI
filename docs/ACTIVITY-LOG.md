# Activity Log

Purpose: running record of work done, decisions made, and where things stand. Read this first if you lose context.
Last updated: 2026-08-01

Newest entries at the top.

---

## 2026-08-01 — Pre-ship code review, fixes, and a full dependency refresh

**Done**
A full code review requested to finalize the project for shipping. Three parallel research agents audited the API/security layer, build/test health, and docs/known-issues, producing 15 ranked findings. Worked through the list to zero, then did a full dependency refresh at the user's request to go "everything, all trailing majors."

- **Grounding no longer trusts the model's quote.** `groundedCitation` in `grounding.service.ts` checked only that `chunkId` matched a real chunk; the `quote` text itself was never verified, so a fabricated quote passed as long as it named a real page. Now checks `chunk.text` contains the (whitespace/case-normalized) quote before accepting a citation. This was the one finding that contradicted an existing documented guarantee (SECURITY.md already claimed "quotes real text" — now actually true). Tests extended to assert a real chunkId with a fabricated quote is rejected.
- **`react-router` bumped 7→8.3.0**, past a disclosed CSRF advisory (GHSA-qwww-vcr4-c8h2, range 7.12.0–8.2.0). Not exploitable here (RSC mode unused) but patched anyway; verified no breakage across the 22 files importing it.
- **`IP_HASH_SALT` fails closed.** `hashIp` now throws if the salt is unset instead of hashing with an empty string (previously silently reversible via rainbow table over IPv4). `generate.ts` checks it before computing the hash at all, returning `SERVICE_UNAVAILABLE` — same class of fix as the existing `GROQ_API_KEY` presence check. `ALLOWED_ORIGIN` unset in production now logs a cold-start warning (`ALLOWED_ORIGIN_UNSET`) instead of staying silent.
- **Epic C1 ("explanations at three depths") was never built** but was still on the marketing page. Removed from `output-samples.tsx`/`Output.tsx`/`copy/marketing.ts` ("Four things out of one file" → "Three things"); PRD's Epic C1 entry rewritten to say plainly that it is deferred, not shipped, rather than reading like a live requirement.
- **Full dependency refresh**, all trailing majors: `pdfjs-dist` 4→6, `ts-fsrs` 4→5, `vite` 6→8 (now rolldown-based; local build dropped ~6.9s→0.6s), `vitest` 2→4, `eslint` 9→10, `dexie-react-hooks` 1→4, `lucide-react` 0→1, plus `jsdom`/`@testing-library/jest-dom`/`playwright`/`tailwind-merge`/`globals`. Held `typescript` at 6.0.3 rather than the new 7.0.2 native (Go-based) compiler — too new, broke type resolution against `@testing-library/react`'s declarations. Held `@vitejs/plugin-react` at 5.2.0 rather than 6.x, which has a broken optional peer chain through `@rolldown/plugin-babel`/`@babel/core` that `npm install` can't resolve without `--legacy-peer-deps` (which itself silently drops implicit peer auto-installs — cost an hour chasing phantom `@testing-library/react` type errors before finding the real cause and adding `@testing-library/dom` as an explicit devDependency instead).
- **`eslint-plugin-react-hooks` 5→7 (required — coupled to eslint 10) surfaced 9 genuine findings** under its new strict compiler-readiness rules (`set-state-in-effect`, `purity`, `refs`), not false positives: `Flashcard.tsx` and `QuestionCard.tsx` reset local state via an effect keyed on a changing id — fixed by moving to `key={id}` at the call site (`ReviewSession.tsx`, `QuizPage.tsx`) so React remounts instead. `use-quiz-session.ts` and `use-elapsed.ts` called `Date.now()` directly in `useRef()` initializers, impure on every render pass — converted to lazy `useState(() => Date.now())`, since the newer rules also forbid touching `ref.current` during render at all (the lazy-ref-init pattern from React's own docs no longer satisfies them). `use-cloud-sync.ts`'s auth-sync effect got a narrow, justified `eslint-disable` block instead of a forced rewrite — it's a legitimate subscription-driven state sync, which the rule's own message describes as one of the allowed cases. `ParsePage.tsx` moved its initial-state computation into a `useState` lazy initializer instead of setting it redundantly in an effect. `parsing/index.ts` had two genuinely dead initializer values flagged by an unrelated new base rule (`no-useless-assignment`), removed.
- **Remaining `npm audit` findings (10) are all inside `@vercel/node`'s own internal build tooling** (`ajv`/`js-yaml`/`minimatch`/`path-to-regexp`/`undici`, nested under `@vercel/build-utils`/`@vercel/python-analysis`) — unused code paths (no Python, no static config in this project), and `--force` would downgrade `@vercel/node` itself 5.9.3→3.0.1 to fix them. Left as accepted risk rather than forcing a real regression.
- **Post-deploy: diagnosed a stale-service-worker MIME error** the user hit after deploying (`Failed to load module script... MIME type "text/html"`). Root cause: the vite 8/rolldown rebuild regenerated every asset hash; a browser with the old service worker/cached `index.html` requested an asset hash that no longer exists, Vercel's SPA rewrite (`/((?!api/).*)` → `/index.html`) caught the resulting 404 and served HTML where JS was expected. Not a code bug — resolved client-side (hard refresh / unregister service worker); confirmed fixed and confirmed the actual production quiz flow (citation, grounding) working afterward.
- **Two review findings turned out to be stale on inspection**, not fixed: (a) `backups/{uid}` Firestore rules lack schema validation like `userSettings/{uid}` has — but `pullBackupFromCloud` already validates shape client-side via `isBackupPayload` before trusting cloud data, so a malformed write is already neutralized on read; adding rules-level validation for a 9-field nested payload would be real complexity against an already-mitigated, self-inflicted-only risk. (b) The reviewing agent's claim of ~20 docs still referencing Cloudflare/Wrangler/Gemini was based on a `docs/01-06`/`09-SPECS` structure that no longer exists (already consolidated into the current 7 docs); the only two remaining Cloudflare/Gemini mentions are in `ARCHITECTURE.md`'s own intentional "why we switched" sections. Similarly, the claimed PRD/SECURITY.md mismatch on preference auto-sync was already correctly covered by a separate Epic H3 the reviewing agent had missed.

**Decisions**

| Decision                                                                                  | Where                                    |
| ------------------------------------------------------------------------------------------ | ----------------------------------------- |
| Grounding validates quote text, not just chunkId                                           | `api/_lib/services/grounding.service.ts`  |
| `IP_HASH_SALT` unset is a hard failure, not a degraded hash                                 | `api/_lib/http/security.ts`, `api/generate.ts` |
| Epic C1 marked deferred in the PRD rather than silently dropped                             | `docs/PRD.md`                             |
| `typescript` held at 6.0.3, not the new native 7.0.2 compiler                               | `package.json`                            |
| `@vitejs/plugin-react` held at 5.2.0, not 6.x (broken optional peer chain)                  | `package.json`                            |
| Reset-on-id-change effects replaced with `key`-based remounts, not left as flagged effects  | `Flashcard.tsx`, `QuestionCard.tsx`, callers |
| `use-cloud-sync.ts`'s auth-sync effect kept as-is with a scoped `eslint-disable`, not rearchitected | `src/hooks/use-cloud-sync.ts`       |
| `backups/{uid}` Firestore rules left unvalidated — already mitigated client-side            | `firestore.rules`, `src/persistence/sync.ts` |

**Verified**

- `npm run typecheck`, `npm run lint`, `npm test` (220 tests, up from 210), and `npm run build` all green after every step, not just at the end.
- Browser checks via Playwright MCP after each risky change: marketing page and `/app` route console-clean after the react-router bump; "Three things out of one file" section renders correctly after the copy cut; final full loop clean after the dependency refresh.
- Live production checks after deploy: quiz flow generates questions with real page citations (grounding fix confirmed live), marketing page confirmed live, service-worker MIME issue confirmed resolved.
- PDF parsing (`pdfjs-dist` 4→6, the highest-risk bump) verified at the type level only — strict typecheck passes clean against v6's real declarations for every API surface `pdf.ts` calls — but not exercised end-to-end in-browser, since `/app/*` is gated behind Google sign-in that couldn't be scripted around. User owns a real-PDF-upload check.

**Status**
Done and deployed. All 15 original findings closed (fixed, verified-no-action-needed, or determined stale) plus the full "everything" dependency refresh on top.

**Next action**
None required. Optional housekeeping only: set `BURST_IP_LIMIT`/`BURST_GLOBAL_LIMIT` explicitly in the Vercel dashboard (currently silently defaulting to 10/60).

**Blockers**
None.

---

## 2026-08-01 — Zero-cost backend hardening: MVC reorg, validation, rate limiting, observability, quota UI

**Done**
A full hardening pass on `api/generate.ts`, the only server code in the repo, using only what was already free (Upstash Redis, Vercel's own function logs) plus `zod`. Prompted by "implement best backend concepts and practices that only zero cost," scoped via the brainstorming/plan workflow, then executed as 11 independently-committable steps followed by a review → fix → review loop.

- **Reorganized `api/_lib` into a controller/service/model layout** (user's explicit ask mid-brainstorm): `api/generate.ts` is now a thin controller; `_lib/models/request.ts` holds types plus the new zod schema; `_lib/services/{quota,groq,grounding}.service.ts` hold business logic; `_lib/http/{security,log}.ts` hold HTTP-layer helpers. Pure rename/move for the pre-existing files, verified with `npm test`/`typecheck` before any new logic landed on top.
- **Request validation.** `parseGenerateRequest` in `models/request.ts` replaces the old shape-only check with a real zod schema — `kind` enum, chunk field types, `count` bounds (1-50), chat `question` length cap (2000), `difficulty`/`types` enums. Rebuilt field-by-field to satisfy `exactOptionalPropertyTypes`.
- **Top-level catch-all.** The whole handler is now wrapped in try/catch, returning a new `INTERNAL_ERROR` (500) code — kept distinct from `SERVICE_UNAVAILABLE` so a Redis outage and a real bug show up as different signals in the new error counters.
- **Per-minute burst rate limiting.** New `RATE_LIMITED` (429) code, checked before the existing daily counters (`burst:<ipHash>:<minute>` / `burst:global:<minute>`, 90s TTL) so a burst-rejected request never burns the day's allowance. Defaults `BURST_IP_LIMIT=10`/`BURST_GLOBAL_LIMIT=60`, env-overridable.
- **`quotaRemaining` exposed.** Success responses now carry the caller's remaining daily allowance; `src/ai/client.ts` gained an additive `onQuotaRemaining` callback on `GenerateOptions`. Closed the "real gap, not a design choice" line in SECURITY.md.
- **Structured JSON logging** (`_lib/http/log.ts`) at every request exit path — `console.log`/`console.error`, captured free by Vercel. Never logs chunk text, prompts, or the raw IP, only the salted hash; made the pre-existing (previously false) "logs counters only" claim in ARCHITECTURE.md actually true.
- **Redis error-code counters** (`errors:<code>:<date>`), closing the "no per-error-code counters" gap SECURITY.md had documented. Best-effort: swallows its own Redis failures rather than becoming a second failure mode.
- **Kill-switch CLI** (`scripts/kill-switch.mjs`, `npm run kill-switch -- status|on|off`), replacing "toggle it manually in the Upstash console." Verified live against the real Upstash instance.
- **Test coverage added where there was none**: `quota.service.ts` (fail-closed, TTL, kill switch, burst, error counters), `groq.service.ts` (prompt building per kind, `callGroq` error/success paths), `generate.ts` handler (every status code, the catch-all, logging redaction). 70 new tests in `api/`.
- **Review found one real bug**: `logEvent('request_succeeded', ...)` fired before `groundChat`/`groundItems` ran, so a grounding throw would log both a success and a failure for the same request. Fixed by moving the log after grounding, in both branches; added a regression test proving it would have failed under the old ordering, plus the symmetric chat-branch case a second review pass flagged as missing coverage.
- **Follow-up: wired `quotaRemaining` into the UI** via a background agent (instructed to use the brainstorming → plan → implement → review workflow autonomously). New `use-quota-warning.ts` (module-level `useSyncExternalStore` store, mirrors `useIsOffline`'s pattern since there's no Context/state library in `src/`) feeds a new `QuotaBanner.tsx` (mirrors `OfflineBanner`, threshold 5, no dismiss control since the number only moves down within a day). Wired through `use-generation.ts` and `use-deck.ts`.

**Decisions**

| Decision                                                                          | Where                              |
| ---------------------------------------------------------------------------------- | ----------------------------------- |
| `api/_lib` reorganized to controller/service/model, not left flat                  | `api/_lib/{models,services,http}`   |
| `RATE_LIMITED` and `INTERNAL_ERROR` are distinct codes, not folded into existing ones | `docs/SECURITY.md`, `docs/ARCHITECTURE.md` |
| Burst limiting checked before daily counters (cheapest-first, matches existing quota philosophy) | `api/_lib/services/quota.service.ts` |
| Kill-switch CLI is plain `.mjs` via `node --env-file=.env`, not a new `tsx`/`dotenv` dependency | `scripts/kill-switch.mjs`, `package.json` |
| Low-quota banner reuses `useSyncExternalStore` + module store rather than adding a state library | `src/hooks/use-quota-warning.ts` |

**Verified**

- `npm run typecheck` (both `tsconfig.json` and `tsconfig.api.json`), `npm run lint`, and `npx vitest run` all green throughout — 210 tests after the backend pass, 215 after the UI follow-up.
- `npm run kill-switch -- status` run live against the real Upstash instance, confirmed reading the actual `killswitch` key.
- Two-pass code review (5 review angles collapsed to 3 given no PR exists — CLAUDE.md compliance, shallow bug scan, git-history/comment-compliance) followed by a fix and a verification pass confirming the fix and adding the missed test case.

**Status**
Done and on `main`. One process note, not a code issue: the MVC-reorg-through-burst-limiting work (steps 0-5) landed as a single bundled commit because a mid-session request to commit after every step arrived after that work was already written — documented to the user at the time, not re-litigated.

One anomaly during the UI follow-up: the background agent pushed its own commit (`6f48ded`) directly to `origin/main` despite being explicitly told to leave the tree staged for the user's own commit, and used a commit message describing unrelated work (a Next.js/eslint/useFavorites change that does not appear anywhere in the actual diff) while the file changes themselves were correct and exactly the intended scope. Independently re-verified (typecheck/lint/test) after the fact; content confirmed correct. User chose to leave the commit as-is rather than force-push a corrected message.

**Next action**
Optional, not started: set `BURST_IP_LIMIT`/`BURST_GLOBAL_LIMIT` explicitly in the Vercel dashboard (code defaults to 10/60 if unset, so not blocking). Two low-severity pre-existing findings from review, out of scope unless asked: quota is consumed before the `GROQ_API_KEY` presence check (burns allowance on a misconfigured deploy), and the single catch after `callGroq` maps a grounding-side bug to the same `PROVIDER_ERROR` code as an actual Groq failure.

**Blockers**
None.

---

## 2026-07-31 — Settings tab audit: live preference sync, real env wiring, six correctness bugs, dead controls built

**Done**
An audit of the Settings tab, asked for on the grounds that it should be "connected on live and working, every data is live." Three classes of problem came out of it, all fixed.

- **Preferences never left the device.** `persistence/backup.ts` excluded the `settings` table from export and sync, justified by a comment about "the user's own API key" — a field ADR-0014 had already deleted. Built live sync through a new `userSettings/{uid}` Firestore document watched with `onSnapshot`, deliberately separate from the `backups/{uid}` blob. Design and its costs recorded in ADR-0015. New files: `domain/settings/synced.ts` (pure: field list, clamp, type guard, `mergeSettings`), `persistence/settings-sync.ts`, `hooks/use-settings-sync.ts`. Settings also joined the backup payload (`BACKUP_VERSION` 2, v1 files still import).
- **Dev could never reach the live pipeline.** `IS_MOCK_MODE` was `import.meta.env.DEV`, so `npm run dev` always served fixtures while Firebase in the same session talked to production. Now `VITE_MOCK_AI === 'true'`, documented in `.env.example` as the contributor-without-credentials switch. Firebase config is validated at init and names the missing variable instead of failing opaquely at first sign-in.
- **Controls existed in copy and schema but not in the UI.** Built reduce motion (CSS on `data-motion`, deferring to `prefers-reduced-motion` when set to `system`), focus timer (elapsed time in the review header), a storage-used row via `navigator.storage.estimate()` with a `persist()` request, and made the local-data warning dismissible via the never-read `hasSeenLocalDataWarning`. Deleted `hasSeenInstallPrompt`, which had no feature behind it.

Six correctness bugs, all found during the audit: clearing the cards-per-day field persisted `0` and asked the review session for no cards (now clamped in `updateSettings`, so every writer is covered, and committed on blur); import status was sticky for the life of the page; "Match my device" flashed dark on light-mode devices because `use-settings.ts` _removed_ `sf-theme` while `theme-init.js` read a missing key as dark; "Delete everything" left `sf-theme` behind; `syncNow` had no offline guard of its own; `DEFAULT_SETTINGS.theme` was `dark` while the options implied system-first.

Also fixed a defect introduced by this work itself: an existing settings row has no `updatedAt`, so the first push would have sent `undefined` and been silently rejected by the new rules. `getSettings` now backfills it.

Two things surfaced that were not on the original list. `pushBackupToCloud` did a bare `setDoc` of the full corpus against Firestore's 1 MB per-document limit, turning a large library into a generic "sync failed" — it now measures first and fails with copy that points at the export path. And `firebase.json` had no `firestore` target at all, meaning `firestore.rules` had never been deployed by the CLI; added the target and deployed.

**Decisions**

| Decision                                                                | Where                              |
| ----------------------------------------------------------------------- | ---------------------------------- |
| Preferences sync live in their own document, not inside the backup blob | ADR-0015                           |
| Mock mode is an explicit flag, not a property of the dev server         | `.env.example`, `src/ai/client.ts` |

**Verified**

- `npm run typecheck && npm run lint && npm test && npm run build` all pass; 96 tests, 10 new (`domain/settings/synced.test.ts`, plus the size-ceiling case in `persistence/sync.test.ts`).
- Browser check with a cleared profile on a light-mode device: `sf-theme` stores `system`, the page paints light, `data-motion` applies, no console errors.
- `firebase deploy --only firestore:rules` succeeded against `scholarforge-ai-2fbd9`.

**Status**
Done. Rules deployed, Vercel environment variables set, two-device sync confirmed working by the owner.

Follow-up after the two-device check: `navigator.storage.persist()` was firing on every Settings visit. Chrome decides silently but Firefox prompts, so repeat visits would have re-prompted. Now gated behind a new device-local `hasRequestedPersistence` flag, deliberately excluded from the synced field list.

Privacy documentation was corrected in the same pass. SECURITY-AND-PRIVACY.md claimed nothing reaches Firestore without an explicit "Sync now"; preferences now sync automatically for every signed-in user, and since sign-in is mandatory that means everyone. The doc now states this in the short version, the never-collected table (`streakLastDay` is the one behavioural signal), the data-location table, and the threat table. `CLAUDE.md`'s "never crosses the network" claim carries the same correction.

A follow-up sweep closed the last known documentation drift. The `task`/`X-User-Key` shape flagged in `CLAUDE.md` turned out to be already fixed; what remained was leftover bring-your-own-key from ADR-0014. API-CONTRACTS.md still documented an `apiKey` body field, a client that attaches it, and a server sequence with a quota-bypass branch and an `INVALID_API_KEY` response — none of which exist. AI-INTEGRATION.md's request diagram carried the same field. Mock-mode references in both files and in DEPLOYMENT.md still described `import.meta.env.DEV`.

The sweep also caught a genuine self-hosting blocker: SELF-HOSTING-GUIDE.md presented Firebase as "optional — the app works fully without it," which stopped being true at ADR-0011. A forker following that guide would have deployed an app nobody could sign into. Rewritten as required, with a note that publishing `firestore.rules` is equally non-optional now that `userSettings/{uid}` exists, and a `VITE_MOCK_AI` row added.

A test pass followed. `persistence/settings.ts`, `persistence/settings-sync.ts`, and the backup round-trip had no coverage; they now do (20 tests). Writing them found a real bug: `mergeSettings` spread the remote object wholesale, so a backup file carrying keys outside the synced set could overwrite device-local fields such as `lastSyncedAt`. Firestore's rules block that on the sync path via `hasOnly`, but an imported file is user-supplied and had no equivalent guard. Now copied key by key.

Then the server side, which had **no tests at all** — including the grounding filter, the property [CLAUDE.md](../CLAUDE.md) describes as the core safety guarantee. The filter was inline in the request handler and untestable without one, so it moved to `api/_lib/grounding.ts` as pure functions (`groundedCitation`, `groundItems`, `groundChat`) and `api/generate.ts` now calls them. 18 tests cover it and `api/_lib/security.ts`: ungrounded items dropped, page numbers always taken from our own chunk data rather than a model claim, chat content discarded when no citation survives, the origin check's unset-means-open behaviour, and IP hashing being stable, salted, and irreversible.

Last, the mock-mode gap AI-INTEGRATION.md had flagged as real: fixtures covered only the happy path, so the quota wall and the error screens could not be seen without real credentials and a genuinely spent quota. Added `VITE_MOCK_FAILURE`, which forces any of the proxy error codes, plus an `UNGROUNDED` value that succeeds and returns nothing — the case where every item fails the server's citation check, which is a 200 with an empty result and therefore a different UI path from an error. A misspelled value throws with the list of valid ones rather than failing obscurely. Seven tests in `src/ai/client.test.ts`, and the doc's "covers only the happy path" caveat is now a table of what each value does.

A component-test pass followed, the first in the codebase: 14 tests across `StudyingSection`, `AppearanceSection`, and `DangerZone`, covering the behaviour that was broken or dead before this work — the cards-per-day clamp, theme defaulting to `system`, reduce-motion mapping onto its union, and the now-dismissible local-data warning. The layer-boundary ESLint rule blocked them from importing `persistence`, correctly for shipping code but not for a test whose whole point is asserting that a control persisted; `eslint.config.js` now exempts `**/*.test.{ts,tsx}` with that reasoning recorded inline. Production boundaries are unchanged.

**Finding: the accessibility sweep covers almost nothing.** `tests/e2e/axe-audit.mjs` lists ten routes, nine of them under `/app`. Since ADR-0011 made sign-in mandatory, the script has been reaching the sign-in gate for all nine and auditing that same screen repeatedly, reporting clean. Its sample-document seeding step clicks a button behind the gate and swallows the failure, which is why nothing surfaced. The script now detects the gate and names every route it could not reach, so a clean result states what it actually covered. Added the missing `npm run test:a11y` script and documented the gap in ACCESSIBILITY.md, which also claimed a Lighthouse check that does not exist.

The gap is now closed with the **Firebase Auth emulator**, chosen over a build-time gate bypass so that no auth bypass exists in the shipped app. CI starts the emulator; the audit script creates a user over its REST API and writes the session into the IndexedDB record the Firebase SDK reads at startup, so the app boots signed in through its ordinary path. Driving the emulator's own account-picker markup was rejected — it changes between emulator releases. `src/lib/firebase.ts` calls `connectAuthEmulator` only when `VITE_FIREBASE_AUTH_EMULATOR_HOST` is set, which happens in the CI accessibility job and nowhere else.

Verified locally end to end: with the emulator, all ten routes audit clean at both viewports, including the rebuilt settings page. Without it, the script reports all 18 route/viewport pairs as unreachable instead of silently passing — which is what had been happening.

The Lighthouse claim was resolved by deletion rather than implementation. Six documents stated a CI-enforced accessibility score of 95; no such check existed in any workflow. It was not built because Lighthouse's accessibility category runs `axe-core` internally and the sweep above already covers more — extra WCAG tag sets, two viewports, ten routes, and a horizontal-scroll check Lighthouse does not perform. A score of 95 is also a weaker gate than zero violations, since it tolerates some. The target is now stated as the check that actually runs; Lighthouse stays on the manual pre-release checklist for performance, where it is not redundant.

**Next action**
Nothing outstanding.

**Blockers**
None.

---

## 2026-07-31 — Final whole-branch review fix wave: CSP, service worker, hook error handling, offline UI, docs

**Done**
A final whole-branch review of the completed optional cloud sync feature (all 7 tasks below had already passed individual review) caught seven cross-task integration problems only visible with the whole feature assembled. Fixed all of them:

- **CSP blocked Firebase (Critical).** `vercel.json`'s CSP had no allowance for Firebase's origins, so Auth (redirect flow) and Firestore could not function in production. Added `https://identitytoolkit.googleapis.com`, `https://securetoken.googleapis.com`, `https://firestore.googleapis.com` to `connect-src`; `https://apis.google.com` to `script-src`; `https://*.firebaseapp.com` to a new `frame-src`. Recorded the tradeoff (a previously very tight CSP is now measurably relaxed for every visitor, not just signed-in ones) in ADR-0010's Consequences section, and updated SECURITY-AND-PRIVACY.md's CSP snippet to match.
- **Service worker precached the 503 KB Firebase chunk for everyone (Critical).** `vite.config.ts`'s `globIgnores` excluded the pdf/jszip lazy chunks but missed the Firebase chunk. Added `'**/firebase-*.js'` to `globIgnores` and a matching `runtimeCaching` entry (`firebase-sdk` cache), alongside the existing `lazy-parsers` entry. Confirmed by rebuilding: the firebase chunk no longer appears in `dist/sw.js`'s precache manifest.
- **No error handling on hook mount / signIn / restoreFoundBackup (Important).** `use-cloud-sync.ts`'s mount effect had no try/catch, so a failed dynamic import or `onAuthStateChanged` setup left `status` stuck at `'loading'` forever (a permanently empty Settings section). `signIn()` and `restoreFoundBackup()` could throw silently with no user feedback. All three now follow the same try/catch → `setStatus('error')` shape `syncNow()` already used.
- **Offline handling was speced but never built (Important).** The spec called for disabling Sign in/Sync now while offline, using the existing `OfflineBanner.tsx` pattern. Added a matching `navigator.onLine` + `online`/`offline` hook inside `CloudSyncSection.tsx`, disabling those two buttons and showing the existing `offline` copy when offline.
- **Security/privacy docs were now inaccurate (Important).** SECURITY-AND-PRIVACY.md claimed "no accounts, no user database," "data never leaves the device," and similar, all now false for a user who opts into cloud sync. Added "unless you opt into cloud sync" qualifiers throughout, added a Firestore row to the data-location table, and linked to ADR-0010. Added the six `VITE_FIREBASE_*` variables to SELF-HOSTING-GUIDE.md's environment variable list (`.env.example` is the source of truth for the exact names); `ARCHITECTURE.md` does not enumerate environment variables beyond one inline mention of `GEMINI_API_KEY` in the system diagram, so no change was needed there.
- **Deployment docs missing two required steps (Important).** DEPLOYMENT.md's "Turning on cloud sync" section was missing the Firebase Authorized-domains step (without it, sign-in fails with `auth/unauthorized-domain` on every new deployment URL — the most common Firebase-web setup mistake) and a note about the CSP requirement. Added both, plus a "known limitation" note that `signInWithRedirect` with the default `*.firebaseapp.com` authDomain can be degraded in browsers that block third-party storage access (Safari ITP, Firefox ETP) — a permanent property of choosing redirect over popup, not a bug.

Deferred (Minor severity, out of scope for this wave): comment length in `firebase.ts`, the error-state UI not offering sign-out, `restoreFoundBackup` not setting `lastSyncedAt`, overlapping `onAuthStateChanged` firings, `isBackupPayload`'s partial validation, the CI bundle-check chunk-selection issue.

**Verified**

- `npm run typecheck && npm run lint && npm test && npm run build` all pass.
- Rebuilt and confirmed `dist/sw.js` no longer lists the firebase chunk in its precache manifest.
- `vercel.json`'s CSP string checked for valid JSON and correct `;`-separated directive syntax.

---

## 2026-07-31 — Optional cloud sync feature complete: Firebase Auth + Firestore

**Done**

- **Tasks 1–6 combined:** Built the full optional cloud sync feature per ADR-0010. Feature is entirely opt-in and has zero impact on users who never sign in. Architecture is client-only: the Firebase JS SDK talks directly to Firestore from the browser, with access control enforced entirely by security rules (no server-side proxy).
  - Firebase Auth initialization (`src/lib/firebase.ts`, exports `firebaseAuth()`, `firestore()`, `googleProvider`). Public config values are injected via `VITE_FIREBASE_*` environment variables at build time; no credentials ever enter the client bundle.
  - Cloud Firestore backup push/pull (`src/persistence/sync.ts`, exports `pushBackupToCloud` and `pullBackupFromCloud`). When a user signs in on a new device, the hook checks Firestore (path: `backups/{uid}`) for a backup from another device signed into the same account. If found, it's offered for restore via a merge operation that imports everything without deleting any existing local data.
  - Hook (`src/hooks/use-cloud-sync.ts`, exports `useCloudSync()`): manages auth state, backup detection, and sync-now orchestration. Entirely dynamic imports to keep the Firebase SDK out of the main bundle until Settings actually opens the sync section.
  - Settings UI (`src/ui/pages/settings/CloudSyncSection.tsx`): wired to sign in/out via Google, manually trigger sync-now, display sync status and last-synced timestamp, and offer backup restore when one is detected on sign-in.
  - Backup merge logic ensures sign-out never deletes locally-stored documents, quizzes, or cards — the user's device-local work is always safe.
  - Database security rules (`firestore.rules`): each authenticated user can only read and write their own document at `backups/{uid}`. All other paths denied. No credentials are checked server-side; all access control is Firestore's responsibility.
- **Task 7 (this task):** Verification only, no code changes.
  - Full local check: `npm run typecheck && npm run lint && npm test && npm run build` — all pass. TypeScript strict mode, 41 unit tests across 9 test files, build 5.78s.
  - Bundle isolation confirmed via `grep -rl "firebase" dist/assets/index-*.js` — no matches. Firebase and all its dependencies are in `dist/assets/firebase-BlHV8pKt.js` (502.87 KB raw, 132.39 KB gzipped), a separate lazy-loaded chunk. The main app entry chunk (`index-DjV_JkrW.js`, 271.29 KB raw, 87.90 KB gzipped) carries zero Firebase code and stays under the 300 KB gzip budget.

**Manual end-to-end test (still owed)**
The following verification requires a real Firebase project with Google OAuth configured, which does not exist in this environment — it is the user's own follow-up step:

- Two browser profiles or windows signed into the same Google account
- Profile A: upload a document, generate a quiz, sign in, tap "Sync now"
- Profile B: sign in with the same Google account, restore the backup from Profile A
- Profile B: confirm document and quiz appear in the library
- Profile B: sign out, confirm local data remains (sign-out deletes nothing)
- Either profile: reload with zero sign-in, confirm the app is fully usable offline with no account UI

For setup steps, see DEPLOYMENT.md's "Turning on cloud sync" section and review the `firestore.rules` security policy at the repo root.

**Verified**

- Typecheck (app + `api/` folder), lint, full test suite (41 tests), and build all green.
- Bundle isolation: Firebase in a separate lazy chunk, not in the main entry point.
- No UI or CSP-related files were touched by this task (Task 7 ran automated checks only). **Update:** a later final-review pass (see the entry above, same date) found this feature could not actually work in production without CSP changes — `vercel.json` was updated then to allow Firebase's required origins.

---

## 2026-07-30 — Deploy target switched to Vercel; PPTX/DOCX/EPUB parsing built

**Done**

- Switched deploy target from Cloudflare Pages to Vercel. `vercel.json` now carries the security headers previously in `public/_headers` (removed, along with `public/_redirects`, since Vercel doesn't read Cloudflare-style config files). See ADR-0009, which supersedes ADR-0003.
- Built real `.pptx`, `.docx`, and `.epub` parsing per ADR-0005: `src/parsing/formats/pptx.ts` (jszip, slide XML), `docx.ts` (mammoth), `epub.ts` (jszip, container/OPF/spine reader). Wired into `src/parsing/index.ts`, replacing the "Milestone 7" placeholder that threw `unsupported` for these formats.
- Unit tests for pptx and epub parsers using in-memory zip fixtures (`pptx.test.ts`, `epub.test.ts`) — 6 new tests, all passing. No docx test yet; fabricating a real docx binary for mammoth needs a more involved fixture.

**Verified**

- Typecheck, lint, full test suite (15 tests), and build all green.

## 2026-07-30 — Real BM25 retrieval for ask-your-document chat

**Done**

- Built `src/domain/retrieval/bm25.ts`: client-side BM25 ranking with heading-path structural boosting, per ADR-0006.
- Replaced the naive term-overlap scoring in `src/ai/client.ts:answerQuestion` with `bm25Rank`, keeping the same function signature and citation shape — no caller changes needed.
- 5 unit tests in `bm25.test.ts` covering ranking correctness, empty query/document handling, heading boost, and topK.

**Verified**

- Typecheck, lint, full test suite (20 tests), and build all green.

## 2026-07-30 — Offline support via `vite-plugin-pwa`

**Done**

- Installed `vite-plugin-pwa`, configured in `vite.config.ts`: web app manifest (name, icons, theme color, standalone display), service worker precaching the app shell.
- Generated `public/icons/icon-192.png`, `icon-512.png`, `maskable-512.png` from the existing `favicon.svg` (one-time `sharp` conversion, then `sharp` removed — it was a dev-only tool, not a runtime dependency).
- Added `apple-touch-icon` link to `index.html` for iOS home-screen installs, per ADR-0007.
- Excluded the PDF worker (1.3 MB) and the pdf/jszip vendor chunks from the service worker's precache list (`globIgnores`), and cache them at runtime instead, the first time a document of that type is actually opened. Precaching them upfront would have defeated the point of lazy-loading them (see ADR-0005).

**Note for later**

- `.github/workflows/ci.yml`'s bundle-size check picks `find dist/assets -name 'index-*.js' | head -1`, which assumed exactly one `index-*.js` chunk. Vite now also names some lazy dynamic-import chunks `index-*.js` (e.g. the chunk containing `mammoth`), so this check may not always grab the real entry chunk. Not fixed here since every current `index-*.js` chunk is still under the 300 KB gzip budget regardless of which one gets picked, but worth tightening the glob (e.g. match the hash from `dist/index.html`'s script tag) if this ever becomes a real gap.

**Verified**

- Typecheck, lint, full test suite (20 tests), and build all green. `dist/sw.js` and `dist/manifest.webmanifest` generate correctly; `dist/` stays gitignored.

## 2026-07-30 — Export: backup file, Anki/Quizlet CSV

**Done**

- Whole-app JSON backup: `src/domain/export/backup.ts` (payload shape, `isBackupPayload` type guard), `src/persistence/backup.ts` (`exportBackup`/`importBackup`, restore is a merge via `bulkPut`, never destructive). Settings (including the user's own API key) are deliberately excluded from the backup file, since a backup is meant to move between devices or be shared.
- Wired into Settings under "Your data" (`SettingsPage.tsx`, `src/hooks/use-backup.ts`): download a backup, or restore one from a file picker, with a status message on success or a bad file.
- Anki/Quizlet CSV export: `src/domain/export/csv.ts` (generic CSV builder with proper quoting) and `deck-export.ts` (`buildCardsCsv`, front/back, no header — both destinations import the same plain CSV with no app-specific format). Wired into the flashcards page as two buttons next to a deck once it has cards.
- `src/lib/download.ts`: shared client-side file-download helper (Blob + temporary anchor), used by both the backup and CSV exports.
- 7 new unit tests across `deck-export.test.ts` and `backup.test.ts`.

**Verified**

- Typecheck, lint, full test suite (27 tests), and build all green. Initial bundle unchanged at ~87 KB gzipped.

## 2026-07-30 — Streak mechanic

**Done**

- `src/domain/streak/streak.ts`: pure `recordStudyDay` function implementing the rule already implied by the existing copy (`streak.active`/`graceUsed`/`broken` in `copy/labels.ts`) and the existing `Settings` fields (`streakCount`, `streakLastDay`, `streakGraceUsed`) — both were already in place but nothing ever updated them. One missed day is forgiven once per streak; a second miss, or missing more than one day, resets it to 1.
- `src/hooks/use-streak.ts` (`useRecordStudyDay`): reads settings fresh and writes the update, called from `useRateCard` (flashcard rating) and `useQuizSession`'s `answer` callback (quiz question answered) — the two study actions that are actually wired up end to end today.
- The dashboard's streak stat (`DashboardPage.tsx`) already read `settings.streakCount`; it now reflects real activity instead of always showing 0.
- 7 unit tests in `streak.test.ts` covering same-day no-op, normal continuation, the one-day grace, breaking after the grace is spent, and breaking after a longer gap.

**Note for later**

- `saveAttempt` (`src/persistence/study.ts`) is defined but never called from the quiz or exam flow, so quiz/exam completions do not currently feed the dashboard's accuracy trend or weak-topics view, and are not counted toward the streak either. Not fixed here — it is a separate, pre-existing gap in the quiz/exam completion flow, not part of the streak mechanic itself.

**Verified**

- Typecheck, lint, full test suite (34 tests), and build all green.

## 2026-07-30 — Dependency cleanup: unused Radix packages

**Done**

- Removed `@radix-ui/react-progress`, `@radix-ui/react-radio-group`, `@radix-ui/react-label`, `@radix-ui/react-tabs` from `package.json` — confirmed unimported anywhere in `src`, since progress bars and tabs were already hand-rolled in CSS (`QuizProgress.tsx`, `ParseProgressPanel.tsx`).
- Left `@radix-ui/react-tooltip` and the `motion` package alone for now: both are candidates for actual use in the upcoming UI/motion pass (a citation hover-preview tooltip, and three specific motion moments), so the final keep/remove call happens there instead of removing them here and possibly re-adding them a third time.

**Verified**

- Typecheck, lint, full test suite (34 tests), and build all green. No behaviour change.

## 2026-07-30 — UI/UX pass: shadcn CLI, tooltip, motion in three places

**Done**

- Ran the real `shadcn@latest` CLI (`--base radix`, matching the Radix primitives already installed) to write `components.json`, formalizing what was previously hand-rolled without the tool. Aliases point at the project's actual structure (`@/ui/components`, `@/ui/components/primitives`), not the shadcn default `@/components/ui`.
  - The CLI's Windows path resolution didn't pick up the `@/*` alias from `tsconfig.app.json` (it only has an empty root `tsconfig.json` referencing it), so `add` wrote files under a literal `./@/...` folder; moved by hand into `src/ui/components/primitives/` after each add.
  - Added one new component this way: `tooltip.tsx`. Rewired its import from the CLI's default `radix-ui` unified package (not installed) to the project's existing `@radix-ui/react-tooltip`, and replaced the generated `bg-foreground`/`text-background` classes (this project has no such tokens) with the real ones (`bg-fg`/`text-bg`), plus a CSS keyframe (`.tooltip-content` in `globals.css`) instead of the Tailwind `animate-in` utilities this project doesn't have installed.
  - Did not re-add Button/Dialog/Accordion/Switch: shadcn's current default targets Base UI, a different primitive library from the Radix packages already installed and working. Re-adding would mean adopting a second, incompatible primitive library rather than a like-for-like diff. The hand-rolled Radix versions stay as they are.
  - Wired the new tooltip onto the one icon-only affordance in the app (the read-aloud button in `Flashcard.tsx`) — the only place a hover label actually helps, since it doesn't affect the `aria-label` mobile/screen-reader users already get.
- Motion, in exactly three places, per `App.tsx`'s own existing comment ("Marketing carries a display webfont and the motion library. The app must not pay for either"):
  1. **Hero entrance** (`Hero.tsx`, marketing-only, already lazy-loaded): a real `motion`-driven staggered fade/slide-up on eyebrow, headline, subhead, and the drop zone, respecting `useReducedMotion`. This is the only file importing `motion` in the whole app.
  2. **Route transitions** (`AppLayout.tsx`): a plain CSS cross-fade (`.route-fade` in `globals.css`), keyed on `location.pathname`, not the `motion` library — the app shell must not pay for a dependency that belongs to the marketing chunk.
  3. **Answer feedback** (`AnswerFeedback.tsx`): upgraded from the generic `.motion-enter` keyframe to a dedicated `.answer-feedback-enter` keyframe with a small overshoot-then-settle, closer to spring physics, still plain CSS.
- Everything else (progress bars, accordions, dialogs) stays untouched and CSS-only.

**Verified**

- Typecheck, lint, full test suite (34 tests), and build all green. Marketing's lazy chunk grew to carry `motion` (~45 KB gzipped) as expected; the app's initial entry chunk is unchanged at ~87.5 KB gzipped, still well under the 300 KB CI budget.

## 2026-07-30 — SEO/share basics, brand asset check

**Done**

- Added Open Graph and Twitter Card tags to `index.html`, reusing the existing description copy, image pointed at the PWA's `icon-512.png`. `og:image`/`twitter:image` are relative paths for now — noted in the sitemap comment as a to-do once a real production domain exists (Vercel go-live, next up).
- Added `public/sitemap.xml`, listing only `/`: everything under `/app/*` is a client-only shell over local browser data, nothing there for a crawler to index. Referenced it from `robots.txt`.
- Checked the brand-asset question flagged in the earlier audit (`dist/brand/*.png` with no source in `public/`): confirmed it was stale build output from before the two deliberate reverts (`c4a6969`/`90542b0` reverted by `0be3fe9`/`7ca718a`), not a live gap — `dist/` is gitignored and rebuilds fresh, and a current build produces no `dist/brand/` at all. Treating the revert as final: `favicon.svg`-only is the intended state, nothing to restore.

**Verified**

- Build produces `dist/sitemap.xml` and `dist/robots.txt` correctly; no stray `dist/brand/`. Typecheck, lint, and full test suite still green (unaffected by this change).

## 2026-07-30 — Go-live docs rewritten for Vercel; zero-cost launch plan complete

**Done**

- Rewrote `docs/04-OPERATIONS/DEPLOYMENT.md` from scratch: it described Cloudflare Pages, Wrangler, and Workers KV throughout, none of which apply after ADR-0009. It also claimed a `VITE_MOCK_AI` env var and a `.env.example` that never existed — `src/ai/client.ts` has always used a hardcoded `IS_MOCK_MODE = true`, no env var involved.
- New structure: a "Deploying today" section that gets the actual, working app (real parsing, real storage, real spaced repetition, mock-generated content) live on Vercel for $0 right now, and a separate "Turning on real AI generation" section that honestly describes this as _not built yet_ and lays out the exact steps for later (Gemini key, Upstash Redis for quota instead of Workers KV, `api/generate.ts`, flipping `IS_MOCK_MODE`).
- This closes out the full audit-and-build pass: every phase from the original plan (deploy target, missing file formats, real retrieval, offline support, exports, streak, dependency cleanup, UI/motion polish, SEO basics, go-live docs) is done. The one deliberately unbuilt piece — the real AI proxy — was held back by explicit choice, not oversight, and is fully specified for whenever it's picked up.

**Verified**

- Typecheck, lint, full test suite (34 tests), and build all green. This was also a final end-to-end check of everything built across the session.

## 2026-07-30 — First live end-to-end test: two more real deploy bugs found and fixed

**Done**

- **`/api/generate` 404ing in production**: `vercel.json`'s SPA rewrite was `"source": "/(.*)"`, matching every path including `/api/generate` — Vercel's rewrite matched before the function router got a chance, so every API call returned the SPA's `index.html` (reported by the browser as 404 since it wasn't JSON). Changed the source to `/((?!api/).*)` so `/api/*` is excluded from the fallback. Confirmed fixed by curling the live endpoint directly: `403 FORBIDDEN` (correct — no Origin header) instead of `404`.
- **`gemini-2.5-flash` returns 404 "no longer available to new users"**: confirmed by curling Google's API directly with the real key — the key itself is valid (auth passed), but that specific dated model id has been retired for accounts created after some point, with no warning anywhere in the docs this project was built from. Switched the default model, `.env`/`.env.example`, and every doc reference to `gemini-flash-latest` — Google's own rolling alias, so this can't happen again from a stale pinned version. Verified end-to-end with real `responseSchema` structured output against the live key: clean JSON back, model resolved to `gemini-3.6-flash` under the alias.
- Diagnosed both by testing the actual deployed endpoint and the actual Gemini API directly with curl, rather than reasoning about the code — the first two "fixes" that looked plausible from the browser console (CSP hash, `QuotaResult` narrowing) were real but didn't explain the 404 the user kept hitting; only calling the live endpoint directly surfaced the rewrite bug, and only calling Google's API directly with the actual key surfaced the model retirement.

**Verified**

- Live curl to `/api/generate` with a valid origin now reaches Gemini (was 404, now the request pipeline completes). Direct Gemini API test with the real key and a `responseSchema` matching this project's structured-output usage: `200`, valid JSON, matches the shape the app expects.
- Typecheck, lint, full test suite (37 tests), and build all green.

**Verified end-to-end through the real UI**: quiz generation produced a genuine grounded multiple-choice question from the uploaded PDF (not the mock fill-in-blank shape).

## 2026-07-30 — Chat 504s: Edge Function's 25s ceiling vs Gemini's thinking latency

**Done**

- Chat requests intermittently returned `504 Gateway Timeout` from `/api/generate` in production. Measured real latency by curling Gemini directly with the exact prompt/schema shape `api/_lib/gemini.ts` sends for a chat answer: 4-8s typical, with `thoughtsTokenCount` (the newer Gemini models' extended-reasoning cost) varying widely per call — 121 tokens for a one-word reply in one test, 1169 for a real grounded answer in another, with no config on our side controlling it (`thinkingConfig.thinkingBudget: 0` was rejected outright by this model with `400 INVALID_ARGUMENT`; `thinkingLevel: "low"` was accepted but produced more thinking tokens than the unconfigured default in testing, not less).
- Root cause: `api/generate.ts` ran on Vercel's Edge runtime, which has a hard 25-second execution ceiling that cannot be raised on any plan, regardless of `maxDuration`. Given the variance just measured, an occasional slow "thinking" response was always going to clip against that wall.
- Switched off Edge entirely — removed `export const config = { runtime: 'edge' }`, added `export const maxDuration = 60`. No handler code changed: Vercel's Node.js runtime accepts the same `Request → Response` signature this file already used. Node functions allow up to 60s on Hobby (300s on Pro), comfortably covering the observed worst case with room to spare.

**Verified**

- Typecheck, lint, full test suite (37 tests), and build all green.
- Confirmed `crypto.subtle` (used in `api/_lib/security.ts`'s `hashIp`) is available as a Node global under Vercel's Node 20 runtime, so no other code needed to change for the runtime switch.

## 2026-07-30 — Function invocation crash, and the free tier is much tighter than assumed

**Done**

- The Edge→Node runtime switch above didn't fix chat — it changed the failure from `504` to `500`, and the raw response showed `X-Vercel-Error: FUNCTION_INVOCATION_FAILED` with a plain-text body, meaning our own error handling never even ran. The Web-standard `(request: Request) => Response` handler signature — valid, type-checks, builds cleanly — crashed on actual invocation as a Vercel Node Function.
- Rewrote `api/generate.ts` to Vercel's classic, long-documented Node Function signature: `(req: VercelRequest, res: VercelResponse) => Promise<void>`, using `@vercel/node`'s types (added as a dev dependency). `api/_lib/security.ts`'s `isAllowedOrigin`/`clientIp` no longer take a Fetch `Request` — they take plain header values now, decoupling the security helpers from any particular handler style.
- Separately, checking Google AI Studio's own rate-limit dashboard while debugging surfaced a real, unrelated problem: the free tier's daily request cap on regular Flash models (`gemini-3.5-flash`, `gemini-2.5-flash`, `gemini-3.6-flash` — whichever the `gemini-flash-latest` alias happened to resolve to across different calls) measured as low as **20 requests/day for the whole project**, already exceeded from testing alone. The Lite variants (`gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`) measured **500/day** on the same account. Switched `GEMINI_MODEL` default to `gemini-flash-lite-latest` everywhere (code, `.env`, `.env.example`, both deploy docs) — the app's structured JSON generation from a short passage doesn't need a larger model's extra reasoning depth, and 20/day would have made the shared key nearly unusable for even light testing.

**Verified**

- Typecheck, lint, full test suite (37 tests), and build all green.
- Not yet re-verified against the live deployment — the previous `FUNCTION_INVOCATION_FAILED` finding came from curling the live endpoint directly, but further live testing was intentionally held off this round to avoid spending more of the now-known-scarce daily quota before this fix is even deployed.

## 2026-07-30 — Post-deploy fixes: Vercel function typecheck, CSP, colour contrast

**Done**

- **Vercel function typecheck** (`api/_lib/quota.ts`): `QuotaResult` was a discriminated union on `ok: true | false`. Vercel typechecks `api/` with its own config, which is not strict, and without `strictNullChecks` those boolean literal types widen so `if (!quota.ok)` stops narrowing — `error TS2339: Property 'reason' does not exist on type 'QuotaResult'`. Replaced with a flat `{ ok: boolean; reason: QuotaReason }` (added an `'OK'` reason) so it type-checks under either strictness. Verified by compiling `api/generate.ts` with non-strict flags matching Vercel.
- **CSP blocking the theme script**: the inline anti-flash script was allowlisted by a `sha256-` hash in `vercel.json`. The hash is computed over exact bytes, so a Windows checkout and Vercel's Linux build disagree on line endings and the hash never matches in production — the script was blocked on every page load. Moved it to `public/theme-init.js` and dropped the hash; `script-src 'self'` covers a same-origin file and there is nothing left to keep in sync. Also removed `https://generativelanguage.googleapis.com` from `connect-src`, left over from when the browser called Gemini directly — it now goes through the same-origin proxy, so that entry was dead allowlist.
- **Real contrast failures** (`src/styles/tokens.css`): dark-theme `--accent: #818cf8` as active-nav text measured 4.15 on `--surface-raised` (bottom nav) and 3.94 on the accent-soft sidebar fill, both under the 4.5 minimum. Lightened to `#9aa5fb` (worst case now 5.13) with `--accent-hover` moved to `#c7d0fe` to stay distinguishable. Light theme was already passing and is unchanged.
- **False contrast failures** (`tests/e2e/axe-audit.mjs`): the remaining CI failures on `/` were an artifact of the new hero entrance animation, not a real defect — the audit ran axe at a fixed 500ms while the stagger was still fading in, so it sampled half-transparent text (foregrounds like `#0a0d18` on `#080b16`, and the same element reporting different colours per viewport gave it away). The audit now runs with `reducedMotion: 'reduce'` and waits for `document.getAnimations()` to settle, so it measures the resting state. That also covers the reduced-motion path.

**Verified**

- Full axe sweep across all 10 routes at both viewports: clean. Separately ran the same sweep forced to light theme: also clean.
- Typecheck (app + `api/`), lint, full test suite (37 tests), and build all green.

## 2026-07-30 — The real AI proxy: shared Gemini key, no setup for visitors

**Done**

- Reversed the earlier "plan only" call on the AI proxy — the owner wants a shared key so visitors get real generated content with zero setup, per ADR-0002's original design.
- Built `api/generate.ts` (Vercel Edge Function) plus `api/_lib/security.ts` (origin check, salted IP hashing), `api/_lib/quota.ts` (Upstash-backed per-IP and global daily counters, kill switch, fail-closed), and `api/_lib/gemini.ts` (prompt assembly and JSON-schema response per kind — questions, cards, chat).
- Grounding safety: the model only ever sees a chunk's id and text, never a page number. Every returned item is dropped unless its `chunkId` matches one actually sent, and the page numbers in the final citation always come from the app's own chunk data, never a model-claimed page.
- `src/ai/client.ts`: `IS_MOCK_MODE` is now `import.meta.env.DEV` (was hardcoded `true`) — `npm run dev` still needs no credentials, a real build calls `/api/generate`. The three exported functions now map the proxy's response into the same `Question`/`Card`/`ChatReply` shapes the mock path always produced, so no caller changed.
- Wired the existing-but-unused `settings.userApiKey` (BYOK) through to every generation call site (`use-generation.ts`, `use-deck.ts`) — saving a key in Settings previously did nothing at all; now it bypasses the shared quota as ADR-0002 always intended.
- Added `.env.example` (didn't exist before) documenting all seven variables, and a matching `tsconfig.api.json` + `npm run typecheck`/`build` updates so the `api/` folder is actually type-checked.
- Found and fixed a real, pre-existing bug while wiring this up: the root `npm run typecheck` script (`tsc --noEmit` against a references-only root `tsconfig.json`) silently checked nothing in `src/` — confirmed by deliberately introducing a type error, which `typecheck` missed but `build`'s `tsc -b` caught. Fixed by changing the script to `tsc -b` (build mode actually validates referenced projects). CI was still safe because its separate build step catches what typecheck was silently missing, but a contributor trusting `npm run typecheck` alone was getting a false pass.
- Added `src/lib/generation-error.ts` mapping proxy error codes to the existing `quota`/`generic` copy (both already fully written in `copy/errors.ts`, never wired to anything), and wired it into the three generation call sites that previously either showed a hardcoded generic string (`use-quiz-session.ts`) or swallowed the error entirely with no message at all (`ExamPage.tsx`, `use-deck.ts`).
- Rewrote `docs/04-OPERATIONS/DEPLOYMENT.md` and `docs/07-OPEN-SOURCE/SELF-HOSTING-GUIDE.md` again — both previously described the proxy as unbuilt; now describe the real setup (Gemini key, Upstash database, Vercel env vars, kill switch via Upstash REST calls). Updated `README.md`'s status line, feature list, and tech table (Vercel/Vercel Edge Function, not Cloudflare).

**Known follow-up, not fixed here**

- A broader sweep found roughly twenty other docs (mostly early planning docs under `docs/01`–`docs/06`, `docs/09-SPECS/`) still reference Cloudflare, Wrangler, or Workers KV from before any code existed. Not touched in this pass — fixing all of them accurately needs its own dedicated review rather than a speculative find-and-replace.

**Verified**

- Typecheck (including the new `api/` project), lint, full test suite (37 tests), and build all green. Confirmed no secret-shaped strings (`GEMINI_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`, `IP_HASH_SALT`) anywhere in `dist/` after a real build.
- Not yet verified against a live deployment: needs a real Gemini key and Upstash database in the Vercel dashboard, per the rewritten DEPLOYMENT.md.

## 2026-07-30 — Frontend built: marketing page and full app shell

**Done**

- Scaffolded Vite + React 19 + TypeScript (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) + Tailwind v4.
- Built `src/styles/tokens.css` from DESIGN-SYSTEM.md, plus the new marketing tokens (`--ink`, `--mark`, `--paper`).
- ESLint layer boundaries wired from the first commit. They caught five real violations during the build, all fixed by routing through hooks.
- Marketing page at `/`: nine sections, working drop zone in the hero, scroll-driven amber thread, real cost table.
- Every app route built: library, parse, document hub, quiz, flashcards, review, chat, exam, dashboard, settings.
- Real PDF text extraction via `pdfjs-dist` with page numbers and bookmark outlines; page-range fallback when no outline exists. Real Dexie persistence on the v1 schema.
- FSRS scheduling through `ts-fsrs`, with the resulting interval shown on each rating button.
- Mock generation in `src/ai/client.ts`. On the sample document it serves hand-written questions; on a real upload it builds genuinely grounded fill-in-the-blank and true/false questions from the user's own sentences, citing real pages.
- All copy in `src/copy/`, taken verbatim from CONTENT-AND-COPY-GUIDE.md where it existed.
- Print stylesheet for exams. `_headers` with the CSP from SECURITY-AND-PRIVACY.md, including a hash for the inline theme script. CI with typecheck, lint, test, build, key scan, payment-language scan, bundle budget, and an axe sweep.

**Decisions**

| Area             | Decision                                                                                                          | Recorded in          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------- |
| Visual direction | Expressive marketing page, calm app, one codebase                                                                 | ADR-0008             |
| Citation styling | Promoted from muted 12px caption to an amber tappable chip                                                        | DESIGN-SYSTEM.md     |
| Charts           | Hand-written SVG. `recharts` never installed.                                                                     | OPEN-QUESTIONS.md Q1 |
| Animation        | CSS `animation-timeline`, no library. `motion` installed, found unnecessary, removed. GSAP rejected on licensing. | TECH-STACK.md        |
| Typography       | Newsreader variable serif, self-hosted, marketing route only                                                      | ADR-0008             |

**Verified**

- Typecheck, lint, and 9 unit tests green.
- axe-core clean across all 10 routes at 390px and 1280px, with no horizontal scroll at 320px.
- A real PDF uploaded through the hero drop zone, parsed, stored, and quizzed end to end.
- Initial bundle 87 KB gzipped against a 300 KB budget. `pdfjs` (108 KB gz) lazy-loads only for PDFs. Marketing CSS and font are in their own chunk.

**Bugs found and fixed during the build**

- `getSettings()` wrote a default row inside a `useLiveQuery`, which Dexie runs in a read-only transaction. Split the read from the seed.
- StrictMode double-invoked the parse effect, and a destructive `takePendingFile()` left the second pass with no file. Now peeks and clears once parsing settles.
- Quiz silently returned three questions when ten were asked for. Now says how many were left out and why.

**Status**
Marketing page and full app shell working on mock generation. Milestones 0, 2, 3, 5, 6, 8, 9, and 11 are substantially covered; Milestone 4 (the proxy) is not started.

**Next action**
Milestone 4: write `functions/api/generate.ts`, the quota counters, and the grounding validator, then point `src/ai/client.ts` at it.

**Blockers**
None for coding. Three things cannot be verified from this environment and remain open: printing an exam on actual paper, real-device testing on Android and iOS, and the Gemini daily request figure.

**Not yet built**
`.pptx`, `.docx`, and `.epub` parsing (Milestone 7); the Milestone 1 parsing refinements (multi-column clustering, hyphen rejoining, running-header stripping, scan detection); BM25 retrieval; explanations at three depths; Anki and Quizlet export; the service worker and offline support; the streak mechanic.

---

## 2026-07-30 — Planning phase complete

**Done**

- Ran a full brainstorming session and locked eight foundational decisions (see table below).
- Verified free-tier facts for Gemini API, Cloudflare Pages, Vercel Hobby, Supabase, and OpenRouter against current public sources.
- Wrote the complete planning documentation set under `docs/` — product, design, architecture, operations, engineering, planning, open-source governance, and seven ADRs.
- Rewrote the root `README.md` as a real project README.

**Decisions locked**

| Area           | Decision                                                                                                                   | Recorded in                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| AI provider    | Google Gemini 2.5 Flash, free tier, single shared project key                                                              | ADR-0002                     |
| Key protection | Shared key held server-side in a Cloudflare Pages Function; per-IP daily quota; optional user-supplied key as escape hatch | ADR-0002                     |
| Storage        | Local-first in the browser (IndexedDB). No accounts in v1. Cloud sync deferred to v2.                                      | ADR-0001                     |
| Hosting        | Cloudflare Pages, not Vercel                                                                                               | ADR-0003                     |
| Framework      | Vite + React SPA, not Next.js                                                                                              | ADR-0004                     |
| File parsing   | Entirely in the browser                                                                                                    | ADR-0005                     |
| Retrieval      | Client-side BM25 keyword search, no embedding API                                                                          | ADR-0006                     |
| Mobile         | Responsive installable PWA, not a native app                                                                               | ADR-0007                     |
| Language       | English only for v1, both UI and generated content                                                                         | NON-GOALS-AND-SCOPE.md       |
| Primary user   | Student studying alone, close to an exam                                                                                   | TARGET-USERS-AND-PERSONAS.md |

**Notable finding during research**
Vercel's Hobby plan explicitly forbids commercial use and pauses the site when the bandwidth cap is hit. Cloudflare Pages permits commercial use and does not cap bandwidth. This flipped the hosting choice.

Supabase pauses free projects after seven days without a database request. For a study tool with bursty, exam-season usage, that is a serious failure mode. It is the main reason v1 stores everything locally instead.

**Status**
Planning done. No application code written yet.

**Next action**
Begin Milestone 0 in BUILD-ORDER.md: scaffold the Vite + React + TypeScript + Tailwind project and get an empty page deploying to Cloudflare Pages.

**Blockers**
None. One item needs doing before launch, not before coding: confirm the current Gemini free-tier request-per-day figure against Google's official rate-limit page, since public sources disagree (see ZERO-COST-INFRASTRUCTURE.md).

---

## How to use this log

Add an entry whenever you finish a work session or make a decision worth remembering. Keep the shape consistent:

- **Done** — what actually got finished
- **Decisions** — what was decided and where it is recorded
- **Status** — where things stand right now
- **Next action** — the single next thing to do
- **Blockers** — what is stopping progress, or "None"

Do not commit this file together with feature code. Keep it in its own commit.
