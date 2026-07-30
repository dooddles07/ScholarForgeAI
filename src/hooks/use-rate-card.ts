import { useCallback } from 'react';
import type { Card, Rating } from '@/domain/types';
import { applyRating } from '@/domain/scheduling/fsrs-adapter';
import { appendReviewLog, saveCard } from '@/persistence/study';
import { useRecordStudyDay } from './use-streak';

export function useRateCard() {
  const recordStudyDay = useRecordStudyDay();

  return useCallback(
    async (card: Card, rating: Rating, timeSpentMs: number) => {
      const updated = applyRating(card, rating);

      await saveCard(updated);
      /* Append-only. FSRS needs it, and so does the dashboard trend. */
      await appendReviewLog({
        id: `log-${card.id}-${Date.now()}`,
        cardId: card.id,
        rating,
        reviewedAt: Date.now(),
        elapsedDays: updated.elapsedDays,
        scheduledDays: updated.scheduledDays,
        stateBefore: card.state,
        timeSpentMs,
      });
      await recordStudyDay();

      return updated;
    },
    [recordStudyDay],
  );
}
