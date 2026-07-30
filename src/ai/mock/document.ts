import type { StoredDocument, TextChunk } from '@/domain/types';

export const MOCK_DOC_ID = 'doc-mock-respiration';

const chunk = (
  id: string,
  pageStart: number,
  pageEnd: number,
  headingPath: string[],
  text: string,
): TextChunk => ({
  id,
  text,
  pageStart,
  pageEnd,
  headingPath,
  charCount: text.length,
});

export const mockChunks: TextChunk[] = [
  chunk(
    'c-38',
    38,
    40,
    ['Cellular Respiration', 'Overview'],
    'Cellular respiration is the set of reactions that converts the chemical energy held in glucose into ATP, the form of energy a cell can actually spend. The complete process is usually divided into three stages: glycolysis, the Krebs cycle, and oxidative phosphorylation at the electron transport chain.',
  ),
  chunk(
    'c-41',
    41,
    43,
    ['Cellular Respiration', 'Glycolysis'],
    'Glycolysis takes place in the cytoplasm and does not require oxygen. One molecule of glucose is split into two molecules of pyruvate, with a net yield of two ATP and two NADH. Because it occurs in the cytoplasm rather than the mitochondrion, glycolysis is common to both aerobic and anaerobic respiration.',
  ),
  chunk(
    'c-47',
    47,
    49,
    ['Cellular Respiration', 'The Krebs Cycle'],
    'NADH carries electrons from the Krebs cycle to the electron transport chain, where they drive ATP synthesis. The cycle turns twice for each molecule of glucose, because glycolysis produced two pyruvate molecules, and includes four oxidation steps that each reduce an electron carrier.',
  ),
  chunk(
    'c-52',
    52,
    55,
    ['Cellular Respiration', 'Electron Transport'],
    'The electron transport chain is embedded in the inner mitochondrial membrane. Electrons passed along the chain release energy that pumps protons into the intermembrane space, creating the gradient that ATP synthase uses. Oxygen acts as the final electron acceptor, which is why the chain stops without it.',
  ),
  chunk(
    'c-58',
    58,
    61,
    ['Cellular Respiration', 'Yield and regulation'],
    'A single glucose molecule yields roughly 30 to 32 ATP under aerobic conditions. The figure is given as a range rather than a fixed number because the cost of moving NADH into the mitochondrion differs between tissues.',
  ),
];

export const mockDocument: StoredDocument = {
  id: MOCK_DOC_ID,
  title: 'Lecture Notes Week 8 — Cellular Respiration',
  fileName: 'lecture-notes-week-8.pdf',
  format: 'pdf',
  byteSize: 4_812_663,
  pageCount: 180,
  createdAt: Date.now() - 1000 * 60 * 60 * 6,
  studySetId: null,
  chunks: mockChunks,
  outline: [
    {
      id: 'o-1',
      title: 'Cellular Respiration',
      level: 1,
      pageStart: 38,
      pageEnd: 61,
      children: [
        { id: 'o-1-1', title: 'Overview', level: 2, pageStart: 38, pageEnd: 40, children: [] },
        { id: 'o-1-2', title: 'Glycolysis', level: 2, pageStart: 41, pageEnd: 43, children: [] },
        {
          id: 'o-1-3',
          title: 'The Krebs Cycle',
          level: 2,
          pageStart: 47,
          pageEnd: 49,
          children: [],
        },
        {
          id: 'o-1-4',
          title: 'Electron Transport',
          level: 2,
          pageStart: 52,
          pageEnd: 55,
          children: [],
        },
        {
          id: 'o-1-5',
          title: 'Yield and regulation',
          level: 2,
          pageStart: 58,
          pageEnd: 61,
          children: [],
        },
      ],
    },
  ],
  estimatedTokens: 48_200,
  parseWarnings: [],
};
