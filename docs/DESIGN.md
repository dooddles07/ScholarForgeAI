# Design

Tokens, screen rules, responsive behaviour, accessibility, and how the product talks.

## Two registers

**The app (`/app/*`) is calm, legible, and unfussy.** The user is tired and under pressure, and the
interface should reduce load rather than compete for attention. Generous whitespace, one accent
colour used sparingly, no gradients on functional surfaces, no decorative illustration, no
animation that does not communicate something. The reference point is a well-set book rather than a
dashboard.

**The marketing page (`/`) is expressive.** Dark ground, a display serif, scroll-driven motion, and
real rendered output. It has to explain a product whose central claims sound like marketing until
they are shown.

Both registers hold the same floor: AA contrast, 44px targets, visible focus, keyboard operation,
reduced motion honoured, no horizontal scroll at 320px.

## Principles for every screen

1. **One job per screen.** If a screen has two purposes, it is two screens.
2. **One primary action**, visually obvious, bottom-anchored on mobile.
3. **No dead ends.** Every state, including empty and error states, contains a next action.
4. **Progress is always visible.** The user knows where they are and how much is left.
5. **Trust is shown, not claimed.** Citations on generated content, and a plain statement that
   files stay local.

## Colour

Defined as CSS custom properties in `src/styles/tokens.css`, consumed through Tailwind's theme.
Components reference semantic names, never raw values — this is what makes dark mode a token swap
rather than a component rewrite.

| Token                                       | Purpose                                              |
| ------------------------------------------- | ---------------------------------------------------- |
| `--bg`                                      | Page background                                      |
| `--surface` / `--surface-raised`            | Cards and panels / modals and popovers               |
| `--border`                                  | Dividers, input outlines                             |
| `--text` / `--text-muted` / `--text-subtle` | Primary / secondary / placeholder and disabled       |
| `--accent` / `--accent-text`                | Primary actions and focus / text on accent           |
| `--correct` / `--incorrect` / `--warning`   | Right answers / missed answers / storage and quota   |
| `--mark` and friends                        | The highlighter: citations, source marks, the thread |

```css
/* Light */
--bg: #ffffff;
--surface: #f8fafc;
--surface-raised: #ffffff;
--border: #e2e8f0;
--text: #0f172a;
--text-muted: #475569;
--text-subtle: #94a3b8;
--accent: #4338ca;
--accent-text: #ffffff;
--correct: #15803d;
--incorrect: #b91c1c;
--warning: #b45309;

/* Dark — not an inversion. Pure black with pure white text produces halation and is
   genuinely uncomfortable for long reading, which is most of what happens here. */
--bg: #0f172a;
--surface: #1e293b;
--surface-raised: #283548;
--border: #334155;
--text: #f1f5f9;
--text-muted: #94a3b8;
--text-subtle: #64748b;
--accent: #818cf8;
--accent-text: #0f172a;
--correct: #4ade80;
--incorrect: #f87171;
--warning: #fbbf24;

/* Marketing ground — fixed across themes, so its contrast is verified once rather than twice */
--ink: #080b16;
--ink-raised: #0f1424;
--ink-border: #1e2740;
--ink-text: #f5f6fa;
--ink-muted: #9aa3bd;
--paper: #fbfaf7;
--paper-text: #14110b;
--paper-muted: #5f5849;
--paper-rule: #e3ded1;
```

The accent lightens in dark mode because a dark indigo on a dark background fails contrast.
Correct and incorrect lighten for the same reason.

### The highlighter

`--mark` is `#ffc84a` in both themes. It is the one colour added to the original palette, and it
carries the product's central promise: every generated item shows the page it came from.

**It is a fill, an underline, or a rule. It is never body text on a light surface.** Amber on paper
is about 1.6:1. Use `--mark-text` (`#8a5a00` in light, `#ffc84a` in dark) wherever the amber has to
be read as text. This rule is easy to break by accident, so it carries a comment in `tokens.css`.

### Colour never carries meaning alone

Correct and incorrect states always pair colour with an icon and a text label. Around one in twelve
men has some form of colour-vision deficiency, and red-green is the common case — precisely the
pair we would otherwise be relying on.

Raw colour utilities such as `bg-slate-100` are disallowed in components; they bypass theming and
break dark mode.

## Typography

```css
--font-sans:
  ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
--font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
--font-display: 'Newsreader', Georgia, 'Times New Roman', serif;
```

System fonts in the app, deliberately: no webfont download, no layout shift while a font loads, no
bandwidth cost on a metered connection, text renders instantly. For a product read on cheap phones
over slow data, this is worth more than a distinctive typeface.

`--font-display` is the one exception and is confined to `/`. Newsreader, self-hosted as a 132 KB
woff2, imported by `MarketingPage.tsx` so it lands in that route's chunk and the app never requests
it. A marketing page read once on wifi can afford a typeface; a quiz screen read at midnight on
mobile data cannot.

**Mono carries numbers.** Page citations, question counts, review intervals, and the cost table use
`--font-mono` with `font-variant-numeric: tabular-nums`. "p. 47" in mono reads as a reference
rather than prose, and tabular figures stop a counter jittering as it climbs.

| Token         | Size     | Line height | Use                 |
| ------------- | -------- | ----------- | ------------------- |
| `--text-xs`   | 0.75rem  | 1.5         | Captions, citations |
| `--text-sm`   | 0.875rem | 1.6         | Secondary text      |
| `--text-base` | 1rem     | 1.7         | Body                |
| `--text-lg`   | 1.125rem | 1.6         | Question text       |
| `--text-xl`   | 1.25rem  | 1.5         | Card fronts         |
| `--text-2xl`  | 1.5rem   | 1.4         | Section headings    |
| `--text-3xl`  | 1.875rem | 1.3         | Page titles         |
| `--text-4xl`  | 2.25rem  | 1.2         | Landing headline    |

Body line height of 1.7 is higher than typical. This app is read, not scanned, and generous leading
helps both sustained reading and dyslexic readers.

Rules: body text never below 16px (below that, iOS Safari zooms on input focus); measure capped at
70 characters for prose; never justified, because ragged right avoids the rivers that hinder
dyslexic readers; sentence case throughout, never ALL CAPS.

**Reading mode** is an optional setting increasing letter spacing, word spacing, and line height.
Aimed at dyslexic readers, useful to others. A toggle, not a separate theme.

## Spacing, radius, shadow, motion

A 4px base scale — consistency matters more than the specific values. Section padding `--space-6`
on mobile, `--space-12` from tablet up.

```css
--radius-sm: 0.375rem;
--radius: 0.5rem;
--radius-lg: 0.75rem;
--radius-full: 9999px;
--shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
--shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
--duration-fast: 120ms;
--duration: 200ms;
--duration-slow: 320ms;
--ease: cubic-bezier(0.16, 1, 0.3, 1);
```

Shadows signal elevation only — a modal above the page, a popover above content. Never on a static
card, which produces the generic floating-boxes look.

Motion is functional only. Every transition is wrapped in a `prefers-reduced-motion` guard, and the
in-app reduce-motion setting adds a `data-motion="reduce"` attribute that applies the same
restraint; `system` defers to the device, so a device asking for less motion is never overridden.
The card flip is the one animation with a real job — it communicates that the same card has two
sides — and even that reduces to a cross-fade.

**No animation library.** The marketing page's scroll-driven effects use CSS
`animation-timeline: view()` with an `@supports` fallback that renders the finished state rather
than a missing one. GSAP's plugin licensing does not satisfy the permissive-only rule, and `motion`
would have added roughly 34 KB gzipped to do what a keyframe already does.

No loading skeletons that pulse indefinitely. Progress is reported with real stage text.

## Components

Built on Radix primitives via shadcn/ui, copied into `src/ui/components/primitives/` and owned by us.

**Buttons.** `primary` (accent fill, the one main action), `secondary` (bordered, transparent),
`ghost` (no border until hover), `destructive` (incorrect colour, always confirmed). One primary
button per screen — two primary buttons means neither is primary. Minimum touch target 44×44px
including icon-only buttons; this is a hard rule, not a guideline. Disabled buttons always carry a
reason, via tooltip on desktop and helper text on mobile; a disabled control with no explanation is
a dead end.

**Cards.** `--surface` background, `--border` outline, `--radius`, no shadow.

**Inputs.** Always a visible label — placeholders are not labels, they vanish on focus and are
invisible to some assistive technology. Minimum height 44px, font size at least 16px. Errors appear
below the field, in text, referenced by `aria-describedby`.

**Focus.** `--focus-ring: 0 0 0 2px var(--bg), 0 0 0 4px var(--accent)`. Visible on every
interactive element, never removed. The double ring keeps it visible against both light and dark
surfaces.

**Dialogs and sheets.** Dialogs on desktop, bottom sheets on mobile — a centred modal on a phone
fights the keyboard. Radix handles focus trapping, restoration, and escape-to-close.

**Icons.** `lucide-react`, 20px in text contexts and 24px standalone. Never the only label.

### Feature patterns

**Question card**, the most-viewed component. One question per screen, no exceptions. Question text
at `--text-lg`. Options as full-width tappable rows, at least 56px tall, generously separated to
prevent mis-taps. Primary action fixed to the bottom on mobile. Progress as text, "Question 4 of
10", not only a bar. After answering: correctness with icon and label, the correct answer, the
explanation, and the page citation.

**Flashcard.** Large central text at `--text-xl`, whole card tappable to flip. Rating buttons
appear only after the flip so the answer cannot be seen prematurely — four in a row on desktop, a
2×2 grid on mobile, each showing its resulting interval ("Good — back in 3 days").

**Citation**, the most important component in the product and consistent everywhere generated
content appears. `--text-sm` in `--mark-text` on a `--mark-soft` chip with a highlighter icon. Page
number in mono with tabular figures: "From page 47". Tappable, revealing the source passage with
the quoted sentence highlighted and joined to the chip by a `--mark-line` rule. Never styled as a
warning or an afterthought — it was once specified at `--text-xs` in `--text-muted`, which is
footnote styling on the one element separating this product from a tool that makes things up.

**Progress and stats.** Numbers over gauges: "7 of 10" beats a dial. No grade letters, no badges,
no celebration animation. Charts use `--accent` for the primary series and `--text-muted` for
context, never a rainbow palette.

## Responsive

The primary persona studies on a phone, in bed, at night. Mobile is the design target and desktop
is the expansion, not the other way round. **Every component is written mobile-first**: unprefixed
styles are the phone layout, `md:` and above are progressive additions. A component whose base
styles assume a wide viewport is a bug. The narrowest supported viewport is 320px.

| Screen       | Phone                                | Tablet                | Desktop                          |
| ------------ | ------------------------------------ | --------------------- | -------------------------------- |
| Navigation   | Bottom tab bar                       | Bottom tab bar        | Left sidebar                     |
| Library      | Single column                        | Two-column grid       | Three-column grid                |
| Document     | Outline collapsed above content      | Outline as a drawer   | Outline fixed beside content     |
| Quiz         | One question, action fixed at bottom | Same, centred, capped | Same, centred, capped            |
| Flashcard    | Full-screen, swipe enabled           | Centred card          | Centred, keyboard-driven         |
| Dashboard    | Stacked cards                        | Two columns           | Two or three columns             |
| Exam preview | Key behind a tab                     | Key behind a tab      | Exam and key side by side        |
| Chat         | Full screen, input at bottom         | Same                  | Chat with the document beside it |

Two things never change: **one question per screen**, and **content capped at a readable measure**.
A quiz question stretched across a 27-inch monitor is worse, not better.

The bottom bar respects `env(safe-area-inset-bottom)` so it clears the home indicator on modern
iPhones; without it the bar sits under the system gesture area.

**Thumb zones.** On a one-handed phone the bottom third is comfortable, the middle is a stretch,
and the top corners are effectively out of reach. So: primary action fixed to the bottom, full
width; secondary actions beside or beneath it; **destructive actions never at the bottom**, where
they are too easy to hit by accident; back and close top-left but always with a swipe or
hardware-back alternative.

**Touch targets.** 44×44px minimum including icon-only buttons, 8px minimum spacing, 56px minimum
for quiz options and rating buttons. Answer options get extra height because tapping the wrong
answer loses the question, not just a tap. Undersized targets are the most common mobile
accessibility failure.

Gestures are additions, never the only way to do something.

## Accessibility

**Target: WCAG 2.2 Level AA**, enforced in CI by an `axe-core` sweep of every route at two
viewports. This is a study tool for students, and students include people who are blind, have low
vision, are dyslexic, have motor impairments, or have ADHD. An inaccessible study tool excludes
people from studying, which makes accessibility a correctness requirement rather than a polish item.

**Keyboard.** Every feature is fully operable without a mouse or touch. Tab/Shift-Tab to move,
Enter/Space to activate, Space to flip a card, 1–4 to rate, arrows for previous and next, Esc to
close, `?` for the shortcut sheet, `/` to focus search. Focus is always visible, tab order follows
visual order, no keyboard traps, a skip-to-content link is the first focusable element, and no
feature is available only by hover or only by gesture.

**Screen readers.** Tested with NVDA on Windows and VoiceOver on iOS. Real elements — `button` for
actions, `a` for navigation, `h1`–`h6` in order with no skipped levels, one `h1` per screen,
landmarks, lists marked up as lists, inputs with associated labels.

State changes that are only visible are invisible to a screen reader, so answers announce
"Correct"/"Not quite" plus the correct answer; parsing progress is polite and throttled; generation
completion announces "10 questions ready"; errors are assertive. Live regions use `polite` for
progress and status and `assertive` for errors only — overusing assertive interrupts constantly and
makes the app hostile. Every icon-only button has an `aria-label`. Citations announce as "From page
47", since "p 47" reads poorly aloud.

**Low vision.** 4.5:1 for body text and 3:1 for large text and interface components; zoom to 200%
without loss of content, function, or horizontal scrolling; text resizing independent of zoom via
`rem` units with no fixed `px` font sizes; no text in images; reflow at 320px.

### The automated sweep

`tests/e2e/axe-audit.mjs`, run by CI and locally with `npm run test:a11y` against a preview server
on port 5180. It checks axe-core (WCAG 2.0/2.1/2.2 A and AA) on each route, that no page scrolls
horizontally, at mobile (390px) and desktop (1280px) with animation disabled so contrast is
measured on a settled page.

Every `/app` route is behind mandatory sign-in, which for a period silently reduced the sweep to a
single route: it reached the sign-in gate for the other nine, audited that same screen repeatedly,
and reported clean. The fix is the **Firebase Auth emulator**, not a bypass in the app. CI starts
it; the script creates a user over its REST API and writes the session into the IndexedDB record
the Firebase SDK reads at startup, so the app boots signed in through its ordinary code path.
`connectAuthEmulator` is called only when `VITE_FIREBASE_AUTH_EMULATOR_HOST` is set, which happens
nowhere but that job.

Without the emulator the audit still runs and names every route it could not reach, so a clean
result always states what it actually covered. Locally:

```bash
npx --yes firebase-tools@14 emulators:start --only auth --project scholarforge-audit &
npm run build && npx vite preview --port 5180 &
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 npm run test:a11y
```

Lighthouse is deliberately not used: its accessibility category runs axe-core internally, the sweep
above already covers more, and a score threshold is a weaker gate than zero violations.

Automated tools catch perhaps a third of real problems. They are a floor, not a standard. Per
release, manually: complete a full quiz and review session using only the keyboard, run NVDA
through upload/quiz/review, and check reflow at 320px.

## Copy

Copy is part of the product, not decoration applied afterwards. All strings live in `src/copy/`;
none are hardcoded in components.

**Voice: like a competent friend who has done this before.** Calm, direct, on the user's side. Not
a brand, not a mascot, not a productivity coach. Plain not formal, brief not terse, warm not
cutesy, honest not apologetic, encouraging not motivational.

That last distinction matters. "You got 7 of 10. The three you missed are now flashcards." is
encouraging, because it says what happened and what comes next. "Amazing effort! You're crushing
it! 🎉" is motivational, and it is exhausting.

1. **Short words.** use not utilise, start not commence, about not approximately, to not in order to.
2. **Say what happened, then what to do.** Every problem message has both halves; one alone is
   incomplete.
3. **Never blame the user.** "We cannot read this kind of file yet", not "Invalid file". The file
   is not invalid — it is a kind we do not handle, and that is our limitation.
4. **No internals, ever.** No stack traces, status codes, library strings, or the words `null`,
   `undefined`, `exception`, `error code`.
5. **No hype.** Banned: revolutionary, seamless, effortless, unleash, supercharge, game-changing,
   cutting-edge, powerful, robust, leverage, empower, journey. Also banned: exclamation marks in
   error messages, and emoji anywhere in the interface.
6. **Numbers concretely.** "That file is 82 MB. The limit is 50 MB", not "File too large".
7. **Second person, active voice.** "Your file stays on your device", not "files are retained
   locally".
8. **Sentence case everywhere.**
9. **Buttons are verbs.** "Check my answer", not "Submit". "Delete everything", not "Confirm".
10. **Never mention money.** There is no paid tier and there never will be. Banned: upgrade,
    premium, pro, subscribe, free trial, unlock, limited plan.

## Print

`src/styles/print.css`, for exams and answer keys. Force light colours regardless of theme, since
printing a dark theme wastes ink and reads badly. Hide all navigation and interface chrome. Serif
body face for paper legibility. `break-inside: avoid` on questions so a question is never split
from its options. Answer key starts on a new page. Question number and total in a running footer.

## Dark mode

Driven by `prefers-color-scheme`, overridable in settings, persisted to `settings.theme`, and
applied via a `data-theme` attribute on the root element so the manual override wins in both
directions. No flash of the wrong theme on load: `public/theme-init.js` sets the attribute before
first paint, reading a `sf-theme` mirror in localStorage. `system` is stored explicitly rather than
cleared — an absent key is indistinguishable from a first visit, which is what once made the
pre-paint script guess dark on light-mode devices.
