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
  count: 'How many questions',
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

export const authGate = {
  heading: 'Sign in to continue',
  body: 'ScholarForge AI needs a free Google sign-in so your documents, quizzes, and cards stay tied to your account.',
  signIn: 'Sign in with Google',
  error: 'Sign-in did not go through. Please try again.',
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
    'Everything is saved in this browser only unless you sync it. If you clear your browser data without syncing first, it will be gone. You can export a backup any time.',
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
  reduceMotionHint: 'Turns off sliding and fading. Your device setting is followed either way.',
  studying: 'Studying',
  dailyCardLimit: 'Cards per day',
  focusTimer: 'Focus timer',
  focusTimerHint: 'Shows how long you have been reviewing.',
  yourData: 'Your data',
  exportAll: 'Export a backup',
  importPack: 'Import a backup',
  importSuccess: 'Backup restored.',
  importError: 'That did not look like a ScholarForge backup file.',
  syncHeading: 'Sync across devices',
  syncIntro:
    'Back up your data to your Google account and pick it up on another device. Nothing syncs automatically until you choose to.',
  signInWithGoogle: 'Sign in with Google',
  syncChecking: 'Checking for a backup...',
  syncBackupFound: 'Found a backup from another device.',
  syncRestore: 'Restore it',
  syncSkip: 'Not now',
  syncSignedInAs: (email: string) => `Signed in as ${email}`,
  syncNow: 'Sync now',
  syncing: 'Syncing...',
  syncLastSynced: (when: string) => `Last synced ${when}`,
  syncSignOut: 'Sign out',
  syncError: 'Could not reach sync right now. Your local data is unaffected.',
  syncOffline: 'You are offline, so nothing was sent. Everything here is safe.',
  syncTooLarge:
    'Your library is too big to keep in your Google account. Export a backup file instead, which has no size limit.',
  exportCards: 'Export these cards',
  exportAnki: 'For Anki',
  exportQuizlet: 'For Quizlet',
  storageUsed: 'Storage used',
  storageUsedValue: (used: string, pct: number) =>
    `${used}, about ${pct}% of what this browser allows`,
  storageUnknown: 'This browser does not say how much space is left.',
  lastExported: (when: string) => `Last backup file saved ${when}`,
  localDataDismiss: 'Got it',
} as const;
