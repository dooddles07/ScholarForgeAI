# Responsive and Mobile

Purpose: how the layout adapts, and the mobile rules that are not negotiable.
Last updated: 2026-07-30

The primary persona studies on a phone, in bed, at night. Mobile is the design target, and desktop is the expansion. Not the other way round.

## Breakpoints

Tailwind defaults, used as minimums rather than as device categories.

| Name | Min width | Typical |
|---|---|---|
| base | 0 | Phones. The default. |
| `sm` | 640px | Large phones landscape, small tablets |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |

**Every component is written mobile-first.** Unprefixed styles are the phone layout; `md:` and above are progressive additions. A component whose base styles assume a wide viewport is a bug.

The narrowest supported viewport is 320px. It is uncommon but real, and it is where layouts break first.

## Layout per breakpoint

| Screen | Phone | Tablet | Desktop |
|---|---|---|---|
| Navigation | Bottom tab bar | Bottom tab bar | Left sidebar |
| Library | Single column list | Two-column grid | Three-column grid |
| Document | Stacked: outline collapsed above content | Outline as a drawer | Outline fixed beside content |
| Quiz | One question, full width, action fixed at bottom | Same, centred, capped width | Same, centred, capped width |
| Flashcard | Full-screen card, swipe enabled | Centred card | Centred card, keyboard-driven |
| Dashboard | Stacked cards | Two columns | Two or three columns |
| Exam preview | Exam only, key behind a tab | Exam only, key behind a tab | Exam and key side by side |
| Chat | Full screen, input fixed at bottom | Same | Chat with the document beside it |

Two things stay the same at every size, because changing them would harm the experience: **one question per screen**, and **content capped at a readable measure**. A quiz question stretched across a 27-inch monitor is worse, not better.

## Navigation

**Bottom tab bar on phone and tablet.** Bottom navigation is reachable by thumb; top navigation is not. Four items: Library, Review, Progress, Settings.

**Left sidebar from `lg` up.** More room, and pointer input makes reach irrelevant.

The bottom bar respects `env(safe-area-inset-bottom)` so it clears the home indicator on modern iPhones. Without this it sits under the system gesture area and becomes hard to tap.

## Thumb zones

On a phone held one-handed, the bottom third of the screen is comfortable, the middle is a stretch, and the top corners are effectively out of reach.

Consequences:

| Element | Placement |
|---|---|
| Primary action | Fixed to the bottom, full width |
| Secondary actions | Bottom, beside or beneath the primary |
| Destructive actions | Never at the bottom — too easy to hit by accident |
| Back and close | Top left, but always with a swipe or hardware-back alternative |
| Content | Scrolls through the middle and top |

The rule that matters: **on any screen with a main action, that action is at the bottom.** Check my answer, Start the quiz, Show the answer, Submit. All bottom-anchored.

## Touch targets

| Rule | Value |
|---|---|
| Minimum tap target | 44×44px, including icon-only buttons |
| Minimum spacing between targets | 8px |
| Quiz answer option height | 56px minimum |
| Rating buttons | 56px minimum |

Answer options get extra height because tapping the wrong answer by accident is uniquely frustrating — the user loses the question, not just a tap.

Undersized touch targets are the most common mobile accessibility failure. It is worth checking explicitly rather than assuming.

## Gestures

Gestures are additions, never the only way to do something.

| Gesture | Action | Alternative |
|---|---|---|
| Swipe right on a card | I knew it | Rating buttons |
| Swipe left on a card | I did not | Rating buttons |
| Tap card | Flip | Space bar on desktop |
| Pull to refresh | Nothing | Deliberately not implemented; there is no server state to refresh |

Swipe thresholds are forgiving, and a partial swipe springs back with visible feedback so the gesture is discoverable rather than mysterious.

## Keyboard on mobile

The on-screen keyboard covers up to half the viewport, and layouts that ignore it break.

- Any focused input scrolls into view above the keyboard
- Bottom-fixed actions move above the keyboard rather than hiding behind it
- Input font size is at least 16px, otherwise iOS Safari zooms the whole page on focus
- `inputmode` and `autocomplete` set appropriately, so a number field gets a number pad
- The chat input is bottom-anchored and rises with the keyboard

## Orientation

Both supported. The manifest expresses a portrait preference but does not lock rotation, because a user reading a document may well want landscape.

Landscape on a phone is a genuinely awkward case: very little vertical room. Handled by allowing bottom-fixed actions to become inline, so they do not consume a third of the available height.

## Safe areas

Notches, home indicators, and rounded corners.

```css
padding-bottom: max(var(--space-4), env(safe-area-inset-bottom));
padding-left:   max(var(--space-4), env(safe-area-inset-left));
```

Applied to the bottom navigation, bottom-fixed actions, and full-screen sheets. Skipping this is what makes a PWA feel unfinished on an iPhone.

## Performance on mobile

The target device is a mid-range Android phone with 4GB of RAM on mobile data, not a flagship on wifi.

| Concern | Approach |
|---|---|
| Bundle size | Under 300 KB gzipped initial, parsers lazy-loaded |
| Fonts | System stack only, no download, no layout shift |
| Images | None decorative; icons are SVG |
| Parsing | Web Worker, so the interface never freezes |
| Long lists | Virtualised above a few hundred items |
| Memory | Hard 50 MB file ceiling; page resources released after extraction |
| Repeat visits | Service worker cache, so it opens instantly and offline |

Targets and verification in [PRODUCT-REQUIREMENTS.md](../01-PRODUCT/PRODUCT-REQUIREMENTS.md).

## Testing

**Viewports** to check every layout at: 320, 360, 390, 414, 768, 1024, 1280, 1920.

**Real devices**, not only emulators. Emulators do not reproduce touch accuracy, keyboard behaviour, memory pressure, or Safari's particular quirks. At minimum: one mid-range Android phone and one iPhone.

**Checks per screen**
- No horizontal scrolling at 320px
- Primary action reachable by thumb
- All tap targets at least 44px
- Keyboard does not obscure the focused input
- Safe areas respected
- Text scales to 200% without breaking layout
- Landscape usable

**Automated**, in Playwright: viewport matrix across the main flows, plus an assertion that no page scrolls horizontally at 320px.

## Desktop is not an afterthought

Mobile-first does not mean desktop-neglected. From `lg` up:

- Full keyboard operation: space to flip, 1–4 to rate, arrows to navigate, Enter to submit, `?` for the shortcut sheet
- A sidebar that uses the extra width for navigation rather than stretching content
- Side-by-side layouts where two things genuinely benefit from being visible together: exam and answer key, chat and document
- Hover states, which do not exist on touch

The one thing desktop does not get is wider text. Measure stays capped regardless of window size.
