import { useCallback, useState } from 'react';
import type { Question, QuizConfig, Response, StoredDocument } from '@/domain/types';
import { checkAnswer } from '@/domain/quiz/answer-matching';
import { scoreQuiz, type QuizScore } from '@/domain/quiz/scoring';
import { shuffleOptions } from '@/domain/quiz/shuffle';
import { useGenerateQuestions } from '@/hooks/use-generation';
import { useRecordStudyDay } from '@/hooks/use-streak';
import { useSaveAttempt } from '@/hooks/use-attempts';
import { generationErrorMessage } from '@/lib/generation-error';

export type Phase = 'config' | 'generating' | 'question' | 'results';

export function useQuizSession(doc: StoredDocument | undefined) {
  const generateQuestions = useGenerateQuestions();
  const recordStudyDay = useRecordStudyDay();
  const saveAttempt = useSaveAttempt();
  const [phase, setPhase] = useState<Phase>('config');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Response[]>([]);
  const [error, setError] = useState<string | null>(null);
  /* Asked-for count, so a short result can be explained rather than looking like a bug. */
  const [requested, setRequested] = useState(0);
  /* State rather than a ref: a ref cannot be read or lazily initialized during render under the
     current rules, and each reset here already lands beside a phase/index update that would
     re-render anyway, so there is no perf case for a ref. The lazy initializer runs once. */
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [questionStartedAt, setQuestionStartedAt] = useState(() => Date.now());

  const start = useCallback(
    async (config: QuizConfig) => {
      if (!doc) return;
      setPhase('generating');
      setError(null);
      setRequested(config.count);
      try {
        const generated = await generateQuestions(doc, config.count, {
          difficulty: config.difficulty,
          types: config.types,
        });
        setQuestions(generated.map(shuffleOptions));
        setIndex(0);
        setResponses([]);
        setStartedAt(Date.now());
        setQuestionStartedAt(Date.now());
        setPhase('question');
      } catch (err) {
        setError(generationErrorMessage(err));
        setPhase('config');
      }
    },
    [doc, generateQuestions],
  );

  const answer = useCallback(
    (value: string) => {
      const question = questions[index];
      if (!question) return;
      setResponses((prev) => [
        ...prev,
        {
          questionId: question.id,
          answer: value,
          isCorrect: checkAnswer(question, value),
          answeredAt: Date.now(),
          timeSpentMs: Date.now() - questionStartedAt,
        },
      ]);
      void recordStudyDay();
    },
    [index, questions, questionStartedAt, recordStudyDay],
  );

  const next = useCallback(() => {
    setQuestionStartedAt(Date.now());
    if (index + 1 >= questions.length) {
      setPhase('results');
      if (doc) {
        void saveAttempt({
          id: crypto.randomUUID(),
          kind: 'quiz',
          sourceId: doc.id,
          startedAt,
          completedAt: Date.now(),
          responses,
          score: scoreQuiz(questions, responses).percent,
          timeSpentMs: Date.now() - startedAt,
        });
      }
      return;
    }
    setIndex(index + 1);
  }, [doc, index, questions, responses, saveAttempt, startedAt]);

  /* Flagging excludes the question from scoring rather than deleting it. */
  const flag = useCallback(() => {
    const question = questions[index];
    if (!question) return;
    setQuestions((prev) =>
      prev.map((q) => (q.id === question.id ? { ...q, flaggedByUser: true } : q)),
    );
  }, [index, questions]);

  const retryMissed = useCallback(
    (score: QuizScore) => {
      const missed = questions.filter((q) => score.missedQuestionIds.includes(q.id));
      if (missed.length === 0) return;
      setQuestions(missed.map(shuffleOptions));
      setIndex(0);
      setResponses([]);
      setStartedAt(Date.now());
      setQuestionStartedAt(Date.now());
      setPhase('question');
    },
    [questions],
  );

  const current = questions[index];
  const currentResponse = current
    ? responses.find((r) => r.questionId === current.id)
    : undefined;

  return {
    phase,
    questions,
    index,
    current,
    currentResponse,
    responses,
    error,
    shortfall: Math.max(0, requested - questions.length),
    score: () => scoreQuiz(questions, responses),
    elapsedMs: () => Date.now() - startedAt,
    start,
    answer,
    next,
    flag,
    retryMissed,
  };
}
