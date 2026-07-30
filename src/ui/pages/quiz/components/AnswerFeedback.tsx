import { Check, Flag, HelpCircle, X } from 'lucide-react';
import type { Question, Response } from '@/domain/types';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/components/primitives/Button';
import { Citation } from '@/ui/components/Citation';
import { quiz } from '@/copy/labels';

interface AnswerFeedbackProps {
  question: Question;
  response: Response;
  isLast: boolean;
  onNext: () => void;
  onFlag: () => void;
}

function correctAnswerText(question: Question): string {
  if (question.type === 'mcq' && question.options && question.correctIndex !== undefined) {
    return question.options[question.correctIndex] ?? '';
  }
  return question.correctAnswer ?? '';
}

export function AnswerFeedback({
  question,
  response,
  isLast,
  onNext,
  onFlag,
}: AnswerFeedbackProps) {
  const { isCorrect } = response;

  return (
    <div>
      {/* Colour never carries the meaning alone: an icon and a word do. */}
      <p
        role="status"
        className={cn(
          'motion-enter flex items-center gap-2 text-xl font-semibold',
          isCorrect === true && 'text-correct',
          isCorrect === false && 'text-incorrect',
          isCorrect === null && 'text-fg-muted',
        )}
      >
        {isCorrect === true && <Check aria-hidden className="size-6" />}
        {isCorrect === false && <X aria-hidden className="size-6" />}
        {isCorrect === null && <HelpCircle aria-hidden className="size-6" />}
        {isCorrect === true ? quiz.correct : isCorrect === false ? quiz.incorrect : 'Have a look'}
      </p>

      {isCorrect !== true && (
        <p className="mt-3 text-lg text-fg">{quiz.correctAnswer(correctAnswerText(question))}</p>
      )}

      <p className="measure mt-4 text-base leading-relaxed text-fg-muted">
        {question.explanation}
      </p>

      <Citation
        className="mt-5"
        pageStart={question.citation.pageStart}
        pageEnd={question.citation.pageEnd}
        quote={question.citation.quote}
      />

      {question.flaggedByUser ? (
        <p className="mt-6 text-sm text-fg-muted">{quiz.flagged}</p>
      ) : (
        <Button variant="ghost" size="md" className="mt-6 -ml-4 text-fg-muted" onClick={onFlag}>
          <Flag aria-hidden />
          {quiz.flag}
        </Button>
      )}

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-line bg-bg px-4 py-3 pb-safe lg:static lg:mt-8 lg:border-0 lg:bg-transparent lg:p-0">
        {/* Full width where a thumb needs it; sized to its label once there is a pointer. */}
        <div className="mx-auto max-w-2xl lg:mx-0">
          <Button size="block" className="lg:w-auto lg:min-w-56" onClick={onNext}>
            {isLast ? quiz.finish : quiz.next}
          </Button>
        </div>
      </div>
    </div>
  );
}
