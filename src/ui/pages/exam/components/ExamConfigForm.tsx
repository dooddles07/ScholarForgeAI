import { useState } from 'react';
import type { ExamConfig } from '@/domain/types';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/components/primitives/Button';
import { exam } from '@/copy/labels';

const COUNTS = [10, 20, 30, 50] as const;
const TIME_LIMITS = [null, 30, 60, 90] as const;
const MARKS = [null, 1, 2, 5] as const;

function optionLabel(value: number | null, unit: string): string {
  return value === null ? 'None' : `${value} ${unit}`;
}

/* Every field is pre-filled. Start works without touching anything. */
export function ExamConfigForm({ onStart }: { onStart: (config: ExamConfig) => void }) {
  const [count, setCount] = useState<number>(20);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(null);
  const [marksPerQuestion, setMarksPerQuestion] = useState<number | null>(null);

  return (
    <form
      className="mx-auto max-w-xl"
      onSubmit={(e) => {
        e.preventDefault();
        onStart({
          count,
          typeMix: {},
          difficultySpread: { easy: 0, medium: 0, hard: 0 },
          topicIds: [],
          timeLimitMinutes,
          marksPerQuestion,
        });
      }}
    >
      <fieldset>
        <legend className="text-base font-medium text-fg">{exam.count}</legend>
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
        <legend className="text-base font-medium text-fg">{exam.timeLimit}</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {TIME_LIMITS.map((option) => (
            <button
              key={String(option)}
              type="button"
              onClick={() => setTimeLimitMinutes(option)}
              aria-pressed={timeLimitMinutes === option}
              className={cn(
                'min-h-11 rounded-md border px-4 font-mono tabular transition-colors duration-[--duration-fast]',
                timeLimitMinutes === option
                  ? 'border-accent bg-accent text-accent-fg'
                  : 'border-line bg-surface text-fg hover:border-accent/60',
              )}
            >
              {optionLabel(option, 'min')}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-base font-medium text-fg">{exam.marks}</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {MARKS.map((option) => (
            <button
              key={String(option)}
              type="button"
              onClick={() => setMarksPerQuestion(option)}
              aria-pressed={marksPerQuestion === option}
              className={cn(
                'min-h-11 rounded-md border px-4 font-mono tabular transition-colors duration-[--duration-fast]',
                marksPerQuestion === option
                  ? 'border-accent bg-accent text-accent-fg'
                  : 'border-line bg-surface text-fg hover:border-accent/60',
              )}
            >
              {optionLabel(option, 'each')}
            </button>
          ))}
        </div>
      </fieldset>

      <Button type="submit" size="block" className="mt-8">
        {exam.generate}
      </Button>
    </form>
  );
}
