# Design System

Purpose: the tokens and component rules that keep the interface coherent.
Last updated: 2026-07-30

## Direction

There are two registers. See [ADR-0008](../08-DECISIONS/ADR-0008-TWO-VISUAL-REGISTERS.md).

**The app (`/app/*`) is calm, legible, and unfussy.** The user is tired and under pressure, and the interface should reduce load rather than compete for attention.

Concretely that means: generous whitespace, one accent colour used sparingly, no gradients on functional surfaces, no decorative illustration, and no animation that does not communicate something.

The reference point is a well-set book rather than a dashboard.

**The marketing page (`/`) is expressive.** Dark ground, a display serif, scroll-driven motion, and real rendered output. It has to explain a product whose central claims sound like marketing until they are shown.

Both registers hold the same floor: AA contrast, 44px targets, visible focus, keyboard operation, reduced-motion honoured, no horizontal scroll at 320px.

## Colour

Defined as CSS custom properties in `src/styles/tokens.css`, consumed through Tailwind's theme.

### Semantic tokens

Components reference semantic names, never raw values. This is what makes dark mode a token swap rather than a component rewrite.

| Token | Purpose |
|---|---|
| `--bg` | Page background |
| `--surface` | Cards, panels |
| `--surface-raised` | Modals, popovers |
| `--border` | Dividers, input outlines |
| `--text` | Primary text |
| `--text-muted` | Secondary text, captions |
| `--text-subtle` | Placeholders, disabled |
| `--accent` | Primary actions, focus |
| `--accent-text` | Text on accent |
| `--correct` | Right answers |
| `--incorrect` | Missed answers |
| `--warning` | Storage and quota warnings |
| `--mark` | The highlighter. Citations, source marks, the thread. |
| `--mark-text` | Contrast-safe amber for text on a light surface |
| `--mark-soft` | The highlight wash behind a quoted passage |
| `--mark-line` | The thread rule joining a citation to its passage |

### The highlighter

`--mark` is `#ffc84a` in both themes. It is the one colour added to the original palette, and it carries the product's central promise: every generated item shows the page it came from.

**It is a fill, an underline, or a rule. It is never body text on a light surface.** Amber on paper is about 1.6:1. Use `--mark-text` (`#8a5a00` in light, `#ffc84a` in dark) wherever the amber has to be read as text. This rule is easy to break by accident, so it carries a comment in `tokens.css`.

### Marketing ground

Fixed across themes, because the marketing page is always dark and its contrast is then verified once rather than twice.

```css
--ink:        #080b16;   /* page ground */
--ink-raised: #0f1424;   /* cards */
--ink-border: #1e2740;
--ink-text:   #f5f6fa;
--ink-muted:  #9aa3bd;
--paper:        #fbfaf7;  /* a rendered document page: warm, not white */
--paper-text:   #14110b;
--paper-muted:  #5f5849;  /* faded page text that still passes AA */
--paper-rule:   #e3ded1;
```

### Light

```css
--bg:             #ffffff;
--surface:        #f8fafc;
--surface-raised: #ffffff;
--border:         #e2e8f0;
--text:           #0f172a;
--text-muted:     #475569;
--text-subtle:    #94a3b8;
--accent:         #4338ca;
--accent-text:    #ffffff;
--correct:        #15803d;
--incorrect:      #b91c1c;
--warning:        #b45309;
```

### Dark

Not an inversion. Pure black with pure white text produces halation and is genuinely uncomfortable for long reading, which is most of what happens here.

```css
--bg:             #0f172a;
--surface:        #1e293b;
--surface-raised: #283548;
--border:         #334155;
--text:           #f1f5f9;
--text-muted:     #94a3b8;
--text-subtle:    #64748b;
--accent:         #818cf8;
--accent-text:    #0f172a;
--correct:        #4ade80;
--incorrect:      #f87171;
--warning:        #fbbf24;
```

The accent lightens in dark mode because a dark indigo on a dark background fails contrast. Correct and incorrect lighten for the same reason.

### Contrast

Every text-on-background pair meets WCAG 2.2 AA: 4.5:1 for body text, 3:1 for large text and interface components. Verified with automated checks in CI, per [ACCESSIBILITY.md](ACCESSIBILITY.md).

### Colour never carries meaning alone

Correct and incorrect states always pair colour with an icon and a text label. Around one in twelve men has some form of colour-vision deficiency, and red-green is the common case — precisely the pair we would otherwise be relying on.

## Typography

### Family

```css
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
             Roboto, "Helvetica Neue", Arial, sans-serif;
--font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
--font-display: "Newsreader", Georgia, "Times New Roman", serif;
```

System fonts in the app, deliberately. No webfont download, no layout shift while a font loads, no bandwidth cost on a metered connection, and text renders instantly. For a product read on cheap phones over slow data, this is worth more than a distinctive typeface.

**`--font-display` is the one exception, and it is confined to `/`.** Newsreader, a variable serif with an optical-size axis, self-hosted as a 132 KB woff2 with `font-display: swap`. It is imported by `MarketingPage.tsx`, so it lands in that route's chunk and the app never requests it. A marketing page read once on wifi can afford a typeface; a quiz screen read at midnight on mobile data cannot.

**Mono carries numbers.** Page citations, question counts, review intervals, and the cost table all use `--font-mono` with `font-variant-numeric: tabular-nums`. "p. 47" in mono reads as a reference rather than as prose, and tabular figures stop a counter jittering as it climbs.

### Scale

A modest ratio, because a dramatic scale looks striking in a mockup and cramped on a 360px screen.

| Token | Size | Line height | Use |
|---|---|---|---|
| `--text-xs` | 0.75rem | 1.5 | Captions, citations |
| `--text-sm` | 0.875rem | 1.6 | Secondary text |
| `--text-base` | 1rem | 1.7 | Body |
| `--text-lg` | 1.125rem | 1.6 | Question text |
| `--text-xl` | 1.25rem | 1.5 | Card fronts |
| `--text-2xl` | 1.5rem | 1.4 | Section headings |
| `--text-3xl` | 1.875rem | 1.3 | Page titles |
| `--text-4xl` | 2.25rem | 1.2 | Landing headline |

Body line height of 1.7 is higher than typical. This app is read, not scanned, and generous leading helps both sustained reading and dyslexic readers.

### Rules

- Body text never below 16px. Below that, iOS Safari zooms on input focus, which is disorienting.
- Measure capped at 70 characters for prose. Long explanations in a full-width container are hard to read.
- Never justified. Ragged right avoids the uneven word spacing that creates rivers, which are a known problem for dyslexic readers.
- Sentence case throughout. No ALL CAPS, which is slower to read and reads as shouting.

### Reading mode

An optional setting that increases letter spacing, word spacing, and line height. Aimed at dyslexic readers, useful to others. A toggle, not a separate theme.

## Spacing

A 4px base scale. Consistency matters more than the specific values.

```
--space-1: 0.25rem    --space-6:  1.5rem
--space-2: 0.5rem     --space-8:  2rem
--space-3: 0.75rem    --space-12: 3rem
--space-4: 1rem       --space-16: 4rem
--space-5: 1.25rem    --space-24: 6rem
```

Section padding: `--space-6` on mobile, `--space-12` from tablet up.

## Radius, shadow, motion

```css
--radius-sm: 0.375rem;   /* inputs, small controls */
--radius:    0.5rem;     /* buttons, cards */
--radius-lg: 0.75rem;    /* modals, large panels */
--radius-full: 9999px;   /* pills, avatars */
```

Shadows are used sparingly and only to signal elevation: a modal above the page, a popover above content. Never on a static card, which produces the generic floating-boxes look.

```css
--shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
--shadow:    0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
```

Motion is functional only:

```css
--duration-fast: 120ms;   /* hover, focus */
--duration:      200ms;   /* most transitions */
--duration-slow: 320ms;   /* modals, sheets */
--ease: cubic-bezier(0.16, 1, 0.3, 1);
```

Every transition is wrapped in a `prefers-reduced-motion` guard. The card flip is the one animation with a real job: it communicates that the same card has two sides. Even that reduces to a cross-fade when motion is reduced.

**No animation library.** The marketing page's scroll-driven effects use the CSS `animation-timeline: view()` property, with an `@supports` fallback that renders the finished state rather than a missing one. GSAP and `motion` were both considered: GSAP's plugin licensing does not cleanly satisfy the permissive-only rule in [TECH-STACK.md](../03-ARCHITECTURE/TECH-STACK.md), and `motion` would have added roughly 34 KB gzipped to do what a keyframe already does. The app uses plain CSS transitions on the duration tokens above.

No loading skeletons that pulse indefinitely. Progress is reported with real stage text instead, per [CONTENT-AND-COPY-GUIDE.md](CONTENT-AND-COPY-GUIDE.md).

## Components

Built on Radix primitives via shadcn/ui, copied into `src/ui/components/primitives/` and owned by us. See [TECH-STACK.md](../03-ARCHITECTURE/TECH-STACK.md).

### Buttons

| Variant | Use | Appearance |
|---|---|---|
| `primary` | The one main action on a screen | Accent fill |
| `secondary` | Alternative actions | Bordered, transparent |
| `ghost` | Tertiary, toolbars | No border until hover |
| `destructive` | Delete | Incorrect colour, always confirmed |

One primary button per screen. Two primary buttons means neither is primary.

Minimum touch target 44×44px, including for icon-only buttons. This is a hard rule, not a guideline — it is the single most common mobile accessibility failure.

Disabled buttons always carry a reason, via tooltip on desktop and helper text on mobile. A disabled control with no explanation is a dead end.

### Cards

`--surface` background, `--border` outline, `--radius`, no shadow. Padding `--space-4` on mobile, `--space-6` above.

### Inputs

- Always a visible label. Placeholders are not labels; they vanish on focus and are invisible to some assistive technology.
- Minimum height 44px.
- Font size at least 16px, to prevent iOS zoom.
- Errors appear below the field, in text, referenced by `aria-describedby`.

### Focus

```css
--focus-ring: 0 0 0 2px var(--bg), 0 0 0 4px var(--accent);
```

Visible on every interactive element. Never removed. The double ring keeps it visible against both light and dark surfaces.

### Dialogs and sheets

Dialogs on desktop, bottom sheets on mobile. A centred modal on a phone fights the keyboard; a bottom sheet does not.

Radix handles focus trapping, restoration, and escape-to-close.

## Feature-specific patterns

### Question card

The most-viewed component in the app.

- One question per screen, no exceptions
- Question text at `--text-lg`
- Options as full-width tappable rows, at least 56px tall, with generous separation to prevent mis-taps
- The primary action fixed to the bottom on mobile, within thumb reach
- Progress as text, "Question 4 of 10", not only a bar
- After answering: correctness with icon and label, the correct answer, the explanation, and the page citation

### Flashcard

- Large central text, `--text-xl`
- Whole card tappable to flip
- Rating buttons appear only after the flip, so the answer cannot be seen prematurely
- Four rating buttons in a row on desktop, a 2×2 grid on mobile
- Each rating shows its resulting interval: "Good — back in 3 days"

### Citation

The most important component in the product, and consistent everywhere generated content appears.

- `--text-sm`, `--mark-text`, on a `--mark-soft` chip, with a highlighter icon
- The page number in `--font-mono` with tabular figures: "From page 47"
- Tappable. Opening it reveals the source passage with the quoted sentence highlighted in `--mark-soft`, joined to the chip by a `--mark-line` rule
- Never styled as a warning or an afterthought

**This was previously specified at `--text-xs` in `--text-muted`.** That is footnote styling on the one element that separates this product from a tool that makes things up, and it contradicted the next line of its own spec. Raised deliberately in [ADR-0008](../08-DECISIONS/ADR-0008-TWO-VISUAL-REGISTERS.md).

### Progress and stats

- Numbers over gauges. "7 of 10" beats a dial.
- No grade letters, no badges, no celebration animation
- Charts use `--accent` for the primary series and `--text-muted` for context, never a rainbow palette

## Print

`src/styles/print.css`, for exams and answer keys. Detail in [FEATURES-SPECIFICATION.md](../01-PRODUCT/FEATURES-SPECIFICATION.md).

- Force light colours regardless of the app's theme, since printing a dark theme wastes ink and reads badly
- Hide all navigation, buttons, and interface chrome
- Serif body face for paper legibility
- `break-inside: avoid` on questions, so a question is never split from its options
- Answer key starts on a new page
- Show the question number and total in a running footer

## Iconography

`lucide-react`, at a consistent 20px in text contexts and 24px standalone. Icons are never the only label for an action.

## Tailwind mapping

Tokens are exposed to Tailwind so utilities read semantically:

```js
colors: {
  bg: 'var(--bg)',
  surface: 'var(--surface)',
  border: 'var(--border)',
  text: { DEFAULT: 'var(--text)', muted: 'var(--text-muted)', subtle: 'var(--text-subtle)' },
  accent: { DEFAULT: 'var(--accent)', text: 'var(--accent-text)' },
  correct: 'var(--correct)',
  incorrect: 'var(--incorrect)',
}
```

Raw colour utilities such as `bg-slate-100` are disallowed in components; they bypass theming and break dark mode. Enforced by review.

## Dark mode

Driven by `prefers-color-scheme`, overridable in settings, persisted to `settings.theme`, and applied via a `data-theme` attribute on the root element so the manual override wins in both directions.

No flash of the wrong theme on load: the attribute is set by a tiny inline script before first paint.
