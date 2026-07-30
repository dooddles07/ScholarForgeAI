import type { Question } from '@/domain/types';

/*
 * Models favour particular answer positions, so options are shuffled once immediately after
 * generation and stored shuffled. Re-shuffling on render would break a resumed session.
 */
export function shuffleOptions(question: Question): Question {
  if (question.type !== 'mcq' || !question.options || question.correctIndex === undefined) {
    return question;
  }

  const correct = question.options[question.correctIndex];
  const shuffled = [...question.options];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = shuffled[i];
    const b = shuffled[j];
    if (a !== undefined && b !== undefined) {
      shuffled[i] = b;
      shuffled[j] = a;
    }
  }

  return { ...question, options: shuffled, correctIndex: shuffled.indexOf(correct ?? '') };
}
