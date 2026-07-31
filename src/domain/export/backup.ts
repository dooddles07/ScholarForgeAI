import type {
  Attempt,
  Card,
  Conversation,
  Deck,
  Exam,
  Quiz,
  ReviewLogEntry,
  StoredDocument,
  StudySet,
} from '@/domain/types';

/* Bump this if a table's shape changes in a way an older backup file could not satisfy. */
export const BACKUP_VERSION = 1;

export interface BackupPayload {
  version: number;
  exportedAt: number;
  documents: StoredDocument[];
  studySets: StudySet[];
  decks: Deck[];
  cards: Card[];
  quizzes: Quiz[];
  attempts: Attempt[];
  exams: Exam[];
  conversations: Conversation[];
  reviewLog: ReviewLogEntry[];
}

const ARRAY_FIELDS = [
  'documents',
  'studySets',
  'decks',
  'cards',
  'quizzes',
  'attempts',
  'exams',
  'conversations',
  'reviewLog',
] as const;

export function isBackupPayload(value: unknown): value is BackupPayload {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.version !== 'number') return false;
  return ARRAY_FIELDS.every((field) => Array.isArray(record[field]));
}
