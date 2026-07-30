import { useCallback } from 'react';
import type { ChatMessage, StoredDocument } from '@/domain/types';
import { db } from '@/persistence/db';
import { saveCard, saveDeck } from '@/persistence/study';

/* Turns a moment of understanding into something that will come back. */
export function useSaveAnswerAsCard() {
  return useCallback(async (doc: StoredDocument, question: string, answer: ChatMessage) => {
    const citation = answer.citations[0];
    if (!citation) return;

    const deckId = `deck-${doc.id}`;
    if (!(await db.decks.get(deckId))) {
      await saveDeck({
        id: deckId,
        name: doc.title,
        documentId: doc.id,
        studySetId: null,
        createdAt: Date.now(),
      });
    }

    const now = Date.now();
    await saveCard({
      id: `card-chat-${now}`,
      deckId,
      type: 'basic',
      front: question,
      /* Strip the inline page markers: they belong on the citation, not in the answer text. */
      back: answer.content.replace(/\s*\[p\.\s*\d+\]/g, ''),
      citation,
      topic: null,
      due: now,
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 'new',
      lastReview: null,
      isLeech: false,
      isSuspended: false,
      editedByUser: false,
      createdAt: now,
    });
  }, []);
}
