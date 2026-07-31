/* Shared domain types. Mirrors docs/03-ARCHITECTURE/DATA-MODEL.md. */

export type DocumentFormat = 'pdf' | 'pptx' | 'docx' | 'epub' | 'text';
export type QuestionType = 'mcq' | 'trueFalse' | 'shortAnswer' | 'fillBlank';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type CardState = 'new' | 'learning' | 'review' | 'relearning';
export type Rating = 1 | 2 | 3 | 4;

export interface TextChunk {
  id: string;
  text: string;
  /* 1-indexed, as a human would cite it. Off-by-one here destroys trust in every citation. */
  pageStart: number;
  pageEnd: number;
  headingPath: string[];
  charCount: number;
}

export interface OutlineNode {
  id: string;
  title: string;
  level: number;
  pageStart: number;
  pageEnd: number;
  children: OutlineNode[];
}

export interface StoredDocument {
  id: string;
  title: string;
  fileName: string;
  format: DocumentFormat;
  byteSize: number;
  pageCount: number;
  createdAt: number;
  studySetId: string | null;
  chunks: TextChunk[];
  outline: OutlineNode[];
  estimatedTokens: number;
  parseWarnings: string[];
}

/* Non-optional on purpose: nothing generated may be shown without a source. */
export interface Citation {
  documentId: string;
  pageStart: number;
  pageEnd: number;
  chunkId: string;
  quote?: string;
}

export interface Deck {
  id: string;
  name: string;
  documentId: string | null;
  studySetId: string | null;
  createdAt: number;
}

export interface Card {
  id: string;
  deckId: string;
  type: 'basic' | 'cloze';
  front: string;
  back: string;
  clozeText?: string;
  citation: Citation;
  topic: string | null;

  due: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: CardState;
  lastReview: number | null;

  isLeech: boolean;
  isSuspended: boolean;
  editedByUser: boolean;
  createdAt: number;
}

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctIndex?: number;
  correctAnswer?: string;
  acceptableAnswers?: string[];
  explanation: string;
  citation: Citation;
  difficulty: Difficulty;
  topic: string | null;
  flaggedByUser: boolean;
}

export interface QuizConfig {
  count: number;
  difficulty: Difficulty;
  types: QuestionType[];
  topicIds: string[];
}

export interface Quiz {
  id: string;
  documentId: string | null;
  studySetId: string | null;
  title: string;
  createdAt: number;
  config: QuizConfig;
  questions: Question[];
}

export interface Response {
  questionId: string;
  answer: string;
  isCorrect: boolean | null;
  answeredAt: number;
  timeSpentMs: number;
}

export interface Attempt {
  id: string;
  kind: 'quiz' | 'exam';
  sourceId: string;
  startedAt: number;
  completedAt: number | null;
  responses: Response[];
  score: number | null;
  timeSpentMs: number;
}

export interface ExamConfig {
  count: number;
  typeMix: Partial<Record<QuestionType, number>>;
  difficultySpread: { easy: number; medium: number; hard: number };
  topicIds: string[];
  timeLimitMinutes: number | null;
  marksPerQuestion: number | null;
}

export interface Exam {
  id: string;
  title: string;
  documentId: string | null;
  studySetId: string | null;
  createdAt: number;
  config: ExamConfig;
  questions: Question[];
  instructions: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  createdAt: number;
}

export interface Conversation {
  id: string;
  documentId: string | null;
  studySetId: string | null;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface ReviewLogEntry {
  id: string;
  cardId: string;
  rating: Rating;
  reviewedAt: number;
  elapsedDays: number;
  scheduledDays: number;
  stateBefore: CardState;
  timeSpentMs: number;
}

export interface StudySet {
  id: string;
  name: string;
  documentIds: string[];
  createdAt: number;
}

export interface Settings {
  id: 'singleton';
  theme: 'system' | 'light' | 'dark';
  readingMode: boolean;
  reduceMotion: 'system' | 'always';
  dailyCardLimit: number;
  focusTimerEnabled: boolean;
  hasSeenInstallPrompt: boolean;
  hasSeenLocalDataWarning: boolean;
  lastExportAt: number | null;
  lastSyncedAt: number | null;
  streakCount: number;
  streakLastDay: string;
  streakGraceUsed: boolean;
}
