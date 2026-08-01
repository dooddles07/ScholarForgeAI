# Accessibility

Purpose: the standard we hold, and how each requirement is met.
Last updated: 2026-07-30

**Target: WCAG 2.2 Level AA**, enforced in CI by an `axe-core` sweep of every route at two viewports.

This is a study tool for students, and students include people who are blind, have low vision, are dyslexic, have motor impairments, or have ADHD. An inaccessible study tool excludes people from studying, which makes accessibility a correctness requirement rather than a polish item.

## Keyboard

Every feature is fully operable without a mouse or touch.

| Key | Action |
|---|---|
| Tab / Shift-Tab | Move between controls |
| Enter / Space | Activate |
| Space | Flip a flashcard |
| 1–4 | Rate a card: Again, Hard, Good, Easy |
| ← → | Previous and next |
| Esc | Close a dialog or sheet |
| `?` | Show the keyboard shortcut sheet |
| `/` | Focus search |

**Rules**

- Focus is always visible. The focus ring is never removed, and it is designed to be visible against both light and dark surfaces.
- Tab order follows visual order.
- No keyboard traps. Dialogs trap focus while open and restore it to the trigger on close, which Radix handles.
- A skip-to-content link is the first focusable element.
- No feature is available only by hover or only by gesture.

The swipe gestures on flashcards always have button equivalents, per [RESPONSIVE-AND-MOBILE.md](RESPONSIVE-AND-MOBILE.md).

## Screen readers

Tested with NVDA on Windows and VoiceOver on iOS. Those two cover the majority of real usage and expose different classes of problem.

### Semantics

- Real elements: `button` for actions, `a` for navigation, `h1`–`h6` in order with no skipped levels
- One `h1` per screen
- Landmarks: `header`, `nav`, `main`, `footer`
- Lists marked up as lists
- Form inputs always have an associated `label`; placeholders are never used as labels

### Announcements

State changes that are only visible are invisible to a screen reader, so:

| Event | Announcement |
|---|---|
| Answer checked | "Correct" or "Not quite", plus the correct answer |
| Parsing progress | Polite, throttled to avoid flooding |
| Generation finished | "10 questions ready" |
| Error | Assertive, with the full message |
| Card flipped | The answer text |
| Quota exhausted | Assertive |
| Offline / online | Polite |

Live regions: `aria-live="polite"` for progress and status, `assertive` for errors only. Overusing assertive interrupts the user constantly and makes the app hostile.

### Accessible names

Every icon-only button has an `aria-label`. The read-aloud speaker, the pause control, the close button, and the flag control are the ones most likely to be missed.

Citations announce as "From page 47", not "p 47", since the abbreviation reads poorly aloud.

## Low vision

- **Contrast**: 4.5:1 for body text, 3:1 for large text and interface components, verified by automated check. Token pairs in [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md).
- **Zoom to 200%** without loss of content or function, and without horizontal scrolling. Layouts use relative units throughout.
- **Text resizing** independent of zoom, via `rem` units. No fixed `px` font sizes.
- **No text in images.** All text is real text.
- **Reflow** at 320px width, per WCAG 1.4.10.

## Colour independence

Colour never carries meaning on its own. Every correct or incorrect state pairs colour with an icon and a text label.

Red-green colour-vision deficiency is common, and red-green is exactly the pair a quiz app would otherwise rely on. The correct-incorrect pattern is therefore checked explicitly in review.

Copy never refers to colour: never "the red ones", always "the ones you missed". See [CONTENT-AND-COPY-GUIDE.md](CONTENT-AND-COPY-GUIDE.md).

## Motion

- Every transition is wrapped in a `prefers-reduced-motion` guard
- Reduced motion is also available as an explicit setting, since some users cannot change the OS preference on a shared device
- With motion reduced, the card flip becomes a cross-fade rather than being removed, because it still needs to communicate two-sidedness
- No parallax, no auto-playing motion, no infinite pulsing skeletons
- Nothing flashes more than three times per second

## Dyslexia

The features here help dyslexic readers and cost nothing for everyone else.

- Line height 1.7 for body text, which is generous by default
- **Never justified text.** Ragged right avoids the uneven word spacing that creates vertical rivers of whitespace.
- Measure capped at roughly 70 characters
- **Reading mode**: an optional setting increasing letter spacing, word spacing, and line height
- **Read aloud** via the Web Speech API on cards, explanations, and questions
- Sentence case throughout; no ALL CAPS, which removes word-shape cues

## Motor impairment

- Minimum touch target 44×44px everywhere, including icon-only buttons
- Minimum 8px between adjacent targets
- No time limits except the exam timer, which is opt-in, adjustable, and extendable
- No double-tap or long-press requirements
- No drag-only interaction; drag-and-drop upload always has a tap-to-browse alternative
- Destructive actions are never bottom-anchored, where an accidental thumb tap is most likely
- Generous swipe thresholds with spring-back feedback

## Cognitive load

- One question per screen, at every viewport
- One primary action per screen
- Progress always visible as text, not only as a bar
- Sessions default to a finite 20 cards, with a visible end
- Plain language throughout, per the copy guide
- An optional focus timer, off by default
- No unnecessary notifications, no streak guilt, no interruptions during a session

## Forms

- Visible labels on every field
- Errors below the field, in text, linked by `aria-describedby`
- Errors announced assertively
- Errors describe the fix: "That needs to be a number between 5 and 50", not "Invalid input"
- No error appears before the user has had a chance to finish typing
- Required fields marked in text, not only with an asterisk

## Print

Exam output is accessible on paper too: real text rather than an image, sufficient contrast in greyscale, and a logical reading order. Detail in [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md).

## Testing

### Automated, in CI

`tests/e2e/axe-audit.mjs`, run by the `accessibility` job in `.github/workflows/ci.yml` and
locally with `npm run test:a11y` against a preview server on port 5180. It checks:

- `axe-core` (WCAG 2.0/2.1/2.2 A and AA) on each route it can reach, failing the build on a violation
- No horizontal scroll at either viewport
- Both mobile (390px) and desktop (1280px), with animation disabled so contrast is measured on a settled page

Automated tools catch perhaps a third of real problems. They are a floor, not a standard.

#### How the audit gets past sign-in

Every `/app` route is behind mandatory Google sign-in
([ADR-0011](../08-DECISIONS/ADR-0011-MANDATORY-GOOGLE-SIGN-IN.md)). For a period this silently
reduced the sweep to a single route: the script reached the sign-in gate for the other nine,
audited that same screen repeatedly, and reported clean.

The fix is the **Firebase Auth emulator**, not a bypass in the app. CI starts it, the script
creates a user over its REST API and writes the resulting session into the IndexedDB record the
Firebase SDK reads at startup, so the app boots signed in through its ordinary code path. Driving
the emulator's own account-picker markup was rejected as the mechanism — it changes between
emulator releases.

`src/lib/firebase.ts` calls `connectAuthEmulator` only when `VITE_FIREBASE_AUTH_EMULATOR_HOST` is
set, which happens nowhere but the CI accessibility job. No real build can reach a fake auth
server, and no auth bypass exists in the shipped bundle.

Without the emulator the audit still runs and names every route it could not reach, so a clean
result always states what it actually covered. To reproduce locally:

```bash
npx --yes firebase-tools@14 emulators:start --only auth --project scholarforge-audit &
npm run build && npx vite preview --port 5180 &
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 npm run test:a11y
```

The build needs the same `VITE_FIREBASE_*` throwaway values the CI job sets.

#### Why not Lighthouse

Earlier drafts of this document claimed a CI-enforced Lighthouse accessibility score of 95. Nothing
of the sort existed. It was not built, because Lighthouse's accessibility category runs `axe-core`
internally and the sweep above already covers more: additional WCAG tag sets, two viewports, ten
routes, and a horizontal-scroll check Lighthouse does not perform. A score of 95 is also a weaker
gate than "no violations" — it permits some.

Lighthouse remains useful for performance, where it is not redundant, and stays on the manual
pre-release checklist in [DEPLOYMENT.md](../04-OPERATIONS/DEPLOYMENT.md).

### Manual, per release

| Check | Method |
|---|---|
| Keyboard-only | Complete a full quiz and review session using only the keyboard |
| Screen reader, desktop | NVDA through upload, quiz, and review |
| Screen reader, mobile | VoiceOver through the same |
| Zoom | 200% on every screen, checking for clipping and horizontal scroll |
| Colour | Greyscale screenshot review; correctness must still be distinguishable |
| Reduced motion | OS setting enabled, verify nothing breaks and the flip still reads |
| Touch targets | Measured on a real device, not inspected in a browser |

Real devices for the mobile checks. Emulators do not reproduce VoiceOver behaviour or touch accuracy.

## Known gaps

Stated honestly rather than omitted.

| Gap | Status |
|---|---|
| Scanned documents are unreadable | Out of scope for v1. Affects users who only have scanned material. [NON-GOALS-AND-SCOPE.md](../01-PRODUCT/NON-GOALS-AND-SCOPE.md) |
| Read-aloud voice quality varies by platform | Web Speech API limitation; no free alternative |
| English only | v1 scope decision. Screen reader users of other languages are not served. |
| No high-contrast theme beyond dark mode | Candidate for v1.1. Recorded in [OPEN-QUESTIONS.md](../06-PLANNING/OPEN-QUESTIONS.md) |

## Accountability

An accessibility failure is a bug, not an enhancement request, and is triaged accordingly. See [ISSUE-AND-PR-GUIDE.md](../07-OPEN-SOURCE/ISSUE-AND-PR-GUIDE.md).

No pull request merges with a new `axe-core` violation. See [DEFINITION-OF-DONE.md](../05-ENGINEERING/DEFINITION-OF-DONE.md).
