# Coding Standards

Purpose: the conventions that keep this codebase readable by someone who did not write it.
Last updated: 2026-07-30

The audience for this code includes student contributors reading it for the first time. Optimise for that, not for cleverness.

## TypeScript

**Strict mode, no exceptions.**

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "noFallthroughCasesInSwitch": true
}
```

`noUncheckedIndexedAccess` is included deliberately. We index into arrays of chunks, questions, and options constantly, and it catches the class of bug where an index is out of range.

### Rules

| Rule | Reason |
|---|---|
| No `any`. Use `unknown` and narrow. | `any` disables the reason we have types |
| No non-null assertion `!` except where provably safe, with a comment | It is a lie to the compiler |
| Prefer `type` for unions, `interface` for object shapes | Consistency |
| Discriminated unions over optional-field soup | Makes invalid states unrepresentable |
| Return types on exported functions | Documents the contract and catches drift |
| No enums; use `as const` unions | Smaller output, simpler semantics |

Model responses arrive as `unknown` and are narrowed by validation. Never cast them.

## Naming

| Thing | Convention |
|---|---|
| Files, folders | kebab-case |
| React components | PascalCase, one per file |
| Hooks | `use-` prefix |
| Types, interfaces | PascalCase |
| Functions, variables | camelCase |
| Constants | SCREAMING_SNAKE_CASE |
| Booleans | `is`, `has`, `should`, `can` prefix |
| Async functions | Name the result, not the act: `loadDocument`, not `doLoad` |

Names say what, not how. `getDueCards`, not `queryIndexedDBForDueCards` — the storage mechanism is an implementation detail that will change.

## Comments

**One line, one sentence.** No block comments, no JSDoc ceremony on internal code.

Comment **why**, never **what**. The code says what.

```ts
// Models favour certain answer positions, so shuffle after generation.
const shuffled = shuffleOptions(question);
```

```ts
// Bad: restates the code
// Shuffle the options
const shuffled = shuffleOptions(question);
```

Delete a comment that has become wrong. A stale comment is worse than none, because it is trusted.

**No emojis in comments or code.** No decorative banner comments.

A comment explaining a non-obvious workaround should name the cause:

```ts
// pdfjs returns items in visual order, which interleaves columns.
```

## Functions

- One job each
- Under 40 lines as a guide; longer usually means two functions
- Under 4 parameters; beyond that take an options object
- Early return over nested conditionals
- Pure wherever possible, particularly in `domain/`

```ts
// Prefer
function scoreQuiz(responses: Response[], questions: Question[]): number {
  const scorable = questions.filter(q => !q.flaggedByUser);
  if (scorable.length === 0) return 0;
  const correct = countCorrect(responses, scorable);
  return Math.round((correct / scorable.length) * 100);
}
```

## React

### Components

- One component per file
- Under 150 lines as a target, 250 as a ceiling
- Props typed as an interface named `<Component>Props`
- No default exports, so renaming is safe and imports are greppable
- Function declarations, not arrow constants

```ts
interface QuestionCardProps {
  question: Question;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
}

export function QuestionCard({ question, onAnswer, disabled = false }: QuestionCardProps) {
  // ...
}
```

### Hooks

- Extract logic out of components into hooks; components should mostly render
- Hooks are the only bridge from UI to parsing, persistence, and network. See [PROJECT-STRUCTURE.md](../03-ARCHITECTURE/PROJECT-STRUCTURE.md).
- One concern per hook

### State

- Local state by default
- Lift only when genuinely shared
- Dexie live queries for anything stored, rather than mirroring database state into React state
- No global state library unless the absence of one is actually causing pain

Mirroring persisted data into component state is how the two get out of sync. Read from the database.

### Effects

- `useEffect` is for synchronising with something outside React, not for deriving values
- Always clean up subscriptions, timers, and abort controllers
- Derived values are computed during render, not stored in state

## Layer boundaries

The most important rule in the codebase. Enforced by ESLint `no-restricted-imports`.

| Layer | May not import |
|---|---|
| `ui/` | `parsing/`, `persistence/`, `ai/` directly |
| `domain/` | anything with I/O, React, or browser APIs |
| `api/` | anything under `src/` |

A component importing Dexie can no longer be tested without a database. A domain module importing `fetch` can no longer be tested without a network. The boundaries exist to keep testing cheap.

Full table in [PROJECT-STRUCTURE.md](../03-ARCHITECTURE/PROJECT-STRUCTURE.md).

## Server-side code

`api/` runs on Vercel's Node.js runtime (Node 20) — the same environment as local development. No restricted API surface: Node built-ins, `fetch`, and Web standard APIs (`crypto.subtle`, `TextEncoder`/`TextDecoder`) are all available. See [DEPLOYMENT.md](../04-OPERATIONS/DEPLOYMENT.md).

`api/generate.ts` specifically uses Vercel's classic `(req: VercelRequest, res: VercelResponse)` handler signature via `@vercel/node` — the Web-standard `(request: Request) => Response` signature type-checks and builds but crashes on actual invocation (`FUNCTION_INVOCATION_FAILED`), a real bug hit during this project's own deploy.

## Errors

### Domain errors, not raw throws

```ts
type AppError =
  | { kind: 'parseFailed'; reason: ParseFailureReason; fileName: string }
  | { kind: 'quotaExhausted'; resetsAt: number; scope: 'ip' | 'global' }
  | { kind: 'providerFailed'; retryable: boolean }
  | { kind: 'storageFull'; usedPercent: number };
```

Typed errors mean the UI can render the right message and the compiler catches an unhandled case.

### Rules

- Never swallow an error silently
- Never show an internal message to a user; map to copy from `src/copy/errors.ts`
- Never log document text or a user key, anywhere
- Preserve partial results when something fails midway
- Every user-facing error names a next step

Wording in [CONTENT-AND-COPY-GUIDE.md](../02-DESIGN/CONTENT-AND-COPY-GUIDE.md).

## Async

- `async`/`await`, not `.then` chains
- Every network call cancellable via `AbortController`
- Never fire-and-forget a promise; handle or explicitly void it
- `Promise.all` for independent work; sequential only when genuinely dependent

## Styling

- Tailwind utilities
- **Semantic tokens only.** `bg-surface`, never `bg-slate-100`. Raw colour utilities bypass theming and break dark mode.
- No inline `style` except for genuinely dynamic values such as a computed width
- No CSS-in-JS
- Mobile-first: unprefixed styles are the phone layout

Tokens in [DESIGN-SYSTEM.md](../02-DESIGN/DESIGN-SYSTEM.md).

## Copy

**No user-facing string is hardcoded in a component.** All of it in `src/copy/`.

```ts
// Prefer
<p>{copy.errors.scannedPdf.body}</p>

// Not
<p>This PDF is a scan, so there is no text for us to read.</p>
```

This lets the copy guide be reviewed against one place, and makes future translation a contained change.

## Accessibility in code

- Semantic elements: `button` for actions, `a` for navigation
- Every icon-only button has an `aria-label`
- Every input has a real `label`
- Focus styles are never removed
- Every interactive element is keyboard-reachable
- `prefers-reduced-motion` respected on every transition

Requirements in [ACCESSIBILITY.md](../02-DESIGN/ACCESSIBILITY.md).

## What not to do

| Avoid | Because |
|---|---|
| Abstraction with one caller | Premature. Wait for the third case. |
| Configuration options nobody asked for | Every option is a branch to test |
| Clever one-liners | Optimise for the reader |
| Defensive checks for impossible states | Types already prevent them; the check hides real bugs |
| Barrel files re-exporting everything | Breaks tree shaking, obscures dependencies |
| Comments explaining what the code does | Rewrite the code instead |
| A new dependency for something small | Write the fifty lines |
| Optimising before measuring | Profile first |

## Tooling

| Tool | Config |
|---|---|
| ESLint | TypeScript, React hooks, jsx-a11y, `no-restricted-imports` for layer boundaries |
| Prettier | 2 spaces, single quotes, trailing commas, 100 columns |
| TypeScript | Strict, as above |
| Pre-commit | Format, lint changed files, scan for key-shaped strings |

Formatting is not a matter of opinion; Prettier decides.

## Review

Reviewers check, in order:

1. Does it do what the issue asked?
2. Does it respect the layer boundaries?
3. Is user-facing copy in `src/copy/` and consistent with the guide?
4. Is it accessible: keyboard, labels, contrast, focus?
5. Does it work on a 320px viewport?
6. Are there tests for the logic?
7. Is it as simple as it can be?
8. Do file sizes suggest a split?

Points 3, 4, and 5 are the ones most often missed, and the ones this project cares about most.
