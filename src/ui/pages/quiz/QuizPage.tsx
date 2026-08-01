import { useState } from 'react';
import { useParams } from 'react-router';
import { useDocument } from '@/hooks/use-documents';
import { useAppearance } from '@/hooks/use-settings';
import { useMakeCardsFromMissed } from '@/hooks/use-make-cards';
import { PageHeader } from '@/ui/components/PageHeader';
import { quiz as quizCopy, generation } from '@/copy/labels';
import { useQuizSession } from './use-quiz-session';
import { QuizConfigForm } from './components/QuizConfigForm';
import { QuestionCard } from './components/QuestionCard';
import { AnswerFeedback } from './components/AnswerFeedback';
import { QuizResults } from './components/QuizResults';
import { QuizProgress } from './components/QuizProgress';

export default function QuizPage() {
  useAppearance();
  const { id } = useParams();
  const doc = useDocument(id);
  const session = useQuizSession(doc ?? undefined);
  const makeCards = useMakeCardsFromMissed();
  const [cardsMade, setCardsMade] = useState(false);

  if (!doc) return null;

  const backTo = `/app/doc/${doc.id}`;

  if (session.phase === 'config') {
    return (
      <>
        <PageHeader title={quizCopy.configHeading} backTo={backTo} />
        <div className="px-4 pt-6 md:px-8">
          <QuizConfigForm onStart={(config) => void session.start(config)} error={session.error} />
        </div>
      </>
    );
  }

  if (session.phase === 'generating') {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center md:px-8">
        <p aria-live="polite" className="text-xl font-medium text-fg">
          {generation.quiz}
        </p>
        <p className="mt-2 text-base text-fg-muted">Reading your document for things to ask.</p>
      </div>
    );
  }

  if (session.phase === 'results') {
    const score = session.score();
    return (
      <>
        <PageHeader title="Your results" backTo={backTo} />
        <div className="px-4 pt-6 md:px-8">
          <QuizResults
            score={score}
            elapsedMs={session.elapsedMs()}
            documentId={doc.id}
            cardsMade={cardsMade}
            onRetryMissed={() => session.retryMissed(score)}
            onMakeCards={() => {
              const missed = session.questions.filter((q) =>
                score.missedQuestionIds.includes(q.id),
              );
              void makeCards(doc, missed).then(() => setCardsMade(true));
            }}
          />
        </div>
      </>
    );
  }

  const { current, currentResponse } = session;
  if (!current) return null;

  return (
    <div className="px-4 pt-4 md:px-8 md:pt-8">
      <div className="mx-auto max-w-2xl">
        <QuizProgress index={session.index} total={session.questions.length} backTo={backTo} />

        {/* Silently returning three of ten reads as a bug. Saying why builds trust in grounding. */}
        {session.shortfall > 0 && session.index === 0 && (
          <p className="mt-4 rounded-md border border-line bg-surface px-4 py-3 text-sm text-fg-muted">
            {generation.someDropped(session.questions.length, session.shortfall)}
          </p>
        )}

        <div className="mt-6 pb-40 lg:pb-0">
          {currentResponse ? (
            <AnswerFeedback
              question={current}
              response={currentResponse}
              isLast={session.index + 1 >= session.questions.length}
              onNext={session.next}
              onFlag={session.flag}
            />
          ) : (
            <QuestionCard key={current.id} question={current} onAnswer={session.answer} />
          )}
        </div>
      </div>
    </div>
  );
}
