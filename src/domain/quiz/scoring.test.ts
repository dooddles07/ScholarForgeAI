import { describe, expect, it } from 'vitest';
import type { Question, Response } from '@/domain/types';
import { scoreQuiz } from './scoring';
import { checkAnswer } from './answer-matching';

const question = (over: Partial<Question> = {}): Question => ({
  id: 'q1',
  type: 'mcq',
  prompt: 'p',
  options: ['a', 'b'],
  correctIndex: 0,
  explanation: 'e',
  citation: { documentId: 'd', chunkId: 'c', pageStart: 1, pageEnd: 1 },
  difficulty: 'medium',
  topic: 'Topic A',
  flaggedByUser: false,
  ...over,
});

const response = (id: string, isCorrect: boolean | null): Response => ({
  questionId: id,
  answer: '0',
  isCorrect,
  answeredAt: 0,
  timeSpentMs: 0,
});

describe('scoreQuiz', () => {
  it('scores all correct', () => {
    const qs = [question({ id: 'a' }), question({ id: 'b' })];
    const score = scoreQuiz(qs, [response('a', true), response('b', true)]);
    expect(score.percent).toBe(100);
    expect(score.missedQuestionIds).toEqual([]);
  });

  it('scores none correct', () => {
    const qs = [question({ id: 'a' }), question({ id: 'b' })];
    const score = scoreQuiz(qs, [response('a', false), response('b', false)]);
    expect(score.percent).toBe(0);
    expect(score.missedQuestionIds).toEqual(['a', 'b']);
  });

  it('excludes flagged questions from the score', () => {
    const qs = [question({ id: 'a' }), question({ id: 'b', flaggedByUser: true })];
    const score = scoreQuiz(qs, [response('a', true), response('b', false)]);
    expect(score.scored).toBe(1);
    expect(score.percent).toBe(100);
  });

  it('counts unmarked short answers separately', () => {
    const qs = [question({ id: 'a', type: 'shortAnswer' })];
    const score = scoreQuiz(qs, [response('a', null)]);
    expect(score.unmarked).toBe(1);
    expect(score.scored).toBe(0);
  });

  it('handles an empty quiz without dividing by zero', () => {
    expect(scoreQuiz([], []).percent).toBe(0);
  });
});

describe('checkAnswer', () => {
  it('accepts a fill-in-the-blank answer with one typo', () => {
    const q = question({ type: 'fillBlank', correctAnswer: 'oxidation' });
    expect(checkAnswer(q, 'oxidatoin')).toBe(true);
  });

  it('rejects a different word', () => {
    const q = question({ type: 'fillBlank', correctAnswer: 'oxidation' });
    expect(checkAnswer(q, 'reduction')).toBe(false);
  });

  it('leaves a short answer unmarked', () => {
    const q = question({ type: 'shortAnswer', correctAnswer: 'anything' });
    expect(checkAnswer(q, 'anything')).toBeNull();
  });

  it('ignores case and punctuation on true or false', () => {
    const q = question({ type: 'trueFalse', correctAnswer: 'False' });
    expect(checkAnswer(q, 'false.')).toBe(true);
  });
});
