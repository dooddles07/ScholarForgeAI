import { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import type { Card, Rating } from '@/domain/types';
import { previewIntervals } from '@/domain/scheduling/fsrs-adapter';
import { intervalLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/components/primitives/Button';
import { Citation } from '@/ui/components/Citation';
import { flashcards } from '@/copy/labels';

const RATING_LABELS: Record<Rating, string> = {
  1: flashcards.again,
  2: flashcards.hard,
  3: flashcards.good,
  4: flashcards.easy,
};

export function Flashcard({ card, onRate }: { card: Card; onRate: (rating: Rating) => void }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => setFlipped(false), [card.id]);

  /* Space flips, 1 to 4 rate. Rating keys only work once the answer is visible. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setFlipped(true);
        return;
      }
      if (flipped && ['1', '2', '3', '4'].includes(e.key)) {
        onRate(Number(e.key) as Rating);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped, onRate]);

  const intervals = previewIntervals(card);

  function readAloud() {
    const utterance = new SpeechSynthesisUtterance(flipped ? card.back : card.front);
    speechSynthesis.speak(utterance);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setFlipped((v) => !v)}
        aria-label={flipped ? 'Show the question' : flashcards.flip}
        className={cn(
          'flex min-h-56 w-full cursor-pointer items-center justify-center rounded-lg border px-6 py-10 text-center',
          'border-line bg-surface transition-colors duration-[--duration]',
          'hover:border-accent/50 sm:min-h-64',
        )}
      >
        <p className="measure text-xl leading-snug text-fg sm:text-2xl">
          {flipped ? card.back : card.front}
        </p>
      </button>

      {flipped ? (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Citation
              pageStart={card.citation.pageStart}
              pageEnd={card.citation.pageEnd}
              quote={card.citation.quote}
            />
            <Button variant="ghost" size="icon" aria-label={flashcards.readAloud} onClick={readAloud}>
              <Volume2 aria-hidden />
            </Button>
          </div>

          {card.isLeech && (
            <p className="mt-4 rounded-md border border-line bg-surface px-4 py-3 text-sm text-fg-muted">
              {flashcards.leech(card.lapses)}
            </p>
          )}

          <p className="mt-6 text-base font-medium text-fg">{flashcards.ratingPrompt}</p>

          {/* 2x2 on a phone, one row from sm up. Each button states the interval it produces. */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {intervals.map(({ rating, intervalDays }) => (
              <button
                key={rating}
                type="button"
                onClick={() => onRate(rating)}
                className="flex min-h-14 flex-col items-center justify-center rounded-md border border-line bg-surface px-2 py-2 transition-colors duration-[--duration-fast] hover:border-accent/60"
              >
                <span className="text-base font-medium text-fg">{RATING_LABELS[rating]}</span>
                <span className="font-mono text-xs tabular text-fg-muted">
                  {intervalLabel(intervalDays)}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Rating buttons appear only after the flip, so the answer cannot be glimpsed early. */
        <Button size="block" className="mt-5" onClick={() => setFlipped(true)}>
          {flashcards.flip}
        </Button>
      )}
    </div>
  );
}
