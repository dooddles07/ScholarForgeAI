import { createEmptyCard, fsrs, generatorParameters, Rating as FsrsRating, State } from 'ts-fsrs';
import type { Grade } from 'ts-fsrs';
import type { Card, CardState, Rating } from '@/domain/types';

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

/* Manual is deliberately absent: this product only ever rates via the four buttons. */
const TO_FSRS: Record<Rating, Grade> = {
  1: FsrsRating.Again,
  2: FsrsRating.Hard,
  3: FsrsRating.Good,
  4: FsrsRating.Easy,
};

const FROM_STATE: Record<State, CardState> = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
};

const TO_STATE: Record<CardState, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

/* Cards are stored in the shape ts-fsrs expects, so this is a projection rather than a translation. */
function toFsrsCard(card: Card) {
  const empty = createEmptyCard(new Date(card.createdAt));
  return {
    ...empty,
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    reps: card.reps,
    lapses: card.lapses,
    state: TO_STATE[card.state],
    last_review: card.lastReview ? new Date(card.lastReview) : null,
  };
}

export interface SchedulePreview {
  rating: Rating;
  intervalDays: number;
}

/* Each rating button shows the interval it produces, so the schedule is legible rather than magic. */
export function previewIntervals(card: Card, now = new Date()): SchedulePreview[] {
  const source = toFsrsCard(card);
  return ([1, 2, 3, 4] as Rating[]).map((rating) => {
    const outcome = scheduler.next(source, now, TO_FSRS[rating]);
    const days = (outcome.card.due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return { rating, intervalDays: Math.max(days, 1 / 144) };
  });
}

const LEECH_THRESHOLD = 8;

export function applyRating(card: Card, rating: Rating, now = new Date()): Card {
  const next = scheduler.next(toFsrsCard(card), now, TO_FSRS[rating]).card;
  const lapses = next.lapses;

  return {
    ...card,
    due: next.due.getTime(),
    stability: next.stability,
    difficulty: next.difficulty,
    elapsedDays: next.elapsed_days,
    scheduledDays: next.scheduled_days,
    reps: next.reps,
    lapses,
    state: FROM_STATE[next.state] ?? 'review',
    lastReview: now.getTime(),
    /* A leech usually means the card is badly written, not that the person is failing. */
    isLeech: lapses >= LEECH_THRESHOLD,
  };
}
