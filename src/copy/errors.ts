/*
 * Every message has two parts: what happened, and the next step. A message with only the
 * first half is incomplete. Never blame the user, never show internals.
 */

export interface UserMessage {
  what: string;
  next: string;
}

export const upload = {
  scannedPdf: {
    what: 'This PDF is a scan, so there is no text in it for us to read, only pictures of text.',
    next: 'Try a version where you can select the text with your cursor, or ask whoever sent it for a different export.',
  },
  passwordProtected: {
    what: 'This PDF is locked with a password.',
    next: 'Open it in a PDF reader, save an unlocked copy, and upload that.',
  },
  tooLarge: (size: string): UserMessage => ({
    what: `That file is ${size}. The largest we can handle is 50 MB.`,
    next: 'If it is a long book, try uploading a chapter or a page range instead.',
  }),
  legacyFormat: {
    what: '.doc and .ppt are older formats we cannot read.',
    next: 'Open the file and save it as .docx or .pptx, then upload that.',
  },
  unsupported: (extension: string): UserMessage => ({
    what: `We cannot read ${extension} files yet.`,
    next: 'We support PDF, PowerPoint (.pptx), Word (.docx), EPUB, and text files.',
  }),
  corrupt: {
    what: 'Something went wrong reading that file. It may be damaged.',
    next: 'Try downloading or exporting it again.',
  },
  outOfMemory: {
    what: 'That file is too big for this device to handle all at once.',
    next: 'Try uploading a page range instead.',
  },
  emptyResult: {
    what: 'We read the file but did not find any text in it.',
    next: 'If it is mostly images or diagrams, there may be nothing for us to work from.',
  },
} as const;

export const quota = {
  heading: "Today's free AI usage has run out.",
  body: (resetTime: string, duration: string) =>
    `It resets at ${resetTime}, about ${duration} from now. Everything you have already made still works, including offline.`,
  wait: 'It resets tomorrow. Everything you have already made still works, including offline.',
} as const;

/* Shown before the wall, not after — a warning while requests are still succeeding. */
export const quotaWarning = {
  message: (remaining: number) =>
    remaining <= 0
      ? 'That was the last free generation for today.'
      : remaining === 1
        ? 'You have 1 free generation left today.'
        : `You have ${remaining} free generations left today.`,
} as const;

export const generic = {
  what: 'Something went wrong.',
  next: 'Reloading usually fixes it. If it keeps happening, tell us what you were doing and we will look into it.',
  reportLink: 'tell us what you were doing',
  retry: 'Try again',
} as const;

export const offline = {
  what: 'You are offline, so we cannot make anything new right now.',
  next: 'Your cards, saved quizzes, and exams all still work.',
} as const;
