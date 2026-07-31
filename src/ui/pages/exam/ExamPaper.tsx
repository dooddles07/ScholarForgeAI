import type { Question } from '@/domain/types';
import { exam } from '@/copy/labels';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

function answerOf(question: Question): string {
  if (question.type === 'mcq' && question.options && question.correctIndex !== undefined) {
    return `${LETTERS[question.correctIndex]} (${question.options[question.correctIndex]})`;
  }
  return question.correctAnswer ?? '';
}

export function ExamPaper({
  title,
  questions,
  answerKey = false,
  timeLimitMinutes = null,
  marksPerQuestion = null,
}: {
  title: string;
  questions: Question[];
  answerKey?: boolean;
  timeLimitMinutes?: number | null;
  marksPerQuestion?: number | null;
}) {
  const meta = [
    `${questions.length} questions`,
    timeLimitMinutes ? `${timeLimitMinutes} minutes` : null,
    marksPerQuestion ? `${marksPerQuestion} ${marksPerQuestion === 1 ? 'mark' : 'marks'} each` : null,
    'name and date at the top',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section>
      <header className="border-b border-line pb-3">
        <h2 className="text-lg font-semibold text-fg">
          {answerKey ? exam.answerKey : title}
        </h2>
        {!answerKey && (
          <p className="mt-1 font-mono text-xs tabular text-fg-muted">{meta}</p>
        )}
      </header>

      <ol className="mt-5 space-y-5">
        {questions.map((question, i) => (
          <li key={question.id} className="print-question">
            <p className="text-base text-fg">
              <span className="font-mono tabular text-fg-muted">{i + 1}.</span> {question.prompt}
            </p>

            {answerKey ? (
              <div className="mt-1.5 pl-6">
                <p className="text-base font-medium text-fg">{answerOf(question)}</p>
                <p className="mt-1 text-sm text-fg-muted">{question.explanation}</p>
                <p className="mt-1 font-mono text-xs tabular text-mark-text">
                  p. {question.citation.pageStart}
                </p>
              </div>
            ) : (
              <div className="mt-2 pl-6">
                {question.type === 'mcq' && question.options ? (
                  <ul className="space-y-1">
                    {question.options.map((option, oi) => (
                      <li key={option} className="text-base text-fg">
                        <span className="font-mono text-fg-muted">{LETTERS[oi]})</span> {option}
                      </li>
                    ))}
                  </ul>
                ) : question.type === 'trueFalse' ? (
                  <p className="font-mono text-sm text-fg-muted">True / False</p>
                ) : (
                  /* Ruled space to write on, since this is meant to be printed. */
                  <div aria-hidden className="mt-1 space-y-4">
                    <div className="border-b border-line" />
                    <div className="border-b border-line" />
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
