import type { StoredDocument } from '@/domain/types';
import { db } from './db';

export function listDocuments(): Promise<StoredDocument[]> {
  return db.documents.orderBy('createdAt').reverse().toArray();
}

export function getDocument(id: string): Promise<StoredDocument | undefined> {
  return db.documents.get(id);
}

export async function saveDocument(doc: StoredDocument): Promise<void> {
  await db.documents.put(doc);
}

/* Removing a document takes its generated material with it; leaving orphans behind is worse. */
export async function deleteDocument(id: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.documents, db.decks, db.cards, db.quizzes, db.exams, db.conversations],
    async () => {
      const decks = await db.decks.where('documentId').equals(id).toArray();
      const deckIds = decks.map((d) => d.id);

      await db.cards.where('deckId').anyOf(deckIds).delete();
      await db.decks.where('documentId').equals(id).delete();
      await db.quizzes.where('documentId').equals(id).delete();
      await db.exams.where('documentId').equals(id).delete();
      await db.conversations.where('documentId').equals(id).delete();
      await db.documents.delete(id);
    },
  );
}

export async function countDocuments(): Promise<number> {
  return db.documents.count();
}
