import type { Question, Response } from '@/domain/types';

export interface TopicScore {
  topic: string;
  correct: number;
  total: number;
  percent: number;
}

export interface QuizScore {
  correct: number;
  /* Excludes flagged questions: a user is never penalised for our generation error. */
  scored: number;
  percent: number;
  unmarked: number;
  byTopic: TopicScore[];
  missedQuestionIds: string[];
}

export function scoreQuiz(questions: Question[], responses: Response[]): QuizScore {
  const byId = new Map(responses.map((r) => [r.questionId, r]));
  const counted = questions.filter((q) => !q.flaggedByUser);

  let correct = 0;
  let scored = 0;
  let unmarked = 0;
  const missedQuestionIds: string[] = [];
  const topics = new Map<string, { correct: number; total: number }>();

  for (const question of counted) {
    const response = byId.get(question.id);
    if (!response) continue;

    if (response.isCorrect === null) {
      unmarked += 1;
      continue;
    }

    scored += 1;
    if (response.isCorrect) correct += 1;
    else missedQuestionIds.push(question.id);

    const topic = question.topic;
    if (topic) {
      const entry = topics.get(topic) ?? { correct: 0, total: 0 };
      entry.total += 1;
      if (response.isCorrect) entry.correct += 1;
      topics.set(topic, entry);
    }
  }

  const byTopic = [...topics.entries()]
    .map(([topic, { correct: c, total }]) => ({
      topic,
      correct: c,
      total,
      percent: Math.round((c / total) * 100),
    }))
    .sort((a, b) => a.percent - b.percent);

  return {
    correct,
    scored,
    percent: scored === 0 ? 0 : Math.round((correct / scored) * 100),
    unmarked,
    byTopic,
    missedQuestionIds,
  };
}
