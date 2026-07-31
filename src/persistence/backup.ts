import { db } from './db';
import { getSettings, replaceSettings } from './settings';
import { mergeSettings, pickSynced } from '@/domain/settings/synced';
import { BACKUP_VERSION, type BackupPayload } from '@/domain/export/backup';

/* Preferences travel with the data. Only the synced subset goes: lastSyncedAt and the
   seen-this-warning flags describe the browser that made the file, not the person. */
export async function exportBackup(): Promise<BackupPayload> {
  const [
    settings,
    documents,
    studySets,
    decks,
    cards,
    quizzes,
    attempts,
    exams,
    conversations,
    reviewLog,
  ] = await Promise.all([
    getSettings(),
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
    settings: pickSynced(settings),
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

  /* Outside the transaction: settings have their own conflict rule, and a file older than what
     this device already has must not undo a newer preference. */
  if (payload.settings) {
    const local = await getSettings();
    const merged = mergeSettings(local, payload.settings);
    if (merged !== local) await replaceSettings(merged);
  }
}
