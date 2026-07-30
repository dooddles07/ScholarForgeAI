import { useState } from 'react';
import type { Difficulty, QuizConfig } from '@/domain/types';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/components/primitives/Button';
import { quiz } from '@/copy/labels';

const COUNTS = [5, 10, 20] as const;

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: quiz.easy },
  { value: 'medium', label: quiz.medium },
  { value: 'hard', label: quiz.hard },
];

/* Every field is pre-filled. Start works without touching anything. */
export function QuizConfigForm({
  onStart,
  error,
}: {
  onStart: (config: QuizConfig) => void;
  error: string | null;
}) {
  const [count, setCount] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  return (
    <form
      className="mx-auto max-w-xl"
      onSubmit={(e) => {
        e.preventDefault();
        onStart({ count, difficulty, types: ['mcq', 'trueFalse', 'fillBlank'], topicIds: [] });
      }}
    >
      <fieldset>
        <legend className="text-base font-medium text-fg">{quiz.count}</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {COUNTS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCount(option)}
              aria-pressed={count === option}
              className={cn(
                'min-h-11 min-w-16 rounded-md border px-4 font-mono tabular transition-colors duration-[--duration-fast]',
                count === option
                  ? 'border-accent bg-accent text-accent-fg'
                  : 'border-line bg-surface text-fg hover:border-accent/60',
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-base font-medium text-fg">{quiz.difficulty}</legend>
        <div className="mt-3 space-y-2">
          {DIFFICULTIES.map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex min-h-14 cursor-pointer items-center gap-3 rounded-md border px-4 transition-colors duration-[--duration-fast]',
                difficulty === option.value
                  ? 'border-accent bg-accent-soft'
                  : 'border-line bg-surface hover:border-accent/60',
              )}
            >
              <input
                type="radio"
                name="difficulty"
                value={option.value}
                checked={difficulty === option.value}
                onChange={() => setDifficulty(option.value)}
                className="size-4 accent-[var(--accent)]"
              />
              <span className="text-base text-fg">{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="mt-6 text-base text-incorrect">
          {error}
        </p>
      )}

      <Button type="submit" size="block" className="mt-8">
        {quiz.start}
      </Button>
    </form>
  );
}
