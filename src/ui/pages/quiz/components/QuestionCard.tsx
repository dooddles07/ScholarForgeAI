import { useState } from 'react';
import type { Question } from '@/domain/types';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/components/primitives/Button';
import { quiz } from '@/copy/labels';

interface QuestionCardProps {
  question: Question;
  onAnswer: (value: string) => void;
}

/* One question per screen, no exceptions. Options are 56px tall: a mis-tap costs the question.
   Keyed by question.id at the call site so a new question remounts with fresh state. */
export function QuestionCard({ question, onAnswer }: QuestionCardProps) {
  const [selected, setSelected] = useState<string>('');

  const options =
    question.type === 'mcq'
      ? (question.options ?? []).map((label, i) => ({ label, value: String(i) }))
      : question.type === 'trueFalse'
        ? [
            { label: 'True', value: 'True' },
            { label: 'False', value: 'False' },
          ]
        : null;

  const canSubmit = selected.trim().length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onAnswer(selected);
      }}
    >
      <h2 className="measure text-xl leading-snug font-medium text-fg sm:text-2xl">
        {question.prompt}
      </h2>

      {options ? (
        <ul className="mt-6 space-y-2.5">
          {options.map((option) => (
            <li key={option.value}>
              <label
                className={cn(
                  'flex min-h-14 cursor-pointer items-center gap-3 rounded-md border px-4 py-3',
                  'text-base transition-colors duration-[--duration-fast]',
                  selected === option.value
                    ? 'border-accent bg-accent-soft text-fg'
                    : 'border-line bg-surface text-fg hover:border-accent/60',
                )}
              >
                <input
                  type="radio"
                  name="answer"
                  value={option.value}
                  checked={selected === option.value}
                  onChange={(e) => setSelected(e.target.value)}
                  className="size-4 shrink-0 accent-[var(--accent)]"
                />
                {option.label}
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6">
          <label htmlFor="typed-answer" className="text-base font-medium text-fg">
            Your answer
          </label>
          <input
            id="typed-answer"
            type="text"
            autoComplete="off"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            placeholder={quiz.answerPlaceholder}
            className="mt-2 min-h-14 w-full rounded-md border border-line bg-surface px-4 text-base text-fg placeholder:text-fg-subtle"
          />
        </div>
      )}

      {/* Bottom-anchored below lg, where a thumb can reach it. */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-line bg-bg px-4 py-3 pb-safe lg:static lg:mt-8 lg:border-0 lg:bg-transparent lg:p-0">
        {/* The reason sits above the control so it never collides with the tab bar. */}
        <div className="mx-auto max-w-2xl lg:mx-0">
          {!canSubmit && (
            <p className="mb-2 text-center text-sm text-fg-muted lg:text-left">
              Pick an answer first
            </p>
          )}
          <Button type="submit" size="block" className="lg:w-auto lg:min-w-56" disabled={!canSubmit}>
            {quiz.check}
          </Button>
        </div>
      </div>
    </form>
  );
}
