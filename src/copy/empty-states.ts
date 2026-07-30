/* No fake sample data. Every empty state contains the action that fills it. */

export const emptyStates = {
  library: {
    body: 'Nothing here yet. Upload something and we will make study material from it.',
    action: 'Choose a file',
  },
  flashcards: {
    body: 'No cards yet. Upload a document and we will make some.',
    action: 'Go to the library',
  },
  dueToday: {
    body: 'Nothing due today. Either you are ahead, or you have not started yet.',
    action: 'Browse my cards',
  },
  dashboard: {
    body: 'Take a quiz and this will fill in.',
    action: 'Go to the library',
  },
  exams: {
    body: 'No exams yet.',
    action: 'Build a practice exam',
  },
  chat: {
    body: 'Ask anything about this document.',
    action: '',
  },
} as const;
