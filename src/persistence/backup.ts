import { db } from './db';
import { BACKUP_VERSION, type BackupPayload } from '@/domain/export/backup';

/* Settings (including the user's own API key) are deliberately left out: a backup file is meant
   to be moved between devices or shared, and a key should never travel inside one. */
export async function exportBackup(): Promise<BackupPayload> {
  const [documents, studySets, decks, cards, quizzes, attempts, exams, conversations, reviewLog] =
    await Promise.all([
      db.documents.toArray(),
      db.studySets.toArray(),
      db.decks.toArray(),
      db.cards.toArray(),
      db.quizzes.toArray(),
      db.attempts.toArray(),
      db.exams.toArray(),
      db.conversations.toArray(),
      db.reviewLog.toArray(),
    ]);

  return {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    documents,
    studySets,
    decks,
    cards,
    quizzes,
    attempts,
    exams,
    conversations,
    reviewLog,
  };
}

/* A merge, not a replace: bulkPut upserts by id. Restoring a backup never destroys whatever is
   already in this browser, so it is safe to run without a confirmation dialog. */
export async function importBackup(payload: BackupPayload): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.documents,
      db.studySets,
      db.decks,
      db.cards,
      db.quizzes,
      db.attempts,
      db.exams,
      db.conversations,
      db.reviewLog,
    ],
    async () => {
      await db.documents.bulkPut(payload.documents);
      await db.studySets.bulkPut(payload.studySets);
      await db.decks.bulkPut(payload.decks);
      await db.cards.bulkPut(payload.cards);
      await db.quizzes.bulkPut(payload.quizzes);
      await db.attempts.bulkPut(payload.attempts);
      await db.exams.bulkPut(payload.exams);
      await db.conversations.bulkPut(payload.conversations);
      await db.reviewLog.bulkPut(payload.reviewLog);
    },
  );
}
