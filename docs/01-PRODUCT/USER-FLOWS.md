# User Flows

Purpose: the step-by-step journeys through the app, including what goes wrong along the way.
Last updated: 2026-07-31

## Flow 1 — First visit to first question

The most important flow in the product. If this takes too long or asks for too much, nothing else matters.

```
Landing page
  │  Headline, one line of explanation, and a big drop zone.
  │  No tour. No cookie banner (we set no tracking cookies).
  ▼
Drop or pick a file
  │  Routes into /app/parse, which is gated behind Google sign-in (ADR-0011).
  ▼
Signed out? ──► "Sign in to continue" ──► Google redirect ──► back to an empty parse page
  │                                                             (the dropped file is lost;
  │                                                              drop it again — a known,
  │                                                              accepted rough edge)
  ▼
Parsing            ─────► Failure ─────► Clear message + what to try instead
  │  Named stages: reading, extracting text, finding topics.       │
  │  Interface stays responsive.                                   └──► back to drop zone
  ▼
Document ready
  │  Title, page count, detected topic outline.
  │  Four large actions: Quiz me · Flashcards · Explain · Make an exam
  │  "Quiz me" is visually primary.
  ▼
Tap "Quiz me"
  │  Quick options, all pre-filled with sensible defaults:
  │  10 questions · Medium · whole document · mixed types
  │  A "Start" button that works without touching any of it.
  ▼
Generating ────────► Quota exhausted ────► Plain message + reset time + BYOK offer
  │  Cancellable. Shows what it is doing.
  ▼
First question on screen
```

**Target: under two minutes from landing to first question**, sign-in included. Steps a user is forced to interact with: pick a file, sign in with Google (first visit only — the session persists after), tap Quiz me, tap Start.

## Flow 2 — The cram session

Maya, three days out, on her phone.

```
Open app (installed to home screen, opens offline)
  ▼
Home shows: 23 cards due today · Last quiz 62% · Weakest topic "Krebs cycle"
  ▼
Tap "Drill my weak spots"
  │  Generates a quiz weighted towards the topics she keeps failing.
  ▼
Answer questions, one per screen
  │  Wrong answer ─► explanation + source page + "explain this simply"
  │              └─► "add to flashcards" so it comes back tomorrow
  ▼
Results: 78%, up from 62%
  │  Per-topic breakdown shows Krebs cycle is now her second-worst, not worst.
  ▼
"Review 23 due cards" ─► card session ─► streak increments
  ▼
Close app. Tomorrow's due count is already scheduled.
```

The loop that matters: fail something, understand it, turn it into a card, meet it again later.

## Flow 3 — Teacher makes a printable exam

Sam, on a laptop, needs paper by tomorrow.

```
Upload textbook chapter (DOCX or PDF)
  ▼
Tap "Make an exam"
  │  Full controls: 25 questions · 60% MCQ, 20% short answer, 20% true/false
  │  Difficulty spread · topics to cover · 45 minute limit · 2 marks each
  ▼
Generate ─► Preview
  │  Exam on the left, answer key on the right.
  │  Any question can be edited or regenerated individually.
  ▼
Print
  │  Print stylesheet: no navigation, light colours regardless of dark mode,
  │  no question split across a page break, answer key starts on a new page.
  ▼
Paper exam + answer key
```

Also available at this point: export the same questions as Anki CSV for a class deck.

## Flow 4 — Ask the document a question

```
Open a document ─► "Ask about this"
  ▼
Type a question
  ▼
Retrieval decides:
  ├── Document fits the context window ──► send the whole text
  └── Document is long ──────────────────► BM25 selects the most relevant chunks
  ▼
Answer with inline page references [p. 47]
  │  Tap a reference ─► the source passage opens
  ▼
Options: ask a follow-up · save as flashcard · explain simpler
  ▼
Document does not cover it ──► "This document does not seem to cover that."
                               Never an answer invented from general knowledge.
```

## Flow 5 — Moving between devices

Optional cloud sync ([ADR-0010](../08-DECISIONS/ADR-0010-OPTIONAL-CLOUD-SYNC.md)) is manual, not automatic, so export/import remains the deliberate, explicit path between devices regardless of sign-in.

```
Phone: Settings ─► Export study pack ─► sf-pack-biology.json
  │  Shared however the user likes: email, chat, cloud drive, cable.
  ▼
Laptop: Settings ─► Import ─► pick the file
  │  Validated first. On mismatch: clear explanation, nothing written.
  │  On conflict: asked whether to merge or replace.
  ▼
Same decks, same schedule, same history.
```

The app tells users up front that data lives in this browser only, and prompts an export after significant work so nobody loses a month of reviews to a cleared cache.

## Flow 6 — Hitting the shared quota

The flow most products handle badly. Ours has to be honest.

```
User taps "Quiz me"
  ▼
Proxy reports the shared daily quota is spent
  ▼
Screen states: what happened, when it resets (in local time), and the two options:
  ├── Wait for the reset ──► everything already saved still works offline
  └── Use your own free key
        ▼
      Short guide: where to get a free Google AI Studio key, three steps, with a link
        ▼
      Paste the key ─► stored in this browser only, never sent to our servers
        ▼
      Unlimited by our quota; subject only to the user's own free-tier limits
```

No paywall. No "upgrade". No dark pattern. The word "premium" does not exist in this product.

## Flow 7 — Offline

```
Open app with no connection
  ▼
Loads from service worker cache
  ▼
Offline banner names what still works and what does not:
  Works: review cards · saved quizzes · saved explanations · saved exams · exports
  Needs a connection: generating anything new
  ▼
AI actions are visibly disabled with a reason, not left to fail on tap
  ▼
Connection returns ─► banner clears, actions re-enable
```

## Flow 8 — First-run empty states

Every screen a new user can reach before they have data needs to say something useful.

| Screen | Empty state |
|---|---|
| Library | The drop zone itself, plus one line on what happens next |
| Flashcards | "No cards yet. Upload something and we'll make them for you." with the action |
| Due today | "Nothing due. Either you're ahead, or you haven't started." |
| Dashboard | "Take a quiz and this fills in." No fake sample charts. |
| Exams | "Nothing here yet." with the action |

No empty state is a dead end. Every one contains the action that fills it.

## Error handling principles across all flows

1. **Fail at the earliest possible point.** Reject an oversized file before spending thirty seconds parsing it.
2. **Never lose work.** A cancelled or failed generation keeps whatever was already produced.
3. **Always name a next step.** An error with no suggested action is an incomplete error.
4. **Never blame the user.** The file is not "invalid"; it is a kind we cannot read yet.
5. **Never show internals.** No stack traces, no HTTP status codes, no library error strings in the interface.

Exact wording for every message in [CONTENT-AND-COPY-GUIDE.md](../02-DESIGN/CONTENT-AND-COPY-GUIDE.md).
