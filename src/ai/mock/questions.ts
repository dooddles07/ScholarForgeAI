import type { Question } from '@/domain/types';
import { MOCK_DOC_ID } from './document';

const cite = (chunkId: string, pageStart: number, pageEnd: number, quote: string) => ({
  documentId: MOCK_DOC_ID,
  chunkId,
  pageStart,
  pageEnd,
  quote,
});

/* Hand-written for the sample document so the demo shows the quality the real thing aims at. */
export const mockQuestions: Question[] = [
  {
    id: 'q-1',
    type: 'mcq',
    prompt: 'Which molecule carries electrons from the Krebs cycle to the electron transport chain?',
    options: ['NADH', 'ATP', 'Pyruvate', 'Glucose'],
    correctIndex: 0,
    explanation:
      'ATP is what the cell spends, not what carries the electrons. Pyruvate and glucose are fuel going in, not shuttles.',
    citation: cite(
      'c-47',
      47,
      47,
      'NADH carries electrons from the Krebs cycle to the electron transport chain, where they drive ATP synthesis.',
    ),
    difficulty: 'medium',
    topic: 'The Krebs Cycle',
    flaggedByUser: false,
  },
  {
    id: 'q-2',
    type: 'trueFalse',
    prompt: 'Glycolysis takes place inside the mitochondrion.',
    correctAnswer: 'False',
    explanation:
      'It happens in the cytoplasm. Being outside the mitochondrion is exactly what lets it run without oxygen.',
    citation: cite(
      'c-41',
      41,
      41,
      'Glycolysis takes place in the cytoplasm and does not require oxygen.',
    ),
    difficulty: 'easy',
    topic: 'Glycolysis',
    flaggedByUser: false,
  },
  {
    id: 'q-3',
    type: 'mcq',
    prompt: 'How many times does the Krebs cycle turn for each molecule of glucose?',
    options: ['Once', 'Twice', 'Four times', 'Six times'],
    correctIndex: 1,
    explanation:
      'One glucose in, two pyruvate out, so the cycle has two lots of fuel to get through. Counting one turn per glucose is the usual slip here.',
    citation: cite(
      'c-47',
      47,
      47,
      'The cycle turns twice for each molecule of glucose, because glycolysis produced two pyruvate molecules.',
    ),
    difficulty: 'medium',
    topic: 'The Krebs Cycle',
    flaggedByUser: false,
  },
  {
    id: 'q-4',
    type: 'fillBlank',
    prompt: 'Oxygen acts as the final ______ acceptor in the electron transport chain.',
    correctAnswer: 'electron',
    acceptableAnswers: ['electron', 'electrons'],
    explanation:
      'Without oxygen to accept the electrons at the end, the chain backs up and stops running.',
    citation: cite(
      'c-52',
      52,
      52,
      'Oxygen acts as the final electron acceptor, which is why the chain stops without it.',
    ),
    difficulty: 'medium',
    topic: 'Electron Transport',
    flaggedByUser: false,
  },
  {
    id: 'q-5',
    type: 'shortAnswer',
    prompt: 'Why is the ATP yield from one glucose molecule given as a range rather than one number?',
    correctAnswer:
      'Because the cost of moving NADH into the mitochondrion is different in different tissues.',
    acceptableAnswers: ['transport cost varies', 'shuttle cost differs between tissues'],
    explanation:
      'NADH made in the cytoplasm has to be shuttled inside, and different tissues use different shuttles. Cheaper shuttle, more ATP.',
    citation: cite(
      'c-58',
      58,
      58,
      'The figure is given as a range rather than a fixed number because the cost of moving NADH into the mitochondrion differs between tissues.',
    ),
    difficulty: 'hard',
    topic: 'Yield and regulation',
    flaggedByUser: false,
  },
  {
    id: 'q-6',
    type: 'mcq',
    prompt: 'What does the proton gradient across the inner mitochondrial membrane directly power?',
    options: ['ATP synthase', 'Glycolysis', 'Pyruvate production', 'Glucose transport'],
    correctIndex: 0,
    explanation:
      'The chain does not make ATP itself. It builds a pressure difference, and ATP synthase is the turbine that difference drives.',
    citation: cite(
      'c-52',
      52,
      52,
      'Electrons passed along the chain release energy that pumps protons into the intermembrane space, creating the gradient that ATP synthase uses.',
    ),
    difficulty: 'hard',
    topic: 'Electron Transport',
    flaggedByUser: false,
  },
  {
    id: 'q-7',
    type: 'trueFalse',
    prompt: 'Glycolysis produces a net yield of two ATP.',
    correctAnswer: 'True',
    explanation:
      'Net, not gross. Glycolysis spends two ATP early on to make four, so the figure you want is two.',
    citation: cite(
      'c-41',
      41,
      41,
      'One molecule of glucose is split into two molecules of pyruvate, with a net yield of two ATP and two NADH.',
    ),
    difficulty: 'easy',
    topic: 'Glycolysis',
    flaggedByUser: false,
  },
  {
    id: 'q-8',
    type: 'mcq',
    prompt: 'Into how many stages is cellular respiration usually divided?',
    options: ['Two', 'Three', 'Four', 'Five'],
    correctIndex: 1,
    explanation:
      'Glycolysis, the Krebs cycle, and oxidative phosphorylation at the electron transport chain.',
    citation: cite(
      'c-38',
      38,
      38,
      'The complete process is usually divided into three stages: glycolysis, the Krebs cycle, and oxidative phosphorylation at the electron transport chain.',
    ),
    difficulty: 'easy',
    topic: 'Overview',
    flaggedByUser: false,
  },
  {
    id: 'q-9',
    type: 'shortAnswer',
    prompt: 'Where in the cell does glycolysis happen, and why does that matter?',
    correctAnswer:
      'In the cytoplasm, which is why it works in both aerobic and anaerobic respiration.',
    acceptableAnswers: ['cytoplasm', 'cytosol'],
    explanation:
      'The location is the point of the question. Anaerobic organisms still run glycolysis, and that only works because it is not stuck inside a mitochondrion.',
    citation: cite(
      'c-41',
      41,
      41,
      'Because it occurs in the cytoplasm rather than the mitochondrion, glycolysis is common to both aerobic and anaerobic respiration.',
    ),
    difficulty: 'medium',
    topic: 'Glycolysis',
    flaggedByUser: false,
  },
  {
    id: 'q-10',
    type: 'fillBlank',
    prompt: 'The Krebs cycle includes four ______ steps, each of which reduces an electron carrier.',
    correctAnswer: 'oxidation',
    acceptableAnswers: ['oxidation', 'oxidative'],
    explanation:
      'Each of those steps strips electrons off and hands them to a carrier, which is where the NADH comes from.',
    citation: cite(
      'c-47',
      47,
      47,
      'includes four oxidation steps that each reduce an electron carrier',
    ),
    difficulty: 'hard',
    topic: 'The Krebs Cycle',
    flaggedByUser: false,
  },
];
