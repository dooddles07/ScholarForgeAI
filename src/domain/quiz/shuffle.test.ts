import { describe, expect, it, vi } from 'vitest';
import type { Question } from '@/domain/types';
import { shuffleOptions } from './shuffle';

const question = (over: Partial<Question> = {}): Question => ({
  id: 'q1',
  type: 'mcq',
  prompt: 'p',
  options: ['a', 'b', 'c', 'd'],
  correctIndex: 0,
  explanation: 'e',
  citation: { documentId: 'd', chunkId: 'c', pageStart: 1, pageEnd: 1 },
  difficulty: 'medium',
  topic: null,
  flaggedByUser: false,
  ...over,
});

describe('shuffleOptions', () => {
  it('returns a non-mcq question unchanged', () => {
    const { options: _options, correctIndex: _correctIndex, ...rest } = question();
    const q: Question = { ...rest, type: 'trueFalse' };
    expect(shuffleOptions(q)).toEqual(q);
  });

  it('returns an mcq question with no options unchanged', () => {
    const { options: _options, ...rest } = question();
    const q: Question = { ...rest };
    expect(shuffleOptions(q)).toEqual(q);
  });

  it('keeps correctIndex pointing at the original correct option after shuffling', () => {
    const q = question();
    const shuffled = shuffleOptions(q);
    expect(shuffled.options![shuffled.correctIndex!]).toBe('a');
    expect(shuffled.options).toHaveLength(4);
    expect(new Set(shuffled.options)).toEqual(new Set(q.options));
  });

  it('applies the Fisher-Yates swap deterministically when Math.random is stubbed', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const shuffled = shuffleOptions(question());
    spy.mockRestore();

    expect(shuffled.options).toEqual(['b', 'c', 'd', 'a']);
    expect(shuffled.correctIndex).toBe(3);
  });
});
