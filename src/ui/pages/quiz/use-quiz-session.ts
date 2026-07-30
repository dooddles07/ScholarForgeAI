import { useCallback, useRef, useState } from 'react';
import type { Question, QuizConfig, Response, StoredDocument } from '@/domain/types';
import { checkAnswer } from '@/domain/quiz/answer-matching';
import { scoreQuiz, type QuizScore } from '@/domain/quiz/scoring';
import { shuffleOptions } from '@/domain/quiz/shuffle';
import { useGenerateQuestions } from '@/hooks/use-generation';
import { useRecordStudyDay } from '@/hooks/use-streak';
import { generationErrorMessage } from '@/lib/generation-error';

export type Phase = 'config' | 'generating' | 'question' | 'results';

export function useQuizSession(doc: StoredDocument | undefined) {
  const generateQuestions = useGenerateQuestions();
  const recordStudyDay = useRecordStudyDay();
  const [phase, setPhase] = useState<Phase>('config');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Response[]>([]);
  const [error, setError] = useState<string | null>(null);
  /* Asked-for count, so a short result can be explained rather than looking like a bug. */
  const [requested, setRequested] = useState(0);
  const startedAt = useRef(Date.now());
  const questionStartedAt = useRef(Date.now());

  const start = useCallback(
    async (config: QuizConfig) => {
      if (!doc) return;
      setPhase('generating');
      setError(null);
      setRequested(config.count);
      try {
        const generated = await generateQuestions(doc, config.count);
        setQuestions(generated.map(shuffleOptions));
        setIndex(0);
        setResponses([]);
        startedAt.current = Date.now();
        questionStartedAt.current = Date.now();
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
          timeSpentMs: Date.now() - questionStartedAt.current,
        },
      ]);
      void recordStudyDay();
    },
    [index, questions, recordStudyDay],
  );

  const next = useCallback(() => {
    questionStartedAt.current = Date.now();
    setIndex((i) => {
      if (i + 1 >= questions.length) {
        setPhase('results');
        return i;
      }
      return i + 1;
    });
  }, [questions.length]);

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
      startedAt.current = Date.now();
      questionStartedAt.current = Date.now();
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
    elapsedMs: () => Date.now() - startedAt.current,
    start,
    answer,
    next,
    flag,
    retryMissed,
  };
}
