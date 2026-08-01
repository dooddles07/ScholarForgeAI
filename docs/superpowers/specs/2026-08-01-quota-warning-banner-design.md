# Quota warning banner — design

Status: approved (autonomous — see note below)
Date: 2026-08-01

## Note on process

This spec was produced non-interactively per the task instructions: brainstorming happened solo,
reasonable calls are documented below rather than gated on human approval, and the work proceeds
straight to implementation after this doc is written.

## Problem

`/api/generate` returns `quotaRemaining` on every successful response. `src/ai/client.ts` already
exposes it via `GenerateOptions.onQuotaRemaining` and `callProxy` already invokes it — confirmed by
reading `src/ai/client.ts` and its test `src/ai/client.test.ts`, which covers the plumbing at the
client layer (`invokes onQuotaRemaining when the proxy response carries the field`). Nothing above
that layer passes the callback or does anything with the number, so a user currently only learns
their quota is gone when a generation request fails with `QUOTA_EXCEEDED` (handled today by
`src/lib/generation-error.ts` + `quota` copy in `src/copy/errors.ts`).

## Goal

Warn a user before they hit the wall, without building a general-purpose toast system or a
persistent counter the codebase has no precedent for.

## Existing precedent surveyed

- `src/ui/layouts/OfflineBanner.tsx` + `src/hooks/use-is-offline.ts`: a global banner mounted once
  in `AppLayout`, driven by a hook, animated open/closed with a `grid-template-rows` transition,
  `role="status"` + `aria-live="polite"`, icon + one line of copy, **no dismiss control** — it
  clears itself when the underlying condition clears (back online).
- `src/ui/pages/settings/components/DataSection.tsx`: an inline `role="status"` warning tied to a
  local threshold constant (`WARN_PERCENT`), scoped to one page, not reusable across routes.
- `src/ui/pages/settings/DangerZone.tsx`: a persistent-until-acknowledged notice backed by a
  `hasSeenLocalDataWarning` flag written to Dexie settings, with a "Got it" dismiss button.
- No toast/notification system, no `Context`, no external state library (`zustand`/`jotai`) exists
  anywhere in `src/`. Cross-cutting ephemeral state that isn't page-local currently has exactly one
  pattern: a browser-event-driven hook (`useIsOffline`) feeding a layout-level banner.

Quota generation happens from several different routes (quiz, exam, flashcards-via-deck-build,
chat), so the warning has to be visible regardless of which page triggered the low reading and
regardless of which page the user is on when it's shown — this rules out a page-local banner like
`DataSection`'s and points at the `OfflineBanner` pattern instead.

## Decision

Mirror `OfflineBanner` exactly: a small module-level pub/sub store (no Context, no new dependency)
feeding a `useSyncExternalStore` hook, rendered as one more banner in `AppLayout`. No dismiss
button, no persistence to Dexie, no separate "toast" concept.

**Why no dismiss control**, even though `DangerZone` has one: `DangerZone`'s notice is about a
one-time fact (data is local unless synced) worth silencing forever. A low-quota reading is a live
number that only ever moves down over the course of a day — the honest thing to show is the
current number, not a boolean the user can hide until it goes stale. This matches `OfflineBanner`'s
choice not to offer a dismiss for "you are offline": the banner should track ground truth, and
ground truth here is `quotaRemaining` itself, not "have I annoyed the user about this before."
Adding a dismiss with re-show-on-further-drop logic was considered and rejected as unneeded
complexity for a warning that is already non-blocking and already low-frequency (it can only
appear after a successful generation, i.e. at most once per generation action).

**Why not a persistent always-visible counter**: no existing pattern shows a running number
(cards-due count, storage percentage) outside its own settings/dashboard context; a global "N
generations left" chip visible at all times would be new surface area the task explicitly said not
to add without evidence of an existing pattern, and none was found.

**Threshold**: 5, per the task's own suggested default. Exported as `LOW_QUOTA_THRESHOLD` from the
hook module so the value has one home and the test can reference it instead of a hardcoded literal.

## Architecture

```
ai/client.ts (unchanged)
  -> options.onQuotaRemaining(n) on every successful proxy call
       |
       v
hooks/use-generation.ts, hooks/use-deck.ts   (bridge, per CLAUDE.md layering)
  -> pass { onQuotaRemaining: reportQuotaRemaining } into generateQuestions / answerQuestion / generateCards
       |
       v
hooks/use-quota-warning.ts                    (new: module-level store + hook)
  - reportQuotaRemaining(n): plain function, updates the singleton, notifies subscribers
  - useLowQuotaWarning(): number | null via useSyncExternalStore — null unless 0 <= n < threshold
       |
       v
ui/layouts/QuotaBanner.tsx                     (new: presentational, mirrors OfflineBanner)
  - mounted in ui/layouts/AppLayout.tsx next to <OfflineBanner />
```

`reportQuotaRemaining` is a plain exported function, not a hook, specifically so it can be handed
directly as `onQuotaRemaining` from `hooks/*.ts` without those hooks needing to call `useCallback`
gymnastics or re-render on every quota tick themselves — only the banner subscribes to the value.

### Layer boundary check

- `hooks/use-quota-warning.ts` imports only `react` — no layer violation.
- `hooks/use-generation.ts` / `hooks/use-deck.ts` (already `hooks/`, which may import anything)
  import the new hook module — fine.
- `ui/layouts/QuotaBanner.tsx` imports `@/hooks/use-quota-warning` and `@/copy/errors` only — both
  allowed for `ui/` (hooks/ and copy/ are on the allowed list; parsing/persistence/ai are not
  touched).

## Scope of call sites

Three call sites pass through `GenerateOptions` today, found by grepping `src/hooks` and
`src/ui/pages` for `generateQuestions(`, `generateCards(`, `answerQuestion(`:

- `useGenerateQuestions` in `src/hooks/use-generation.ts` — used by
  `src/ui/pages/quiz/use-quiz-session.ts` and `src/hooks/use-exam.ts`. Wiring it once here covers
  both quiz and exam.
- `useAskDocument` in `src/hooks/use-generation.ts` — used by `src/ui/pages/chat/ChatPage.tsx`.
- `useGenerateDeck` in `src/hooks/use-deck.ts` — used by the flashcard deck build flow.

`useMakeCardsFromMissed` (`src/hooks/use-make-cards.ts`) builds cards locally from already-fetched
questions and never calls `ai/client`, so it is out of scope.

## Copy

Added to `src/copy/errors.ts` next to the existing `quota` export (same topic, same file, per the
task's own note that this is where quota-related copy already lives):

```ts
export const quotaWarning = {
  message: (remaining: number) =>
    remaining <= 0
      ? 'That was the last free generation for today.'
      : remaining === 1
        ? 'You have 1 free generation left today.'
        : `You have ${remaining} free generations left today.`,
} as const;
```

Follows `docs/DESIGN.md` copy rules already in force elsewhere in the file: second person, no
internals, no hype, concrete numbers, sentence case, no exclamation marks.

## Testing

- `src/hooks/use-quota-warning.test.ts` (new): exercises the store/hook logic directly — the only
  genuinely new logic in this change (threshold comparison, module singleton behavior across
  re-renders). Uses `vi.resetModules()` + dynamic `import()` per test to isolate the singleton
  between cases, mirroring the existing pattern already used for module state isolation in
  `src/ai/client.test.ts`'s "real proxy mode" block. Renders a tiny probe component with
  `@testing-library/react`, since the project has no `renderHook` usage to date and component
  rendering is the established way hook behavior gets exercised here (e.g.
  `src/ui/pages/settings/DangerZone.test.tsx`).
- No new test for `QuotaBanner.tsx` itself or for the one-line pass-through edits to
  `use-generation.ts` / `use-deck.ts`: matches existing precedent — `OfflineBanner.tsx` has no test
  file, and no hook in `src/hooks/` has a dedicated test file today; thin plumbing isn't
  independently tested elsewhere in this codebase, only logic-bearing modules are.
- `src/ai/client.test.ts` already covers `onQuotaRemaining` firing/not-firing at the client
  boundary and needs no changes.

## Out of scope

- Mock mode: `IS_MOCK_MODE` paths in `ai/client.ts` never call `options.onQuotaRemaining` today (no
  quota to report in mock mode) and this change does not alter that — the banner simply never
  appears in mock mode, which is correct: there is no real quota being spent.
- Server-side changes: `api/generate.ts` and `quota.service.ts` already emit `quotaRemaining`;
  untouched.
