/* Marketing page strings. Same voice as the app: plain, brief, honest, on the reader's side. */

export const hero = {
  eyebrow: 'Free forever, open source',
  headline: 'Turn your notes into practice',
  sub: 'Upload a PDF, slides, or a book. Get quizzes, flashcards, explanations, and a practice exam.',
  dropzone: 'Drop a file here, or tap to choose one',
  dropzoneActive: 'Let go and we will start reading',
  formats: 'PDF, PowerPoint, Word, EPUB, text',
  privacy: 'Your file stays on your device. We never upload it.',
  cost: 'Free. Sign in with Google to start.',
  scrollHint: 'How it works',
} as const;

export const problem = {
  heading: 'Rereading is not studying',
  body: [
    'You have a 200-page PDF and an exam on Thursday. You have been through it twice. Tonight you will go through it again and remember about as much as you did the first time.',
    'What works is being asked questions. You find out what you actually do not know, and then you drill that. Making your own cards works too, but building them takes longer than the studying does.',
  ],
  kicker: 'This does the tedious part. That is the whole pitch.',
} as const;

export const thread = {
  heading: 'From a page to a question',
  sub: 'Every question stays tied to the passage that produced it. Get one wrong and you know exactly where to go back to.',
  steps: [
    {
      label: 'Your page',
      title: 'We read the document',
      body: 'Text is pulled out in your browser, page numbers kept intact.',
    },
    {
      label: 'The passage',
      title: 'A passage becomes a question',
      body: 'The model works from your text, not from what it happens to know.',
    },
    {
      label: 'The thread',
      title: 'The page number comes with it',
      body: 'Tap the citation and the original passage opens.',
    },
  ],
} as const;

export const output = {
  heading: 'Four things out of one file',
  items: [
    {
      title: 'Quizzes',
      body: 'Multiple choice, true or false, short answer, fill in the blank. Instant feedback and the page it came from.',
    },
    {
      title: 'Flashcards',
      body: 'Made for you, editable, swipeable. They come back on a schedule set by what you keep forgetting.',
    },
    {
      title: 'Explanations',
      body: 'Any concept at three depths, from "explain like I know nothing" to "I have an exam on this Thursday".',
    },
    {
      title: 'Practice exams',
      body: 'A full paper and a separate answer key. Printable, so you can sit it properly at a desk.',
    },
  ],
} as const;

export const grounding = {
  heading: 'Nothing is invented',
  body: [
    'Every question, answer, and explanation is drawn from your document and cites the page it came from. Anything we cannot trace back to a real passage is thrown away before it reaches you.',
    'A study tool that makes things up is worse than no study tool. You would be revising fiction, and you would not know which parts.',
  ],
} as const;

export const privacy = {
  heading: 'Your file never leaves your device',
  body: [
    'Your document is read in your browser and stored in your browser. It is never uploaded to a database or tracked. No cookie banner either, because we set no cookies.',
  ],
  caveatLabel: 'One honest caveat',
  caveat:
    'To write your questions, the model has to read the relevant text. That portion is sent with the request, used to answer it, and then discarded. It is never stored and never logged. Your cards, results, and progress stay on your device and are never sent anywhere.',
  stays: ['Documents and extracted text', 'Flashcards and schedules', 'Quiz and exam results', 'Progress and review history'],
  staysLabel: 'Stays on your device',
} as const;

export const cost = {
  heading: 'Free means free',
  body: 'No subscription, no trial, no locked features, no ads. This is not an introductory offer that expires in six months. The whole thing was built around costing nothing to run, which is why it can stay free.',
  tableCaption: 'Every service in the stack, and what it costs',
  columns: ['What it does', 'Service', 'Free tier', 'Cost'],
  rows: [
    ['Hosting', 'Cloudflare Pages', 'Unlimited bandwidth, 500 builds a month', '$0'],
    ['AI proxy', 'Cloudflare Functions', 'About 100,000 requests a day', '$0'],
    ['Quota counters', 'Workers KV', 'Free daily read and write allowance', '$0'],
    ['Generation', 'Google Gemini', 'Free tier, no card required', '$0'],
    ['Code and CI', 'GitHub', 'Free for public repositories', '$0'],
    ['Your data', 'Your own browser', 'Whatever your disk allows', '$0'],
  ],
  total: '$0 a month. That is the whole bill.',
  footnote:
    'When the shared daily allowance runs out we tell you when it resets and offer you a free key of your own. We never ask for a card, because there is nothing to charge you for.',
} as const;

export const openSource = {
  heading: 'Take it and run your own',
  body: [
    'The planning is public, not just the code. Forty-odd documents covering what gets built, how, and why. If you disagree with a decision, the reasoning is written down and you can argue with it.',
    'Setting up your own copy takes about twenty minutes and costs nothing. Do it if you want your own quota, if your school wants its own instance, or if you want to change how the questions are written.',
  ],
  primaryCta: 'Read the source',
  secondaryCta: 'Self-hosting guide',
} as const;

export const closing = {
  heading: 'Bring a file',
  body: 'Sign in with Google, nothing to install, nothing to pay. Pick something you have an exam on.',
  cta: 'Choose a file',
  footnote:
    'Built so that students who cannot pay for study tools do not have to go without them.',
} as const;

export const nav = {
  skipToContent: 'Skip to content',
  brand: 'ScholarForge AI',
  links: [
    { label: 'How it works', href: '#how-it-works' },
    { label: 'What you get', href: '#what-you-get' },
    { label: 'What it costs', href: '#cost' },
  ],
  openApp: 'Open the app',
} as const;
