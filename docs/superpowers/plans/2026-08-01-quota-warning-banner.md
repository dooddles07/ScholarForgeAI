# Quota Warning Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Executed inline, single-session, by the same agent that wrote the spec — see
> `docs/superpowers/specs/2026-08-01-quota-warning-banner-design.md` for full rationale.

**Goal:** Surface `quotaRemaining` (already returned by `/api/generate` and already plumbed through
`ai/client.ts`'s `onQuotaRemaining` callback) as a small non-blocking banner once it drops below 5.

**Architecture:** A module-level pub/sub store (`src/hooks/use-quota-warning.ts`) fed by
`reportQuotaRemaining`, read via `useSyncExternalStore` in `useLowQuotaWarning()`. Three existing
hooks (`useGenerateQuestions`, `useAskDocument`, `useGenerateDeck`) pass `reportQuotaRemaining` as
`onQuotaRemaining`. A new presentational `QuotaBanner` mirrors `OfflineBanner` and mounts in
`AppLayout`.

**Tech Stack:** React 19 `useSyncExternalStore`, existing Tailwind semantic tokens, Vitest +
`@testing-library/react` (no new dependencies).

## Global Constraints

- TypeScript strict, no `any`, no enums (`as const` unions only).
- Components: PascalCase, one per file, function declarations, no default exports, under 150 lines.
- Hooks: under 100 lines.
- All user-facing copy lives in `src/copy/`, never hardcoded in a component.
- `ui/` may import `domain/`, `hooks/`, `copy/` only — never `parsing/`, `persistence/`, `ai/`
  directly (ESLint-enforced in `eslint.config.js`).
- Conventional Commits, one logical change per commit (spec says don't commit until user reviews —
  in this autonomous run, changes are made but not committed, per the parent task's explicit
  instruction not to run git).
- Comments: one line, explain why not what, no emojis.

---

### Task 1: Quota warning store + hook

**Files:**
- Create: `src/hooks/use-quota-warning.ts`
- Test: `src/hooks/use-quota-warning.test.ts`

**Interfaces:**
- Produces: `LOW_QUOTA_THRESHOLD: number` (value `5`), `reportQuotaRemaining(value: number): void`,
  `useLowQuotaWarning(): number | null`.

- [ ] **Step 1: Write the failing test**

```ts
// src/hooks/use-quota-warning.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

afterEach(() => {
  cleanup();
  vi.resetModules();
});

/* Each test imports fresh so the module-level singleton never leaks between cases — same
   isolation technique used for module state in src/ai/client.test.ts's "real proxy mode" block. */
async function loadModule() {
  return import('./use-quota-warning');
}

function makeProbe(useLowQuotaWarning: () => number | null) {
  return function Probe() {
    const value = useLowQuotaWarning();
    return <p>{value === null ? 'none' : String(value)}</p>;
  };
}

describe('useLowQuotaWarning', () => {
  it('reports nothing before any generation call has reported a value', async () => {
    const { useLowQuotaWarning } = await loadModule();
    render(makeProbe(useLowQuotaWarning)({}));
    expect(screen.getByText('none')).toBeInTheDocument();
  });

  it('stays silent while remaining is at or above the threshold', async () => {
    const { useLowQuotaWarning, reportQuotaRemaining, LOW_QUOTA_THRESHOLD } = await loadModule();
    const Probe = makeProbe(useLowQuotaWarning);
    render(<Probe />);
    act(() => reportQuotaRemaining(LOW_QUOTA_THRESHOLD));
    expect(screen.getByText('none')).toBeInTheDocument();
    act(() => reportQuotaRemaining(LOW_QUOTA_THRESHOLD + 20));
    expect(screen.getByText('none')).toBeInTheDocument();
  });

  it('surfaces the number once remaining drops below the threshold', async () => {
    const { useLowQuotaWarning, reportQuotaRemaining } = await loadModule();
    const Probe = makeProbe(useLowQuotaWarning);
    render(<Probe />);
    act(() => reportQuotaRemaining(3));
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('surfaces zero rather than treating it as falsy/absent', async () => {
    const { useLowQuotaWarning, reportQuotaRemaining } = await loadModule();
    const Probe = makeProbe(useLowQuotaWarning);
    render(<Probe />);
    act(() => reportQuotaRemaining(0));
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('updates live as later calls report a different number', async () => {
    const { useLowQuotaWarning, reportQuotaRemaining } = await loadModule();
    const Probe = makeProbe(useLowQuotaWarning);
    render(<Probe />);
    act(() => reportQuotaRemaining(4));
    expect(screen.getByText('4')).toBeInTheDocument();
    act(() => reportQuotaRemaining(2));
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
```

Note: this file needs a `.tsx`-capable JSX runtime — since it renders JSX, name it
`use-quota-warning.test.tsx` (not `.ts`) so the TS/Vitest JSX transform applies. Adjust the file
extension accordingly in both create and test steps.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/use-quota-warning.test.tsx`
Expected: FAIL — cannot find module `./use-quota-warning`.

- [ ] **Step 3: Write the implementation**

```ts
// src/hooks/use-quota-warning.ts
import { useSyncExternalStore } from 'react';

/*
 * Module-level singleton fed by every successful generation call's onQuotaRemaining callback.
 * Below LOW_QUOTA_THRESHOLD the number is worth a banner; above it, it is noise mid-quiz. Mirrors
 * useIsOffline's pattern (module state + subscribe) since there is no Context or state library
 * anywhere else in src/ — see docs/superpowers/specs/2026-08-01-quota-warning-banner-design.md.
 */
export const LOW_QUOTA_THRESHOLD = 5;

let remaining: number | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): number | null {
  return remaining;
}

/* Handed directly to ai/client.ts as GenerateOptions.onQuotaRemaining — a plain function, not a
   hook, so hooks/*.ts can pass it through without depending on React render timing. */
export function reportQuotaRemaining(value: number): void {
  remaining = value;
  notify();
}

/* null until a generation call has reported a value, or once that value is no longer low enough
   to mention. Zero is a valid, meaningful value — never coerced to null. */
export function useLowQuotaWarning(): number | null {
  const value = useSyncExternalStore(subscribe, getSnapshot);
  return value !== null && value < LOW_QUOTA_THRESHOLD ? value : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/use-quota-warning.test.tsx`
Expected: PASS, all 5 cases.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-quota-warning.ts src/hooks/use-quota-warning.test.tsx
git commit -m "feat(hooks): add low-quota warning store"
```

(Per parent task instructions, do not actually run this commit — leave staged for the user.)

---

### Task 2: Copy

**Files:**
- Modify: `src/copy/errors.ts`

**Interfaces:**
- Produces: `quotaWarning.message(remaining: number): string`.

- [ ] **Step 1: Add the export**

Add after the existing `quota` export in `src/copy/errors.ts`:

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

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit` (or `npm run typecheck`)
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/copy/errors.ts
git commit -m "feat(copy): add low-quota warning message"
```

---

### Task 3: Wire onQuotaRemaining through the three call sites

**Files:**
- Modify: `src/hooks/use-generation.ts` (both `useGenerateQuestions` and `useAskDocument`)
- Modify: `src/hooks/use-deck.ts` (`useGenerateDeck`)

**Interfaces:**
- Consumes: `reportQuotaRemaining` from `src/hooks/use-quota-warning.ts` (Task 1).

- [ ] **Step 1: Edit `src/hooks/use-generation.ts`**

```ts
import { useCallback } from 'react';
import type { ChatMessage, Question, StoredDocument } from '@/domain/types';
import { answerQuestion, generateQuestions, type QuestionConfig } from '@/ai/client';
import { reportQuotaRemaining } from './use-quota-warning';

/*
 * The bridge from UI to the AI layer. Components never call the client directly, so swapping
 * fixtures for the real proxy touches nothing above this line.
 */

export function useGenerateQuestions() {
  return useCallback(
    (doc: StoredDocument, count: number, config: QuestionConfig = {}): Promise<Question[]> =>
      generateQuestions(doc, count, config, { onQuotaRemaining: reportQuotaRemaining }),
    [],
  );
}

export function useAskDocument() {
  return useCallback(async (doc: StoredDocument, question: string): Promise<ChatMessage> => {
    const reply = await answerQuestion(doc, question, { onQuotaRemaining: reportQuotaRemaining });
    return {
      id: `m-${Date.now()}-a`,
      role: 'assistant',
      content: reply.content,
      citations: reply.citations.map((c) => ({ ...c, documentId: doc.id })),
      createdAt: Date.now(),
    };
  }, []);
}
```

- [ ] **Step 2: Edit `src/hooks/use-deck.ts`**

Change the `generate` callback's `generateCards` call from:

```ts
const cards = await generateCards(doc, deckId, count);
```

to:

```ts
const cards = await generateCards(doc, deckId, count, {
  onQuotaRemaining: reportQuotaRemaining,
});
```

And add the import:

```ts
import { reportQuotaRemaining } from './use-quota-warning';
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: clean (confirms the layer-boundary rule is satisfied — `hooks/` may import `hooks/`).

- [ ] **Step 4: Run the full suite to confirm no regression**

Run: `npx vitest run src/hooks src/ai`
Expected: PASS (no existing hook tests exist for these two files today, so this mainly re-confirms
`src/ai/client.test.ts` still passes).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-generation.ts src/hooks/use-deck.ts
git commit -m "feat(hooks): report quota remaining from generation calls"
```

---

### Task 4: QuotaBanner component + AppLayout mount

**Files:**
- Create: `src/ui/layouts/QuotaBanner.tsx`
- Modify: `src/ui/layouts/AppLayout.tsx`

**Interfaces:**
- Consumes: `useLowQuotaWarning` (Task 1), `quotaWarning.message` (Task 2).

- [ ] **Step 1: Write `QuotaBanner.tsx`**

```tsx
import { TriangleAlert } from 'lucide-react';
import { useLowQuotaWarning } from '@/hooks/use-quota-warning';
import { quotaWarning } from '@/copy/errors';

/* Mirrors OfflineBanner: same collapse transition, same role/aria-live, no dismiss control — the
   number only moves down over a day, so hiding it would show a stale state rather than none. */
export function QuotaBanner() {
  const remaining = useLowQuotaWarning();

  return (
    <div
      className={`grid transition-[grid-template-rows] duration-[--duration-slow] ease-[--ease] ${
        remaining !== null ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className="overflow-hidden">
        {remaining !== null && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-2 border-b border-line bg-surface px-4 py-2.5 text-sm text-fg-muted"
          >
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
            <p>{quotaWarning.message(remaining)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Mount it in `AppLayout.tsx`**

Add the import and render it directly below `<OfflineBanner />`:

```ts
import { QuotaBanner } from './QuotaBanner';
```

```tsx
<OfflineBanner />
<QuotaBanner />
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: clean — confirms `ui/layouts` may import `hooks/` and `copy/` (it may not import
`ai/`, `parsing/`, `persistence/`, and this component imports none of those).

- [ ] **Step 4: Full verification pass**

Run: `npm run typecheck && npm run lint && npx vitest run`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/ui/layouts/QuotaBanner.tsx src/ui/layouts/AppLayout.tsx
git commit -m "feat(ui): show low-quota warning banner"
```

---

## Self-Review

1. **Spec coverage:** store+hook (Task 1), copy (Task 2), all three call sites (Task 3), banner +
   mount (Task 4). All spec sections have a task.
2. **Placeholder scan:** none — every step has real code.
3. **Type consistency:** `useLowQuotaWarning(): number | null` (Task 1) matches its use in
   `QuotaBanner` (Task 4, `remaining: number | null`). `reportQuotaRemaining(value: number): void`
   matches `GenerateOptions.onQuotaRemaining?: (remaining: number) => void` in `src/ai/client.ts`
   (already exists, unmodified). `quotaWarning.message(remaining: number): string` matches its call
   site in Task 4.
