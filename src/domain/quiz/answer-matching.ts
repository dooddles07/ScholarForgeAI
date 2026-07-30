import type { Question } from '@/domain/types';

function normalise(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[.,;:!?'"()]/g, '')
    .replace(/\s+/g, ' ');
}

/* Levenshtein, capped. A typed answer should not be marked wrong over one typo. */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const substitute = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      const insert = (current[j - 1] ?? 0) + 1;
      const remove = (previous[j] ?? 0) + 1;
      current[j] = Math.min(substitute, insert, remove);
    }
    previous = current;
  }

  return previous[b.length] ?? 0;
}

function closeEnough(given: string, expected: string): boolean {
  if (given === expected) return true;
  const tolerance = expected.length > 8 ? 2 : expected.length > 4 ? 1 : 0;
  return editDistance(given, expected) <= tolerance;
}

/*
 * Returns null for a short answer, which cannot be marked automatically without guessing.
 * Guessing here would either punish a correct answer or credit a wrong one; both erode trust.
 */
export function checkAnswer(question: Question, answer: string): boolean | null {
  if (question.type === 'mcq') {
    return Number(answer) === question.correctIndex;
  }

  if (question.type === 'trueFalse') {
    return normalise(answer) === normalise(question.correctAnswer ?? '');
  }

  if (question.type === 'fillBlank') {
    const given = normalise(answer);
    const accepted = [question.correctAnswer, ...(question.acceptableAnswers ?? [])]
      .filter((v): v is string => Boolean(v))
      .map(normalise);
    return accepted.some((expected) => closeEnough(given, expected));
  }

  return null;
}
