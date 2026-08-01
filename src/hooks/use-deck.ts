import { useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Card, StoredDocument } from '@/domain/types';
import { db } from '@/persistence/db';
import { saveCards, saveDeck } from '@/persistence/study';
import { generateCards } from '@/ai/client';
import { generationErrorMessage } from '@/lib/generation-error';
import { reportQuotaRemaining } from './use-quota-warning';

export function useDeckCards(documentId: string | undefined) {
  return useLiveQuery(
    async (): Promise<Card[]> =>
      documentId ? db.cards.where('deckId').equals(`deck-${documentId}`).toArray() : [],
    [documentId],
    undefined,
  );
}

export function useDueCards(limit: number) {
  return useLiveQuery(
    async () => {
      const due = await db.cards.where('due').belowOrEqual(Date.now()).toArray();
      return due.filter((card) => !card.isSuspended).slice(0, limit);
    },
    [limit],
    undefined,
  );
}

export function useGenerateDeck() {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (doc: StoredDocument, count = 12) => {
      setGenerating(true);
      setError(null);
      try {
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
        const cards = await generateCards(doc, deckId, count, {
          onQuotaRemaining: reportQuotaRemaining,
        });
        await saveCards(cards);
      } catch (err) {
        setError(generationErrorMessage(err));
      } finally {
        setGenerating(false);
      }
    },
    [],
  );

  return { generate, generating, error };
}
