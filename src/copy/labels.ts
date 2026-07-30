/* App strings. Verbatim from docs/02-DESIGN/CONTENT-AND-COPY-GUIDE.md. */

export const nav = {
  library: 'Library',
  review: 'Review',
  progress: 'Progress',
  settings: 'Settings',
  skipToContent: 'Skip to content',
  back: 'Back',
} as const;

export const parsing = {
  reading: 'Reading your file',
  extracting: (n: number, total: number) => `Reading page ${n} of ${total}`,
  checking: 'Checking the text',
  cleaning: 'Tidying up',
  structure: 'Finding the topics',
  finishing: 'Almost ready',
  cancel: 'Cancel',
} as const;

export const generation = {
  quiz: 'Writing your questions',
  cards: 'Making your flashcards',
  exam: 'Building your exam',
  cancel: 'Stop',
  cancelledPartial: (n: number) => `Stopped. We kept the ${n} questions that were already done.`,
  someDropped: (n: number, m: number) =>
    `We made ${n} questions. ${m} were left out because we could not confirm which page they came from.`,
} as const;

export const documentHub = {
  quiz: 'Quiz me',
  flashcards: 'Flashcards',
  ask: 'Ask about it',
  exam: 'Build a practice exam',
  topics: 'Topics',
  noOutline: 'We could not find a topic list in this document, so pick a page range instead.',
  pageRange: 'Pages to cover',
  meta: (pages: number, when: string) => `${pages} pages · added ${when}`,
} as const;

export const quiz = {
  configHeading: 'What kind of quiz?',
  count: 'How many questions',
  custom: 'Custom',
  difficulty: 'How hard',
  easy: 'Recall — can you remember it',
  medium: 'Understanding — can you explain it',
  hard: 'Applying — can you use it',
  scope: 'What to cover',
  wholeDoc: 'Everything',
  questionTypes: 'Question types',
  start: 'Start the quiz',
  progress: (n: number, total: number) => `Question ${n} of ${total}`,
  check: 'Check my answer',
  correct: 'Correct',
  incorrect: 'Not quite',
  correctAnswer: (answer: string) => `The answer is: ${answer}`,
  source: (n: number) => `From page ${n}`,
  showSource: 'Show me where',
  hideSource: 'Hide the passage',
  flag: 'This question looks wrong',
  flagged: 'Thanks. We have left it out of your score.',
  next: 'Next question',
  finish: 'See my results',
  pause: 'Pause',
  answerPlaceholder: 'Type your answer',
} as const;

export const results = {
  score: (correct: number, total: number) => `You got ${correct} of ${total}`,
  breakdown: 'How you did by topic',
  strong: 'Solid',
  weak: 'Worth another look',
  retryMissed: (n: number) => `Retry the ${n} I missed`,
  makeCards: 'Turn the ones I missed into flashcards',
  backToDocument: 'Back to the document',
} as const;

export const flashcards = {
  flip: 'Show the answer',
  ratingPrompt: 'How did that go?',
  again: 'Again',
  hard: 'Hard',
  good: 'Good',
  easy: 'Easy',
  interval: (duration: string) => `Back in ${duration}`,
  readAloud: 'Read this out loud',
  sessionDone: (n: number) => `Done for now. ${n} cards reviewed.`,
  nothingDue: 'Nothing due today. Either you are ahead, or you have not started yet.',
  leech: (n: number) => `You have missed this one ${n} times. Want to reword it?`,
  progress: (n: number, total: number) => `${n} of ${total}`,
} as const;

export const streak = {
  active: (n: number) => `${n} day streak`,
  graceUsed: 'Streak kept. Everyone misses a day.',
  broken: 'Streak reset. Starting again today.',
} as const;

export const explanations = {
  trigger: 'Explain this',
  simple: 'Simple — like I know nothing',
  normal: 'Normal — I half get it',
  deep: 'Deep — I have an exam on this',
  sources: (pages: string) => `Based on pages ${pages}`,
  notCovered: (concept: string) => `This document does not seem to explain ${concept}.`,
  nearby: (topics: string) => `It does cover ${topics}, which may be related.`,
} as const;

export const chat = {
  heading: (title: string) => `Ask about ${title}`,
  placeholder: 'Ask anything about this document',
  thinking: 'Looking through your document',
  citation: (n: number) => `p. ${n}`,
  notFound: 'I could not find that in this document.',
  saveAsCard: 'Save this as a flashcard',
  send: 'Send',
  saved: 'Saved as a flashcard',
} as const;

export const exam = {
  heading: 'Build a practice exam',
  timeLimit: 'Time limit (optional)',
  marks: 'Marks per question (optional)',
  generate: 'Build my exam',
  preview: 'Preview',
  answerKey: 'Answer key',
  print: 'Print',
  takeIt: 'Take it now',
  timeLeft: (duration: string) => `${duration} left`,
  timeUp: 'Time is up. Submitting what you have.',
  submit: 'Submit my exam',
  regenerate: 'Rewrite this question',
} as const;

export const offline = {
  banner: 'You are offline. Cards, saved quizzes, and exams all still work.',
  disabledAction: 'Needs a connection',
  backOnline: 'Back online',
} as const;

export const storage = {
  warning80: (pct: number) => `This app is using about ${pct}% of the space your browser allows.`,
  action80: 'Free up space',
  blocked95: 'There is not enough space to add another document.',
  firstRun:
    'Everything is saved in this browser only. There is no account, so if you clear your browser data it will be gone. You can export a backup any time.',
  exportNudge: 'You have done a fair bit of work. Want to save a backup file?',
  privateBrowsing: 'You are in a private window, so nothing will be saved once you close it.',
} as const;

export const deleteAll = {
  label: 'Delete everything',
  confirmHeading: 'Delete everything?',
  confirmBody:
    'This removes every document, deck, quiz, and all your progress from this browser. It cannot be undone.',
  suggestion: 'Export a backup first',
  confirm: 'Yes, delete it all',
  cancel: 'Keep my data',
} as const;

export const byok = {
  heading: 'Use your own free key',
  intro:
    'Google gives out free API keys. With your own, you are not sharing a daily limit with everyone else.',
  step1: 'Go to Google AI Studio and sign in',
  step2: 'Click Get API key, then Create API key',
  step3: 'Paste it below',
  fieldLabel: 'Your API key',
  privacyNote:
    'Your key is saved in this browser only. It is never sent to our servers and never stored anywhere else.',
  save: 'Save my key',
  confirmation: 'Saved. You are no longer sharing the daily limit.',
  remove: 'Remove my key',
} as const;

export const install = {
  prompt: 'Add ScholarForge to your home screen so it opens like an app and works offline.',
  install: 'Add it',
  dismiss: 'No thanks',
  ios: 'Tap the Share button, then Add to Home Screen.',
} as const;

export const settings = {
  appearance: 'Appearance',
  theme: 'Theme',
  themeSystem: 'Match my device',
  themeLight: 'Light',
  themeDark: 'Dark',
  readingMode: 'Reading mode',
  readingModeHint: 'Wider letter and line spacing. Easier for some people to read.',
  reduceMotion: 'Reduce motion',
  studying: 'Studying',
  dailyCardLimit: 'Cards per day',
  focusTimer: 'Focus timer',
  ai: 'AI',
  yourData: 'Your data',
  exportAll: 'Export a backup',
  importPack: 'Import a backup',
  storageUsed: 'Storage used',
  about: 'About',
  version: 'Version',
  licence: 'Licence',
  sourceCode: 'Source code',
  reportProblem: 'Report a problem',
} as const;
