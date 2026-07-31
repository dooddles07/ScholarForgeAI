# Features Specification

Purpose: every feature, specified in enough detail to build from.
Last updated: 2026-07-30

Priority tags: **MUST** ships in v1 or we have no product. **SHOULD** ships in v1, cut only under time pressure. **COULD** nice to have, first to go. **WON'T** explicitly excluded, see [NON-GOALS-AND-SCOPE.md](NON-GOALS-AND-SCOPE.md).

---

## F1. Document upload — MUST

### Supported formats

| Format | Extensions | How we read it | Notes |
|---|---|---|---|
| PDF | `.pdf` | `pdfjs-dist` text layer | Text-based only; scans are detected and refused |
| PowerPoint | `.pptx` | `jszip` + slide XML | Slide text and speaker notes. Legacy `.ppt` not supported |
| Word | `.docx` | `mammoth` | Headings preserved as structure. Legacy `.doc` not supported |
| EPUB | `.epub` | `jszip` + chapter HTML | Chapter titles become topics |
| Plain text | `.txt`, `.md` | Native | Markdown headings become structure |

### Behaviour

- Drag and drop onto the page, or tap to open the file picker. On mobile, the picker allows choosing from Files or Photos.
- Multiple files can be uploaded into one study set.
- A progress indicator shows the real stage: reading the file, extracting text, then finding topics.
- Parsing happens in a Web Worker so the interface never freezes.
- Nothing is uploaded to any server. This is stated on screen at the point of upload, because users will not believe it otherwise.

### Limits and guardrails

| Limit | Value | Behaviour at the limit |
|---|---|---|
| Single file size | 50 MB | Refused before parsing, with the actual file size named |
| Pages per document | 1,000 | Warns and offers to process a page range instead |
| Files per study set | 10 | Refused with a suggestion to make a second set |
| Total local storage | Browser-dependent | Warns at 80% full, offers to delete old documents |

### Failure cases, all with plain-language messages

- **Scanned or image-only PDF.** Detected when extracted text is under roughly 100 characters per page. Message explains the file is a picture of text and suggests finding a text version.
- **Password-protected PDF.** Detected and refused with an explanation.
- **Corrupt or unreadable file.** Refused, with a suggestion to re-download or re-export it.
- **Unsupported format.** Named explicitly, with the list of formats that do work.

Exact wording in [CONTENT-AND-COPY-GUIDE.md](../02-DESIGN/CONTENT-AND-COPY-GUIDE.md).

### Post-parse output

Each document produces a title, a page or section count, an ordered list of text chunks with page numbers, and a detected topic outline. The outline is what powers topic selection everywhere else in the app.

---

## F2. Quiz generation — MUST

### Question types

| Type | Format | Marking |
|---|---|---|
| Multiple choice | One correct answer, three plausible distractors | Exact |
| True/false | Statement plus a required justification in the explanation | Exact |
| Short answer | One or two sentence expected answer | AI-assisted, lenient, student can override |
| Fill in the blank | Sentence from the source with a key term removed | Fuzzy string match, case-insensitive |

### Controls

- Question count: 5, 10, 20, or a custom number up to 50
- Difficulty: Easy (recall), Medium (understanding), Hard (application)
- Topic scope: whole document, or a selection from the detected outline
- Question type mix: any combination of the four types

### Taking a quiz

- One question per screen. Large tap targets. Progress shown as "4 of 10".
- Answer, then immediate feedback: correct or not, the correct answer, a one-paragraph explanation, and the source page.
- Every question has a "show me where this came from" control that opens the source passage.
- Every question has a "this question is wrong" control that flags it and skips it without penalty. Flagged questions are excluded from scoring.
- Can be paused and resumed. Progress survives a page reload.
- Results screen: score, time taken, per-topic breakdown, and two actions — retry the ones you missed, or turn the missed ones into flashcards.

### Correctness requirements

- Every question must include the source page number. A generated question without a citation is discarded before the user sees it.
- Distractors must be plausible and must not be trivially eliminable. Prompt design in [PROMPT-LIBRARY.md](../03-ARCHITECTURE/PROMPT-LIBRARY.md).
- The correct answer's position is randomised after generation, because models favour certain positions.

---

## F3. Flashcards — MUST

### Generation

- Automatic front/back pairs from the document. Front is a question or term, back is the answer or definition.
- Cloze deletion cards: a sentence from the source with a term hidden.
- Cards are grouped into decks, one deck per document by default, or per selected topic.

### Reviewing

- Tap or click to flip. On mobile, swipe right for "I knew it" and left for "I didn't".
- Four-point self-rating after each card: Again, Hard, Good, Easy. This feeds the scheduler in F6.
- Keyboard support on desktop: space to flip, 1 to 4 to rate, arrows to navigate.
- Read-aloud button per card using the browser's speech synthesis.

### Editing

- Any card can be edited, deleted, or marked "leech" to stop it appearing.
- Cards can be added by hand.
- Bulk select and delete.

---

## F4. Explanations — MUST

### Three depths

| Depth | Aimed at | Style |
|---|---|---|
| Simple | "I have no idea what this means" | Everyday words, an analogy, no jargon |
| Normal | "I sort of get it" | Standard explanation with the correct terminology introduced |
| Deep | "I need to answer an exam question on this" | Full treatment, edge cases, common mistakes, worked example if applicable |

### Behaviour

- Trigger by selecting text anywhere in the app, or by tapping a topic in the outline, or from a quiz answer.
- Depth can be switched without regenerating from scratch.
- Every explanation cites the source pages it drew on.
- If the document does not actually cover the thing being asked about, the explanation says so rather than inventing an answer from general knowledge.
- Explanations can be saved, and saved explanations work offline.

---

## F5. Exam generator — MUST

### Configuration

- Question count and the mix across the four types
- Difficulty distribution, for example 30% easy, 50% medium, 20% hard
- Topic coverage, weighted or even
- Optional time limit
- Optional marks per question and a total

### Output

Two documents:

1. **The exam.** Title, instructions, numbered questions, answer space. No interface furniture.
2. **The answer key.** Correct answers, a brief rationale for each, and the source page.

### Delivery

- Take it in the app with a countdown timer, then get scored
- Print it, using a stylesheet built for paper: no navigation, no dark mode, sensible page breaks, answer key starting on a fresh page
- Export as PDF via the browser's print-to-PDF, which costs nothing and needs no library

---

## F6. Spaced repetition — SHOULD

Uses FSRS via the `ts-fsrs` package (MIT licensed). All scheduling maths runs on the device.

- Each card carries a stability, difficulty, and next-due date.
- Home screen shows how many cards are due today.
- Review session serves due cards, oldest first, capped at a comfortable default of 20 with an option to keep going.
- The four-point rating from F3 drives the next interval.
- Cards failed repeatedly are flagged as leeches and surfaced for rewriting.
- A daily streak counter, which forgives one missed day so a single slip does not destroy weeks of momentum.

Why FSRS rather than the older SM-2: better retention for the same review count, and a maintained MIT-licensed TypeScript implementation already exists.

---

## F7. Ask your document — SHOULD

- A chat interface scoped to one document or study set.
- Answers cite page numbers as inline references, and tapping a reference opens the source passage.
- Retrieval: for documents that fit the model's context window, the whole text is sent. For longer documents, client-side BM25 keyword search selects the most relevant chunks. No embedding API is used. See [ADR-0006](../08-DECISIONS/ADR-0006-BM25-RETRIEVAL-NOT-EMBEDDINGS.md).
- When the document does not contain the answer, it says so instead of guessing.
- Conversation history is kept per document and stored locally.
- Any answer can be turned into a flashcard in one tap.

---

## F8. Weak-spot dashboard — SHOULD

- Accuracy per topic, drawn from quiz and flashcard history.
- A ranked "review these next" list.
- A simple trend chart of accuracy over time.
- Study time totals and the current streak.
- A "drill my weak spots" button that generates a quiz weighted towards the worst topics.

All computed locally from stored results. Nothing is sent anywhere.

---

## F9. Export and import — SHOULD

| Export | Format | Use |
|---|---|---|
| Flashcards | CSV, Anki and Quizlet compatible | Move decks into an existing workflow |
| Exam | Print stylesheet, then print-to-PDF | Hand out on paper |
| Study pack | A single `.json` file | Move everything to another device, or share with a friend |
| Everything | `.json` archive | Backup, since local storage can be cleared |

Import accepts study packs and the full archive. Import validates the file and reports clearly on a mismatch rather than corrupting existing data.

---

## F10. Offline and installable — SHOULD

- Service worker caches the application shell and all stored content.
- Everything except AI generation works with no connection: reviewing cards, retaking saved quizzes, reading saved explanations, taking a saved exam.
- Install prompt appears after a genuine sign of engagement, such as completing a first quiz, never on first load.
- A clear indicator when offline, naming which features are unavailable.

---

## F11. Quality-of-life features — COULD

| Feature | Detail |
|---|---|
| Dark mode | Follows the system setting, with a manual override |
| Read aloud | Web Speech API, free, no dependency |
| Focus timer | 25/5 pomodoro, optional, off by default |
| Keyboard shortcuts | Full keyboard operation on desktop, with a `?` shortcut sheet |
| Reading mode | Wider letter and line spacing for dyslexic readers |
| Delete everything | One clear control that wipes all local data, with confirmation |
| ~~Bring your own key~~ | Built, then removed — everyone uses the shared key. See ADR-0014 |

---

## Cross-cutting requirements

These apply to every feature above.

**Grounding.** Nothing generated may go beyond the uploaded document. Every quiz question, exam question, flashcard, and explanation carries a source citation. Items without one are discarded before display.

**Quota honesty.** When the shared AI quota is exhausted, the app says so plainly and says when it resets. There is no alternative to offer (ADR-0014). It never fails silently and never asks for money.

**Interruptibility.** Any generation can be cancelled. Any partial result is kept.

**Resumability.** Quizzes, exams, and review sessions survive a page reload or an app close.

**Mobile parity.** Every feature is fully usable on a phone. No feature is desktop-only.

**Accessibility.** Every feature meets the requirements in [ACCESSIBILITY.md](../02-DESIGN/ACCESSIBILITY.md).
