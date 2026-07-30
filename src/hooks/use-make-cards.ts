import { useCallback } from 'react';
import type { Card, Question, StoredDocument } from '@/domain/types';
import { saveCards, saveDeck } from '@/persistence/study';
import { db } from '@/persistence/db';

function cardFromQuestion(question: Question, deckId: string): Card {
  const now = Date.now();
  const answer =
    question.type === 'mcq' && question.options && question.correctIndex !== undefined
      ? (question.options[question.correctIndex] ?? '')
      : (question.correctAnswer ?? '');

  return {
    id: `card-${question.id}-${now}`,
    deckId,
    type: 'basic',
    front: question.prompt,
    back: answer,
    citation: question.citation,
    topic: question.topic,
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
  };
}

/* Turning a miss into a card is what makes a wrong answer useful rather than just a wrong answer. */
export function useMakeCardsFromMissed() {
  return useCallback(async (doc: StoredDocument, missed: Question[]) => {
    if (missed.length === 0) return;

    const deckId = `deck-${doc.id}`;
    const existing = await db.decks.get(deckId);
    if (!existing) {
      await saveDeck({
        id: deckId,
        name: doc.title,
        documentId: doc.id,
        studySetId: null,
        createdAt: Date.now(),
      });
    }

    await saveCards(missed.map((question) => cardFromQuestion(question, deckId)));
  }, []);
}
