import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { QuizScore } from '@/domain/quiz/scoring';
import { duration } from '@/lib/format';
import { Button } from '@/ui/components/primitives/Button';
import { results } from '@/copy/labels';

interface QuizResultsProps {
  score: QuizScore;
  elapsedMs: number;
  documentId: string;
  onRetryMissed: () => void;
  onMakeCards: () => void;
  cardsMade: boolean;
}

/* No grade letter, no badge, no celebration. The number and two ways to act on it. */
export function QuizResults({
  score,
  elapsedMs,
  documentId,
  onRetryMissed,
  onMakeCards,
  cardsMade,
}: QuizResultsProps) {
  const missedCount = score.missedQuestionIds.length;

  /* Bars start at 0 and fill on mount; two rAFs let the 0% state paint first. */
  const [barsFilled, setBarsFilled] = useState(false);
  useEffect(() => {
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => setBarsFilled(true));
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
  }, []);

  return (
    <div className="mx-auto max-w-xl">
      <h2 className="text-3xl font-semibold tabular text-fg">
        {results.score(score.correct, score.scored)}
      </h2>
      <p className="mt-1 font-mono text-base tabular text-fg-muted">{duration(elapsedMs)}</p>

      {score.unmarked > 0 && (
        <p className="mt-3 text-sm text-fg-muted">
          {score.unmarked} written {score.unmarked === 1 ? 'answer is' : 'answers are'} not counted,
          because we cannot mark those reliably.
        </p>
      )}

      {score.byTopic.length > 0 && (
        <section className="mt-8">
          <h3 className="text-base font-medium text-fg">{results.breakdown}</h3>
          <ul className="mt-4 space-y-3">
            {score.byTopic.map((topic) => (
              <li key={topic.topic}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-base text-fg">{topic.topic}</span>
                  <span className="font-mono text-sm tabular text-fg-muted">
                    {topic.correct} of {topic.total}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-[--duration-slow] ease-[--ease]"
                    style={{ width: barsFilled ? `${topic.percent}%` : '0%' }}
                  />
                </div>
              </li>
            ))}
          </ul>

          {score.byTopic[0] && score.byTopic[0].percent < 100 && (
            <p className="mt-5 text-base text-fg">
              {results.weak}: <span className="font-medium">{score.byTopic[0].topic}</span>
            </p>
          )}
        </section>
      )}

      {/* These two actions are what make the product a loop rather than a one-off. */}
      <div className="mt-10 space-y-3">
        {missedCount > 0 && (
          <Button size="block" onClick={onRetryMissed}>
            {results.retryMissed(missedCount)}
          </Button>
        )}
        {missedCount > 0 && (
          <Button variant="secondary" size="block" onClick={onMakeCards} disabled={cardsMade}>
            {cardsMade ? 'Added to your cards' : results.makeCards}
          </Button>
        )}
        <Link
          to={`/app/doc/${documentId}`}
          className="flex min-h-11 items-center justify-center text-base text-fg-muted underline"
        >
          {results.backToDocument}
        </Link>
      </div>
    </div>
  );
}
