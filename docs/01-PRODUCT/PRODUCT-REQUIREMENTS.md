# Product Requirements

Purpose: user stories with testable acceptance criteria. This is the contract between the plan and the build.
Last updated: 2026-07-30

Each story is written from the user's perspective and each criterion is something you can actually check. Anything not checkable has been rewritten until it is.

Identifiers are stable. Reference them in commits, issues, and tests.

---

## Epic A — Getting material in

### A1. Upload a document

> As a student, I want to upload my lecture PDF so the app can make practice material from it.

**Acceptance criteria**
- Drag-and-drop and tap-to-browse both work; on a phone the native file picker opens
- Accepted: `.pdf`, `.pptx`, `.docx`, `.epub`, `.txt`, `.md`
- Progress is shown with named stages, not an indeterminate spinner
- The interface remains responsive throughout, because parsing runs in a worker
- On success the document appears in the library with its title and page count
- A visible statement confirms the file did not leave the device
- No network request carrying file contents is made during upload or parsing

### A2. Be told clearly when a file will not work

> As a student, I want to understand why my file failed so I can do something about it.

**Acceptance criteria**
- A scanned PDF is detected and refused, with a message explaining it is images rather than text
- A password-protected PDF is refused, with an explanation
- An oversized file is refused before parsing, and the message names the file's actual size and the limit
- An unsupported format is refused, and the message lists the formats that do work
- Every failure message names a next step
- No error message shows a stack trace, an error code, or the words "failed" or "invalid" on their own

### A3. Combine several files into one study set

> As a student, I want to put four slide decks together so I can study the whole unit at once.

**Acceptance criteria**
- Up to 10 documents can belong to one study set
- Citations remain traceable to the correct source file and page
- A study set can be renamed and deleted
- Deleting a study set asks for confirmation and states what will be lost

---

## Epic B — Practising

### B1. Generate a quiz

> As a student, I want a quiz on my document so I can find out what I do not know.

**Acceptance criteria**
- Count selectable as 5, 10, 20, or custom up to 50
- Difficulty selectable as Easy, Medium, or Hard
- Topic scope selectable from the detected outline, defaulting to the whole document
- Question types selectable across multiple choice, true/false, short answer, fill in the blank
- Every returned question carries a source page number; questions without one never reach the user
- Correct-answer position is randomised across a generated set
- Generation is cancellable, and cancelling keeps whatever was already produced
- Time to first question stays under 30 seconds for a 20-page document on a typical connection

### B2. Take a quiz

> As a student, I want to answer questions one at a time and know immediately whether I was right.

**Acceptance criteria**
- One question per screen; the primary control sits in thumb reach on a phone
- Progress shown as a position out of a total
- After answering: correctness, the correct answer, an explanation, and the source page
- A control opens the source passage the question came from
- A control reports a bad question, which excludes it from scoring
- Closing the app mid-quiz and returning restores the same position
- Fully operable by keyboard, with visible focus

### B3. See quiz results and act on them

**Acceptance criteria**
- Results show score, time taken, and accuracy per topic
- One action retries only the missed questions
- One action converts missed questions into flashcards
- Results are stored locally and appear in the dashboard history

### B4. Study flashcards

**Acceptance criteria**
- Cards generate automatically from a document, including cloze cards
- Tap or click flips; swipe works on touch devices
- Four-point rating recorded per card: Again, Hard, Good, Easy
- Cards are editable, deletable, and creatable by hand
- Read-aloud works per card
- Keyboard: space flips, 1 to 4 rate

### B5. Review on a schedule

**Acceptance criteria**
- Each card has a next-due date computed by FSRS
- Home screen shows a count of cards due today
- A review session serves due cards, defaulting to 20 with an option to continue
- Ratings change the next interval in the direction FSRS specifies
- A streak counter tolerates one missed day without resetting
- Repeatedly failed cards are flagged as leeches

---

## Epic C — Understanding

### C1. Get something explained

**Acceptance criteria**
- Triggerable from selected text, from a topic in the outline, and from a quiz answer
- Three depths available: Simple, Normal, Deep
- Switching depth does not lose the previous version
- Source pages are cited
- If the document does not cover the topic, the response says so rather than answering from general knowledge
- Explanations can be saved and are readable offline

### C2. Ask questions about the document

**Acceptance criteria**
- Chat is scoped to a chosen document or study set
- Answers carry inline page references that open the source passage when tapped
- When the document lacks the answer, the reply says so
- Conversation history persists per document
- Any answer converts to a flashcard in one action
- No embedding API is called at any point

---

## Epic D — Exams

### D1. Generate a practice exam

**Acceptance criteria**
- Question count, type mix, difficulty distribution, and topic coverage are all configurable
- An optional time limit and optional marks per question can be set
- Output includes an exam and a separate answer key
- Answer key entries include a rationale and a source page

### D2. Take or print the exam

**Acceptance criteria**
- Taking it in-app shows a countdown when a time limit is set, and scores on submission
- Print output contains no navigation or interface chrome
- Print output is legible in light colours regardless of the app's dark-mode state
- The answer key begins on a new page
- Page breaks never split a question from its answer options

---

## Epic E — Progress

### E1. See where I am weak

**Acceptance criteria**
- Accuracy per topic is shown, computed from stored quiz and card history
- A ranked list recommends what to review next
- An accuracy trend over time is charted
- A single action generates a quiz weighted towards the weakest topics
- All computation is local; no analytics request leaves the device

---

## Epic F — Keeping and moving data

### F1. Export

**Acceptance criteria**
- Flashcards export to CSV that imports cleanly into Anki and into Quizlet
- A study pack exports as one `.json` file
- A full archive exports all local data as `.json`
- Exports work offline

### F2. Import

**Acceptance criteria**
- Study packs and full archives import successfully
- A malformed or mismatched file is rejected with a clear explanation and no partial write
- Import never overwrites existing data without asking

### F3. Delete everything

**Acceptance criteria**
- One clearly labelled control removes all local data
- Confirmation states exactly what will be lost and that it cannot be undone
- After deletion the app returns to its first-run state

---

## Epic G — Availability and limits

### G1. Work offline

**Acceptance criteria**
- After a first successful load, the app opens with no connection
- Card review, saved quizzes, saved explanations, and saved exams all work offline
- An offline indicator names which features are currently unavailable
- Actions requiring AI are disabled with an explanation, not left to fail

### G2. Handle an exhausted quota gracefully

**Acceptance criteria**
- When the shared daily quota is spent, the message says so plainly and states when it resets
- No alternative is offered: bring-your-own-key was removed (ADR-0014), so the reset time is all the app can honestly give
- Nothing already stored becomes unavailable because the quota ran out
- The word "upgrade" appears nowhere, and no payment is ever suggested

### G3. Install to the home screen

**Acceptance criteria**
- The install prompt appears only after a meaningful action, such as finishing a first quiz
- Installed, the app opens full screen with its own icon
- The prompt can be dismissed permanently

---

## Non-functional requirements

| Requirement | Target | How it is verified |
|---|---|---|
| First contentful paint | Under 1.5s on a 4G connection | Lighthouse |
| Initial JavaScript bundle | Under 300 KB gzipped, excluding lazily-loaded parsers | Build output check |
| Parse a 100-page PDF | Under 10s on a mid-range Android device | Manual test on real hardware |
| Interface stays responsive during parsing | No frame longer than 50ms on the main thread | Performance profile |
| Lighthouse accessibility score | 95 or above | CI |
| Contrast | WCAG 2.2 AA throughout | Automated axe check plus manual review |
| Keyboard operation | Every feature reachable and operable | Manual test |
| Works with JavaScript-heavy blocking extensions | Degrades with an explanation, not a blank page | Manual test |
| Cost to run | $0 | [ZERO-COST-INFRASTRUCTURE.md](../04-OPERATIONS/ZERO-COST-INFRASTRUCTURE.md) |

## Out of scope

See [NON-GOALS-AND-SCOPE.md](NON-GOALS-AND-SCOPE.md). No story above may be interpreted as requiring an account, a server-side database, or a paid service.
