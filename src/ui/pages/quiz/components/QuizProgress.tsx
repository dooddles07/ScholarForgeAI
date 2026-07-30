import { Link } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { quiz } from '@/copy/labels';

/* Progress as text as well as a bar. "Question 4 of 10" tells you more than a filled rectangle. */
export function QuizProgress({
  index,
  total,
  backTo,
}: {
  index: number;
  total: number;
  backTo: string;
}) {
  const percent = Math.round(((index + 1) / total) * 100);

  return (
    <div>
      <div className="flex items-center gap-2">
        <Link
          to={backTo}
          aria-label="Leave the quiz"
          className="-ml-2 flex size-11 items-center justify-center rounded-md text-fg-muted hover:bg-surface hover:text-fg"
        >
          <ChevronLeft aria-hidden className="size-6" />
        </Link>
        <p className="font-mono text-sm tabular text-fg-muted">{quiz.progress(index + 1, total)}</p>
      </div>

      <div
        role="progressbar"
        aria-valuenow={index + 1}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={quiz.progress(index + 1, total)}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-[--duration] ease-[--ease]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
