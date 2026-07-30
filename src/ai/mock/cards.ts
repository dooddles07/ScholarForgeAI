import type { Card } from '@/domain/types';
import { MOCK_DOC_ID } from './document';

const DAY = 1000 * 60 * 60 * 24;

interface Seed {
  front: string;
  back: string;
  page: number;
  chunkId: string;
  quote: string;
  topic: string;
  dueInDays: number;
  state: Card['state'];
  reps: number;
  lapses: number;
}

const seeds: Seed[] = [
  {
    front: 'What does NADH do in cellular respiration?',
    back: 'Carries electrons from the Krebs cycle to the electron transport chain.',
    page: 47,
    chunkId: 'c-47',
    quote: 'NADH carries electrons from the Krebs cycle to the electron transport chain.',
    topic: 'The Krebs Cycle',
    dueInDays: 0,
    state: 'review',
    reps: 4,
    lapses: 1,
  },
  {
    front: 'Where does glycolysis take place?',
    back: 'In the cytoplasm, which is why it does not need oxygen.',
    page: 41,
    chunkId: 'c-41',
    quote: 'Glycolysis takes place in the cytoplasm and does not require oxygen.',
    topic: 'Glycolysis',
    dueInDays: 0,
    state: 'review',
    reps: 6,
    lapses: 0,
  },
  {
    front: 'What is the net ATP yield of glycolysis?',
    back: 'Two ATP, plus two NADH.',
    page: 41,
    chunkId: 'c-41',
    quote: 'a net yield of two ATP and two NADH',
    topic: 'Glycolysis',
    dueInDays: 0,
    state: 'learning',
    reps: 1,
    lapses: 0,
  },
  {
    front: 'Why does the Krebs cycle turn twice per glucose?',
    back: 'Because glycolysis split the glucose into two pyruvate molecules.',
    page: 47,
    chunkId: 'c-47',
    quote: 'The cycle turns twice for each molecule of glucose, because glycolysis produced two pyruvate molecules.',
    topic: 'The Krebs Cycle',
    dueInDays: 0,
    state: 'new',
    reps: 0,
    lapses: 0,
  },
  {
    front: 'What is the final electron acceptor in the electron transport chain?',
    back: 'Oxygen. Without it the chain stops.',
    page: 52,
    chunkId: 'c-52',
    quote: 'Oxygen acts as the final electron acceptor, which is why the chain stops without it.',
    topic: 'Electron Transport',
    dueInDays: 0,
    state: 'new',
    reps: 0,
    lapses: 0,
  },
  {
    front: 'What does the proton gradient power?',
    back: 'ATP synthase.',
    page: 52,
    chunkId: 'c-52',
    quote: 'creating the gradient that ATP synthase uses',
    topic: 'Electron Transport',
    dueInDays: 2,
    state: 'review',
    reps: 3,
    lapses: 0,
  },
  {
    front: 'How much ATP does one glucose molecule yield aerobically?',
    back: 'Roughly 30 to 32 ATP.',
    page: 58,
    chunkId: 'c-58',
    quote: 'A single glucose molecule yields roughly 30 to 32 ATP under aerobic conditions.',
    topic: 'Yield and regulation',
    dueInDays: 5,
    state: 'review',
    reps: 5,
    lapses: 0,
  },
];

const now = Date.now();

export const mockCards: Card[] = seeds.map((s, i) => ({
  id: `card-${i + 1}`,
  deckId: 'deck-mock',
  type: 'basic',
  front: s.front,
  back: s.back,
  citation: {
    documentId: MOCK_DOC_ID,
    chunkId: s.chunkId,
    pageStart: s.page,
    pageEnd: s.page,
    quote: s.quote,
  },
  topic: s.topic,
  due: now + s.dueInDays * DAY,
  stability: s.reps * 1.8,
  difficulty: 5,
  elapsedDays: s.reps > 0 ? 2 : 0,
  scheduledDays: s.dueInDays,
  reps: s.reps,
  lapses: s.lapses,
  state: s.state,
  lastReview: s.reps > 0 ? now - 2 * DAY : null,
  isLeech: false,
  isSuspended: false,
  editedByUser: false,
  createdAt: now - 3 * DAY,
}));
