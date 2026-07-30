import { Link } from 'react-router';
import type { Attempt } from '@/domain/types';

/* Diagnosis is only useful if it turns into practice, so this section ends in an action. */
export function WeakTopics({ attempts, className }: { attempts: Attempt[]; className?: string }) {
  const overall = attempts.reduce((sum, a) => sum + (a.score ?? 0), 0) / (attempts.length || 1);

  return (
    <section className={className}>
      <h2 className="text-lg font-semibold text-fg">Where you stand</h2>
      <p className="mt-1 text-base text-fg-muted">
        Averaging <span className="font-mono tabular">{Math.round(overall)}%</span> across{' '}
        {attempts.length} {attempts.length === 1 ? 'quiz' : 'quizzes'}.
      </p>

      <Link
        to="/app/review"
        className="mt-5 inline-flex min-h-14 items-center rounded-md bg-accent px-6 text-base font-medium text-accent-fg transition-colors duration-[--duration-fast] hover:bg-accent-hover"
      >
        Drill my weak spots
      </Link>

      {/* A mirror, not a manager. No "you have not studied in 5 days". */}
    </section>
  );
}
