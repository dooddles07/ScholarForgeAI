import Dexie, { type EntityTable } from 'dexie';
import type {
  Attempt,
  Card,
  Conversation,
  Deck,
  Exam,
  Quiz,
  ReviewLogEntry,
  Settings,
  StoredDocument,
  StudySet,
} from '@/domain/types';

/*
 * Version 1 from docs/03-ARCHITECTURE/DATA-MODEL.md. Versions are never edited after release:
 * users have data written under the old shape and there is no server copy to fall back on.
 */
export const db = new Dexie('scholarforge') as Dexie & {
  documents: EntityTable<StoredDocument, 'id'>;
  studySets: EntityTable<StudySet, 'id'>;
  decks: EntityTable<Deck, 'id'>;
  cards: EntityTable<Card, 'id'>;
  quizzes: EntityTable<Quiz, 'id'>;
  attempts: EntityTable<Attempt, 'id'>;
  exams: EntityTable<Exam, 'id'>;
  conversations: EntityTable<Conversation, 'id'>;
  reviewLog: EntityTable<ReviewLogEntry, 'id'>;
  settings: EntityTable<Settings, 'id'>;
};

db.version(1).stores({
  documents: 'id, studySetId, createdAt',
  studySets: 'id, createdAt',
  decks: 'id, documentId, studySetId, createdAt',
  cards: 'id, deckId, due, state, isLeech, isSuspended',
  quizzes: 'id, documentId, studySetId, createdAt',
  attempts: 'id, sourceId, kind, completedAt, startedAt',
  exams: 'id, documentId, studySetId, createdAt',
  conversations: 'id, documentId, updatedAt',
  reviewLog: 'id, cardId, reviewedAt',
  settings: 'id',
});

export const DEFAULT_SETTINGS: Settings = {
  id: 'singleton',
  theme: 'dark',
  readingMode: false,
  reduceMotion: 'system',
  dailyCardLimit: 20,
  focusTimerEnabled: false,
  hasSeenInstallPrompt: false,
  hasSeenLocalDataWarning: false,
  lastExportAt: null,
  lastSyncedAt: null,
  streakCount: 0,
  streakLastDay: '',
  streakGraceUsed: false,
};
