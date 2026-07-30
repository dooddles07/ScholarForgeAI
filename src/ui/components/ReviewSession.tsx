import { useState } from 'react';
import type { Card, Rating } from '@/domain/types';
import { useRateCard } from '@/hooks/use-rate-card';
import { Flashcard } from '@/ui/components/Flashcard';
import { flashcards } from '@/copy/labels';

interface ReviewSessionProps {
  cards: Card[];
  onDone?: () => void;
  doneAction?: React.ReactNode;
}

export function ReviewSession({ cards, onDone, doneAction }: ReviewSessionProps) {
  const [index, setIndex] = useState(0);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const rateCard = useRateCard();

  const card = cards[index];

  async function rate(rating: Rating) {
    if (!card) return;
    await rateCard(card, rating, Date.now() - startedAt);

    setStartedAt(Date.now());
    setIndex((i) => i + 1);
    if (index + 1 >= cards.length) onDone?.();
  }

  if (!card) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-xl font-medium text-fg">{flashcards.sessionDone(cards.length)}</p>
        {doneAction && <div className="mt-6">{doneAction}</div>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="font-mono text-sm tabular text-fg-muted">
        {flashcards.progress(index + 1, cards.length)}
      </p>
      <div className="mt-4">
        <Flashcard card={card} onRate={(rating) => void rate(rating)} />
      </div>
    </div>
  );
}
