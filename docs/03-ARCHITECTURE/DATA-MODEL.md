# Data Model

Purpose: the local database schema and the TypeScript types that describe it.
Last updated: 2026-07-30

Everything lives in IndexedDB via Dexie. There is no server-side database. See [ADR-0001](../08-DECISIONS/ADR-0001-LOCAL-FIRST-STORAGE.md).

## Tables

| Table | Holds | Grows with |
|---|---|---|
| `documents` | Parsed documents and their text | Uploads. The largest table by far. |
| `studySets` | Named groups of documents | User organisation |
| `decks` | Flashcard decks | Generation |
| `cards` | Individual cards and their schedule | Generation and review |
| `quizzes` | Generated quizzes and their questions | Generation |
| `attempts` | Quiz and exam attempt results | Every attempt |
| `exams` | Generated exams and answer keys | Generation |
| `conversations` | Ask-your-document chat history | Chat use |
| `reviewLog` | One row per card review | Every review. Second-largest table. |
| `settings` | Single-row app preferences | Never |

## Types

### Documents

```ts
interface StoredDocument {
  id: string;                    // uuid
  title: string;                 // from metadata, or the filename
  fileName: string;
  format: 'pdf' | 'pptx' | 'docx' | 'epub' | 'text';
  byteSize: number;
  pageCount: number;
  createdAt: number;             // epoch ms
  studySetId: string | null;

  chunks: TextChunk[];           // the extracted content
  outline: OutlineNode[];        // detected structure
  estimatedTokens: number;       // drives the retrieval tier decision

  // Parse diagnostics, kept for support and debugging
  parseWarnings: string[];
}

interface TextChunk {
  id: string;
  text: string;
  pageStart: number;             // 1-indexed, as a human would cite it
  pageEnd: number;
  headingPath: string[];         // e.g. ['Chapter 3', 'Glycolysis']
  charCount: number;
}

interface OutlineNode {
  id: string;
  title: string;
  level: number;                 // 1 = top
  pageStart: number;
  pageEnd: number;
  children: OutlineNode[];
}
```

`chunks` carries the whole document text and is the reason `documents` dominates storage. `pageStart` is 1-indexed deliberately: every citation shown to a user is a page number, and off-by-one errors in citations destroy trust in the whole product.

`headingPath` is what lets BM25 boost structurally relevant chunks without embeddings. See [ADR-0006](../08-DECISIONS/ADR-0006-BM25-RETRIEVAL-NOT-EMBEDDINGS.md).

### Study sets

```ts
interface StudySet {
  id: string;
  name: string;
  documentIds: string[];         // max 10
  createdAt: number;
}
```

### Flashcards

```ts
interface Deck {
  id: string;
  name: string;
  documentId: string | null;
  studySetId: string | null;
  createdAt: number;
}

interface Card {
  id: string;
  deckId: string;
  type: 'basic' | 'cloze';

  front: string;
  back: string;
  clozeText?: string;            // cloze only, with {{...}} marking the gap

  citation: Citation;            // required, never optional
  topic: string | null;

  // FSRS state, owned by ts-fsrs
  due: number;                   // epoch ms
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: 'new' | 'learning' | 'review' | 'relearning';
  lastReview: number | null;

  isLeech: boolean;              // repeatedly failed, flagged for rewriting
  isSuspended: boolean;          // user chose to stop seeing it
  editedByUser: boolean;         // protects manual edits from regeneration

  createdAt: number;
}

interface Citation {
  documentId: string;
  pageStart: number;
  pageEnd: number;
  chunkId: string;               // lets us show the exact source passage
  quote?: string;                // the supporting sentence, when available
}
```

`citation` is non-optional on purpose. The grounding rule in [FEATURES-SPECIFICATION.md](../01-PRODUCT/FEATURES-SPECIFICATION.md) says nothing generated may be shown without a source, and the type system should make violating that awkward rather than possible.

`editedByUser` exists so regeneration never silently discards a card someone fixed by hand.

The FSRS fields mirror what `ts-fsrs` expects, so they are stored in its shape rather than translated back and forth.

### Quizzes

```ts
interface Quiz {
  id: string;
  documentId: string | null;
  studySetId: string | null;
  title: string;
  createdAt: number;
  config: QuizConfig;
  questions: Question[];
}

interface QuizConfig {
  count: number;
  difficulty: 'easy' | 'medium' | 'hard';
  types: QuestionType[];
  topicIds: string[];            // empty = whole document
}

type QuestionType = 'mcq' | 'trueFalse' | 'shortAnswer' | 'fillBlank';

interface Question {
  id: string;
  type: QuestionType;
  prompt: string;

  options?: string[];            // mcq only, already shuffled
  correctIndex?: number;         // mcq only
  correctAnswer?: string;        // trueFalse, shortAnswer, fillBlank
  acceptableAnswers?: string[];  // fillBlank and shortAnswer alternates

  explanation: string;
  citation: Citation;            // required
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string | null;

  flaggedByUser: boolean;        // excluded from scoring when true
}
```

MCQ options are stored already shuffled. Shuffling happens once, client-side, immediately after generation, because models favour particular answer positions and re-shuffling on every render would break resumed sessions.

### Attempts

```ts
interface Attempt {
  id: string;
  kind: 'quiz' | 'exam';
  sourceId: string;              // quiz or exam id
  startedAt: number;
  completedAt: number | null;    // null = in progress, enables resume
  responses: Response[];
  score: number | null;          // percentage, excluding flagged questions
  timeSpentMs: number;
}

interface Response {
  questionId: string;
  answer: string;
  isCorrect: boolean | null;     // null for an unmarked short answer
  answeredAt: number;
  timeSpentMs: number;
}
```

`completedAt: null` is how resume works: on load, an incomplete attempt is offered for continuation.

### Exams

```ts
interface Exam {
  id: string;
  title: string;
  documentId: string | null;
  studySetId: string | null;
  createdAt: number;
  config: ExamConfig;
  questions: Question[];
  instructions: string;
}

interface ExamConfig {
  count: number;
  typeMix: Partial<Record<QuestionType, number>>;   // proportions
  difficultySpread: { easy: number; medium: number; hard: number };
  topicIds: string[];
  timeLimitMinutes: number | null;
  marksPerQuestion: number | null;
}
```

Exams and quizzes share the `Question` type. They differ in presentation and configuration, not in content shape, and unifying them keeps scoring and export logic single-purpose.

### Conversations

```ts
interface Conversation {
  id: string;
  documentId: string | null;
  studySetId: string | null;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];         // empty for user messages
  createdAt: number;
}
```

### Review log

```ts
interface ReviewLogEntry {
  id: string;
  cardId: string;
  rating: 1 | 2 | 3 | 4;         // Again, Hard, Good, Easy
  reviewedAt: number;
  elapsedDays: number;
  scheduledDays: number;
  stateBefore: Card['state'];
  timeSpentMs: number;
}
```

Append-only. Needed both for FSRS to work correctly and for the dashboard's trend chart. It grows steadily, so it is the first candidate for pruning under storage pressure — old entries can go without breaking scheduling, since current state lives on the card.

### Settings

```ts
interface Settings {
  id: 'singleton';

  theme: 'system' | 'light' | 'dark';
  readingMode: boolean;          // wider spacing for dyslexic readers
  reduceMotion: 'system' | 'always';

  dailyCardLimit: number;        // default 20
  focusTimerEnabled: boolean;

  userApiKey: string | null;     // BYOK. This browser only. Never transmitted to us.

  hasSeenInstallPrompt: boolean;
  hasSeenLocalDataWarning: boolean;
  lastExportAt: number | null;   // drives the export reminder

  streakCount: number;
  streakLastDay: string;         // YYYY-MM-DD, local
  streakGraceUsed: boolean;      // the one forgiven missed day
}
```

`userApiKey` deserves care. It is stored here for convenience, it is sent only to the AI provider by way of our proxy on that user's own requests, it is never logged, and it is never persisted server-side. The settings screen must state this plainly. See [SECURITY-AND-PRIVACY.md](../04-OPERATIONS/SECURITY-AND-PRIVACY.md).

## Dexie schema

```ts
db.version(1).stores({
  documents:     'id, studySetId, createdAt',
  studySets:     'id, createdAt',
  decks:         'id, documentId, studySetId, createdAt',
  cards:         'id, deckId, due, state, isLeech, isSuspended',
  quizzes:       'id, documentId, studySetId, createdAt',
  attempts:      'id, sourceId, kind, completedAt, startedAt',
  exams:         'id, documentId, studySetId, createdAt',
  conversations: 'id, documentId, updatedAt',
  reviewLog:     'id, cardId, reviewedAt',
  settings:      'id',
});
```

Indexes chosen for the queries we actually run:

- `cards.due` — the due-today query, run on every app open
- `cards.state` — new versus review counts
- `attempts.completedAt` — finding an in-progress attempt to resume
- `reviewLog.reviewedAt` — the dashboard trend chart
- `documents.createdAt` — library listing, newest first

## Migrations

Every schema change adds a new `db.version(n)` block with an upgrade function. Versions are never edited after release, because users have data written under the old shape.

```ts
db.version(2).stores({ /* ... */ }).upgrade(async tx => {
  // migrate existing rows forward
});
```

Since there is no server, a botched migration destroys a user's data with no recovery path. Rules that follow:

1. Never remove a field in the same version that stops writing it
2. Every migration gets a test with realistic pre-migration data
3. Prompt an export before running a migration that changes existing rows
4. Migrations must be idempotent, because they can be interrupted by a closed tab

## Storage pressure

Documents dominate, followed by the review log.

| Threshold | Behaviour |
|---|---|
| Under 80% of quota | Nothing |
| 80% or above | Warning, with an offer to review and delete old documents |
| 95% or above | Block new uploads, prompt deletion, prompt export |
| Write fails | Clear message, no partial write, prompt export |

Checked via `navigator.storage.estimate()`. Where unavailable, fall back to catching quota errors on write.

Pruning order when the user asks us to free space: old review-log entries first, then documents they select. Never cards or schedules, since those represent accumulated study effort.

## Private browsing

Storage is ephemeral in private windows. Detected on first run, and the user is told plainly that nothing will be saved when they close the window. We do not block usage; some people genuinely want a throwaway session.
