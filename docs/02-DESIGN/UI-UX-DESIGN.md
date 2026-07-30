# UI and UX Design

Purpose: what each screen contains and why it is arranged that way.
Last updated: 2026-07-30

Tokens in [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md). Adaptation rules in [RESPONSIVE-AND-MOBILE.md](RESPONSIVE-AND-MOBILE.md). Copy in [CONTENT-AND-COPY-GUIDE.md](CONTENT-AND-COPY-GUIDE.md).

## Principles for every screen

1. **One job per screen.** If a screen has two purposes, it is two screens.
2. **One primary action.** Visually obvious, bottom-anchored on mobile.
3. **No dead ends.** Every state, including empty and error states, contains a next action.
4. **Progress is always visible.** The user always knows where they are and how much is left.
5. **Trust is shown, not claimed.** Citations on generated content, and a plain statement that files stay local.

## Marketing page (`/`)

Added in [ADR-0008](../08-DECISIONS/ADR-0008-TWO-VISUAL-REGISTERS.md). The expressive register: dark ground, display serif, scroll-driven motion.

**It opens with a working drop zone, not a picture of one.** Dropping a file goes straight to `/app/parse`, so the three-tap path in [USER-FLOWS.md](../01-PRODUCT/USER-FLOWS.md) is intact and the drop zone still clears the fold at 320x568. Everything below the fold is for the visitor who needs convincing first.

| # | Section | Job |
|---|---|---|
| 1 | Hero and drop zone | Start, or read on |
| 2 | Rereading is not studying | The problem, concretely |
| 3 | From a page to a question | **The signature.** A source passage, an amber thread, the question it produced |
| 4 | Four things out of one file | Real rendered quiz, card, explanation, and exam paper. Not icons in boxes. |
| 5 | Nothing is invented | The grounding rule |
| 6 | Your file never leaves your device | Including the honest caveat that request text does transit |
| 7 | Free means free | The real cost table, every service and its limit |
| 8 | Take it and run your own | Source and self-hosting |
| 9 | Bring a file | The drop zone again |

Section 6 states plainly that the portion of text needed for a request is sent to the model and discarded. [SECURITY-AND-PRIVACY.md](../04-OPERATIONS/SECURITY-AND-PRIVACY.md) says so; a page arguing that the product never invents things cannot itself overstate its privacy position.

Returning visitors skip `/` and land on the library.

## Landing (in-app)

Reached at `/app/library`. The calm register.

```
┌────────────────────────────────────┐
│  ScholarForge AI                   │
│                                    │
│  Turn your notes into practice     │
│                                    │
│  Upload a PDF, slides, or a book.  │
│  Get quizzes, flashcards,          │
│  explanations, and a practice      │
│  exam.                             │
│                                    │
│  ┌──────────────────────────────┐  │
│  │                              │  │
│  │   Drop a file here, or       │  │
│  │   tap to choose one          │  │
│  │                              │  │
│  │   PDF · PowerPoint · Word    │  │
│  │   EPUB · text                │  │
│  └──────────────────────────────┘  │
│                                    │
│  Your file stays on your device.   │
│  We never upload it.               │
│                                    │
│  Free. No account needed.          │
└────────────────────────────────────┘
```

The drop zone is the largest element on the page and sits above the fold on a 320px screen. Everything else is subordinate to it.

**Not present:** a signup form, a tour, a feature grid, testimonials, a cookie banner (we set no tracking cookies), or a hero illustration. Each of those would push the drop zone down.

The privacy line sits directly beneath the drop zone rather than in a footer, because that is the moment scepticism arises.

Returning users skip this and land on the library.

## Parsing

A transient screen, but it carries the first impression of competence.

```
┌────────────────────────────────────┐
│  lecture-notes-week-8.pdf          │
│                                    │
│  ████████████░░░░░░░░  62%         │
│                                    │
│  Reading page 112 of 180           │
│                                    │
│  [ Cancel ]                        │
└────────────────────────────────────┘
```

Named stages with real numbers, not an indeterminate spinner. Cancellable. The interface stays responsive throughout because parsing runs in a worker.

## Document

The hub for one document. Where the user chooses what to do.

```
┌────────────────────────────────────┐
│  ← Lecture Notes Week 8            │
│     180 pages · added today        │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  Quiz me                     │  │  ← primary
│  └──────────────────────────────┘  │
│  ┌───────────┐  ┌───────────────┐  │
│  │ Flashcards│  │ Ask about it  │  │
│  └───────────┘  └───────────────┘  │
│  ┌──────────────────────────────┐  │
│  │  Build a practice exam       │  │
│  └──────────────────────────────┘  │
│                                    │
│  Topics                            │
│  ▸ 1. Cellular Respiration         │
│  ▸ 2. Glycolysis                   │
│  ▸ 3. The Krebs Cycle              │
│  ▸ 4. Electron Transport           │
│                                    │
└────────────────────────────────────┘
```

Quiz me is primary because retrieval practice is the highest-value action and the persona's actual need. The others are available but visually secondary.

Tapping a topic scopes any subsequent action to that topic. Tapping the chevron expands to subsections.

When outline detection found nothing usable, the topic list is replaced with page-range selection and a line explaining why, rather than showing an empty list.

## Quiz configuration

Deliberately skippable. Every field is pre-filled and Start works without touching anything.

```
┌────────────────────────────────────┐
│  ← What kind of quiz?              │
│                                    │
│  How many questions                │
│  [ 5 ] [ 10 ] [ 20 ] [ Custom ]    │
│         ^^^^                       │
│                                    │
│  How hard                          │
│  ○ Easy — can you remember it      │
│  ● Medium — can you explain it     │
│  ○ Hard — can you use it           │
│                                    │
│  What to cover                     │
│  [ Everything ▾ ]                  │
│                                    │
│  ▸ Question types                  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  Start the quiz              │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

Difficulty labels describe the cognitive demand rather than using bare adjectives, because "medium" alone tells a student nothing about what they are choosing.

Question types are collapsed by default. Most users will never open it, and that is fine.

## Taking a quiz

The most-used screen in the product.

**Before answering**

```
┌────────────────────────────────────┐
│  ← Question 4 of 10          [⏸]   │
│  ████████░░░░░░░░░░░░              │
│                                    │
│  Which molecule is the primary      │
│  electron carrier in the Krebs      │
│  cycle?                             │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  NADH                        │  │
│  ├──────────────────────────────┤  │
│  │  ATP                         │  │
│  ├──────────────────────────────┤  │
│  │  Pyruvate                    │  │
│  ├──────────────────────────────┤  │
│  │  Glucose                     │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  Check my answer             │  │  ← fixed to bottom
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

**After answering**

```
┌────────────────────────────────────┐
│  ← Question 4 of 10                │
│                                    │
│  ✓ Correct                         │
│                                    │
│  NADH carries electrons from the    │
│  Krebs cycle to the electron        │
│  transport chain, where they drive  │
│  ATP synthesis.                     │
│                                    │
│  From page 47   [ Show me where ]   │
│                                    │
│  [ This question looks wrong ]      │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  Next question               │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

Correctness is shown with an icon and a word, never colour alone.

The citation is styled as ordinary content rather than as a caveat. It is the trust mechanism, and burying it would undermine the grounding promise.

"This question looks wrong" is prominent enough to find and quiet enough not to invite idle use. It excludes the question from scoring, because a student should never be penalised for our generation error.

Pause is available, and progress survives closing the app.

## Quiz results

```
┌────────────────────────────────────┐
│  You got 7 of 10                   │
│  6 min 40 sec                      │
│                                    │
│  How you did by topic              │
│  Glycolysis          ████████ 100% │
│  Electron Transport  ██████░░  75% │
│  Krebs Cycle         ██░░░░░░  33% │
│                                    │
│  Worth another look:               │
│  The Krebs Cycle                   │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  Retry the 3 I missed        │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │  Turn those into flashcards  │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

No grade letter, no badge, no celebration. The number, the breakdown, and two actions that turn a result into further study.

The two actions are the mechanism that makes the product a loop rather than a one-off.

## Flashcard review

```
┌────────────────────────────────────┐
│  ← 12 of 23                        │
│                                    │
│                                    │
│      What does NADH do in           │
│      cellular respiration?          │
│                                    │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  Show the answer             │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

After the flip:

```
┌────────────────────────────────────┐
│  ← 12 of 23                        │
│                                    │
│      Carries electrons to the       │
│      electron transport chain       │
│                                    │
│  From page 47        [ 🔊 Read ]    │
│                                    │
│  How did that go?                  │
│  ┌────────┐┌────────┐              │
│  │ Again  ││  Hard  │              │
│  │ 10 min ││  1 day │              │
│  ├────────┤├────────┤              │
│  │  Good  ││  Easy  │              │
│  │ 3 days ││ 6 days │              │
│  └────────┘└────────┘              │
└────────────────────────────────────┘
```

Rating buttons appear only after the flip, so the answer cannot be glimpsed early.

Each button shows the interval it produces. This is genuinely useful: it makes the scheduling legible rather than mysterious, and it helps a user rate honestly instead of guessing what the buttons mean.

## Ask your document

```
┌────────────────────────────────────┐
│  ← Ask about Lecture Notes         │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ Why does the Krebs cycle     │  │
│  │ produce more NADH than       │  │
│  │ glycolysis?                  │  │
│  └──────────────────────────────┘  │
│                                    │
│  The Krebs cycle runs twice per     │
│  glucose molecule and includes      │
│  four oxidation steps [p. 47],      │
│  while glycolysis has only one      │
│  [p. 41].                           │
│                                    │
│  [ Save as flashcard ]              │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ Ask anything...          [→] │  │  ← rises with keyboard
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

Inline `[p. N]` citations are tappable and open the source passage. Save-as-flashcard turns a moment of understanding into something that will come back.

## Exam preview

Desktop gets exam and answer key side by side. Mobile puts the key behind a tab.

```
┌─────────────────────┬──────────────────────┐
│  EXAM               │  ANSWER KEY          │
│                     │                      │
│  Cellular           │  1. B (NADH)         │
│  Respiration        │     NADH is the       │
│  45 minutes         │     primary carrier   │
│  25 questions       │     — p. 47           │
│                     │                      │
│  1. Which molecule  │  2. True              │
│     is the primary  │     Glycolysis occurs │
│     electron...     │     in the cytoplasm  │
│     A) ATP          │     — p. 41           │
│     B) NADH         │                      │
│     ...             │  [ regenerate ]       │
│                     │                      │
│  [ Print ] [ Take it now ]                 │
└─────────────────────┴──────────────────────┘
```

Individual questions can be regenerated without rebuilding the whole exam, which matters for the teacher persona reviewing before printing.

## Dashboard

```
┌────────────────────────────────────┐
│  Progress                          │
│                                    │
│  23 due today    12 day streak     │
│                                    │
│  Accuracy over time                │
│  ┌──────────────────────────────┐  │
│  │            ╱─────            │  │
│  │      ╱────╯                  │  │
│  │  ╱──╯                        │  │
│  └──────────────────────────────┘  │
│                                    │
│  Weakest topics                    │
│  Krebs Cycle          33%          │
│  Electron Transport   58%          │
│  Photosynthesis       71%          │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  Drill my weak spots         │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

The primary action turns diagnosis into practice in one tap, which is the point of having a dashboard at all.

No guilt mechanics. No "you haven't studied in 5 days". The dashboard is a mirror, not a manager.

## Settings

Grouped, with the important things first.

| Group | Contains |
|---|---|
| Appearance | Theme, reading mode, reduce motion |
| Studying | Daily card limit, focus timer |
| AI | Your own API key, with the privacy note |
| Your data | Export, import, storage usage, delete everything |
| About | Version, licence, source code, report a problem |

**Your data** is where the local-first consequences live: how much space is used, how to back up, and how to wipe. Export is prominent rather than buried, because it is the only protection against losing everything.

Delete everything is at the bottom, styled destructive, and confirmed with a dialog that names what will be lost and offers an export first.

## States every screen must handle

| State | Requirement |
|---|---|
| Empty | Explains what goes here and contains the action that fills it. No fake sample data. |
| Loading | Real progress with stage text where possible, never an indefinite pulse |
| Error | What happened, what to do next, in plain words |
| Offline | Names what still works; unavailable actions disabled with a reason |
| Quota spent | Honest, with reset time and the own-key alternative |
| Partial result | Says how many items were produced and why some were left out |

The partial-result state is unusual and worth keeping. When grounding validation drops two of ten questions, saying so is better than silently delivering eight, which reads as a bug.
