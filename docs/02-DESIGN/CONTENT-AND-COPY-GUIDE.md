# Content and Copy Guide

Purpose: how the product talks. Every user-facing string, and the rules behind them.
Last updated: 2026-07-31

Copy is part of the product, not decoration applied afterwards. The user is a stressed student close to a deadline, and the words either help them or add to the load.

All strings live in `src/copy/`. None are hardcoded in components. See [PROJECT-STRUCTURE.md](../03-ARCHITECTURE/PROJECT-STRUCTURE.md).

## Voice

**Like a competent friend who has done this before.** Calm, direct, and on the user's side. Not a brand. Not a mascot. Not a productivity coach.

| We are | We are not |
|---|---|
| Plain | Formal |
| Brief | Terse |
| Warm | Cutesy |
| Honest | Apologetic |
| Encouraging | Motivational |

The distinction between encouraging and motivational matters. "You got 7 of 10. The three you missed are now flashcards." is encouraging, because it tells you what happened and what comes next. "Amazing effort! You're crushing it! 🎉" is motivational, and it is exhausting.

## Rules

### 1. Short words

| Not this | This |
|---|---|
| utilise | use |
| commence | start |
| terminate | stop |
| approximately | about |
| additional | more |
| in order to | to |
| at this time | now |
| prior to | before |
| subsequently | then |

### 2. Say what happened, then what to do

Every message that reports a problem has two parts: what occurred, and the next step. A message with only the first half is incomplete.

> This PDF is a scan, so there is no text for us to read.
> Try a version you can select text in, or a different export.

### 3. Never blame the user

| Not this | This |
|---|---|
| Invalid file | We cannot read this kind of file yet |
| You entered an incorrect value | That needs to be a number between 5 and 50 |
| Upload failed | Something went wrong reading that file |
| Unsupported format | We support PDF, PowerPoint, Word, EPUB, and text files |

The file is not invalid. It is a kind we do not handle. That is our limitation, and the wording should reflect it.

### 4. No internals, ever

Never shown to a user: stack traces, HTTP status codes, library error strings, the words `null`, `undefined`, `exception`, `error code`, or any identifier.

| Not this | This |
|---|---|
| Error 429: Too Many Requests | Today's free AI usage has run out |
| TypeError: cannot read property 'text' of undefined | Something went wrong. Reloading usually fixes it. |
| IndexedDB quota exceeded | Your browser is running out of space for this app |

### 5. No hype

Banned words: revolutionary, seamless, effortless, unleash, supercharge, game-changing, cutting-edge, powerful, robust, leverage, empower, journey.

Also banned: exclamation marks in error messages, and emoji anywhere in the interface. A student who cannot get their file to load does not want a cheerful emoji.

### 6. Numbers concretely

| Not this | This |
|---|---|
| File too large | That file is 82 MB. The limit is 50 MB. |
| Almost out of space | About 90% of your storage is used |
| Please wait | Reading page 40 of 180 |
| Quota exceeded | Resets at midnight Pacific, about 7 hours from now |

### 7. Second person, active voice

"Your file stays on your device", not "files are retained locally".

### 8. Sentence case everywhere

Headings, buttons, labels. Not Title Case, and never ALL CAPS.

### 9. Buttons are verbs

| Not this | This |
|---|---|
| Submit | Check my answer |
| OK | Got it |
| Continue | Start the quiz |
| Confirm | Delete everything |

A button labelled with the action it performs prevents the "wait, what does OK do here" pause.

### 10. Never mention money

There is no paid tier and there never will be. Banned: upgrade, premium, pro, subscribe, free trial, unlock, limited plan.

When the shared quota runs out, the alternative offered is a free key, not a purchase.

## Strings

### Landing

| Element | Copy |
|---|---|
| Headline | Turn your notes into practice |
| Subhead | Upload a PDF, slides, or a book. Get quizzes, flashcards, explanations, and a practice exam. |
| Drop zone | Drop a file here, or tap to choose one |
| Formats | PDF, PowerPoint, Word, EPUB, text |
| Reassurance | Your file stays on your device. We never upload it. |
| Cost note | Free. Sign in with Google. |

The reassurance line sits directly under the drop zone, not in a footer, because that is where scepticism arises.

### Parsing progress

| Stage | Copy |
|---|---|
| Reading | Reading your file |
| Extracting | Reading page {n} of {total} |
| Checking | Checking the text |
| Cleaning | Tidying up |
| Structure | Finding the topics |
| Finishing | Almost ready |

### Upload errors

**Scanned PDF**
> This PDF is a scan, so there is no text in it for us to read, only pictures of text.
>
> Try a version where you can select the text with your cursor, or ask whoever sent it for a different export.

**Password-protected**
> This PDF is locked with a password.
>
> Open it in a PDF reader, save an unlocked copy, and upload that.

**Too large**
> That file is {size}. The largest we can handle is 50 MB.
>
> If it is a long book, try uploading a chapter or a page range instead.

**Legacy format**
> `.doc` and `.ppt` are older formats we cannot read.
>
> Open the file and save it as `.docx` or `.pptx`, then upload that.

**Unsupported**
> We cannot read {extension} files yet.
>
> We support PDF, PowerPoint (.pptx), Word (.docx), EPUB, and text files.

**Corrupt**
> Something went wrong reading that file. It may be damaged.
>
> Try downloading or exporting it again.

**Out of memory**
> That file is too big for this device to handle all at once.
>
> Try uploading a page range instead.

**Empty result**
> We read the file but did not find any text in it.
>
> If it is mostly images or diagrams, there may be nothing for us to work from.

### Generation

| Element | Copy |
|---|---|
| Working | Writing your questions |
| Working, cards | Making your flashcards |
| Working, exam | Building your exam |
| Cancel | Stop |
| Cancelled with partial | Stopped. We kept the {n} questions that were already done. |
| Some items dropped | We made {n} questions. {m} were left out because we could not confirm which page they came from. |

That last one is unusual and deliberate. Silently returning eight questions when ten were asked for looks like a bug. Explaining why builds trust in the grounding rule.

### Quota exhausted

> Today's free AI usage has run out.
>
> It resets at {time}, about {duration} from now. Everything you have already made still works, including offline.
>
> Everything you have already made still works, including offline.

No "upgrade". No payment. A real alternative and an honest reset time.

### (Removed) Bring your own key

This screen no longer exists — see [ADR-0014](../08-DECISIONS/ADR-0014-REMOVE-BRING-YOUR-OWN-KEY.md).


### Quiz

| Element | Copy |
|---|---|
| Config heading | What kind of quiz? |
| Count | How many questions |
| Difficulty | How hard |
| Easy | Recall — can you remember it |
| Medium | Understanding — can you explain it |
| Hard | Applying — can you use it |
| Scope | What to cover |
| Whole doc | Everything |
| Start | Start the quiz |
| Progress | Question {n} of {total} |
| Check | Check my answer |
| Correct | Correct |
| Incorrect | Not quite |
| Correct answer | The answer is: {answer} |
| Source | From page {n} |
| Show source | Show me where |
| Flag | This question looks wrong |
| Flagged | Thanks. We have left it out of your score. |
| Next | Next question |
| Finish | See my results |

"Not quite" rather than "Wrong" or "Incorrect". Same information, less sting, and it does not pretend the answer was right.

### Quiz results

| Element | Copy |
|---|---|
| Score | You got {correct} of {total} |
| Time | {duration} |
| Breakdown | How you did by topic |
| Strong | Solid: {topics} |
| Weak | Worth another look: {topics} |
| Retry missed | Retry the {n} I missed |
| Make cards | Turn the ones I missed into flashcards |

No grade letters, no percentage badges, no congratulation. The raw numbers and two useful next actions.

### Flashcards

| Element | Copy |
|---|---|
| Flip | Show the answer |
| Rating prompt | How did that go? |
| Again | Again |
| Hard | Hard |
| Good | Good |
| Easy | Easy |
| Interval hint | Back in {duration} |
| Read aloud | Read this out loud |
| Session done | Done for now. {n} cards reviewed. |
| Nothing due | Nothing due today. Either you are ahead, or you have not started yet. |
| Leech | You have missed this one {n} times. Want to reword it? |

The leech message suggests the card may be badly written rather than implying the user is failing. Usually that is true: compound or ambiguous cards are what produce leeches.

### Streak

| Element | Copy |
|---|---|
| Active | {n} day streak |
| Grace used | Streak kept. Everyone misses a day. |
| Broken | Streak reset. Starting again today. |

No guilt, no warning notifications, no red. A broken streak is a fact, not a failure.

### Explanations

| Element | Copy |
|---|---|
| Trigger | Explain this |
| Simple | Simple — like I know nothing |
| Normal | Normal — I half get it |
| Deep | Deep — I have an exam on this |
| Sources | Based on pages {pages} |
| Not covered | This document does not seem to explain {concept}. |
| Nearby | It does cover {topics}, which may be related. |

### Ask your document

| Element | Copy |
|---|---|
| Placeholder | Ask anything about this document |
| Thinking | Looking through your document |
| Citation | p. {n} |
| Not found | I could not find that in this document. |
| Save as card | Save this as a flashcard |

Note the shift to first person for the not-found case. In a conversation, "I could not find that" reads naturally where "we" would not.

### Exam

| Element | Copy |
|---|---|
| Heading | Build a practice exam |
| Time limit | Time limit (optional) |
| Marks | Marks per question (optional) |
| Generate | Build my exam |
| Preview | Preview |
| Answer key | Answer key |
| Print | Print |
| Take it | Take it now |
| Time left | {duration} left |
| Time up | Time is up. Submitting what you have. |
| Submit | Submit my exam |

### Offline

| Element | Copy |
|---|---|
| Banner | You are offline. Cards, saved quizzes, and exams all still work. |
| Disabled action | Needs a connection |
| Back online | Back online |

Names what works first. The connection is already gone; listing losses is not helpful.

### Storage

| Element | Copy |
|---|---|
| 80% warning | This app is using about {pct}% of the space your browser allows. |
| 80% action | Free up space |
| 95% blocked | There is not enough space to add another document. |
| First run | Everything is saved in this browser only, tied to your device rather than your account. If you clear your browser data it will be gone. You can export a backup any time, or sign in and sync to protect against that. |
| Export nudge | You have done a fair bit of work. Want to save a backup file? |
| Private browsing | You are in a private window, so nothing will be saved once you close it. |

### Delete everything

| Element | Copy |
|---|---|
| Label | Delete everything |
| Confirm heading | Delete everything? |
| Confirm body | This removes every document, deck, quiz, and all your progress from this browser. It cannot be undone. |
| Suggestion | Export a backup first |
| Confirm | Yes, delete it all |
| Cancel | Keep my data |

The cancel button says what keeping means. "Cancel" next to a destructive action is ambiguous under stress.

### Empty states

| Screen | Copy |
|---|---|
| Library | Nothing here yet. Upload something and we will make study material from it. |
| Flashcards | No cards yet. Upload a document and we will make some. |
| Due today | Nothing due today. Either you are ahead, or you have not started yet. |
| Dashboard | Take a quiz and this will fill in. |
| Exams | No exams yet. |
| Chat | Ask anything about this document. |

No fake sample data, no illustrations of charts that do not exist. Every empty state contains the action that fills it.

### Install

| Element | Copy |
|---|---|
| Prompt | Add ScholarForge to your home screen so it opens like an app and works offline. |
| Install | Add it |
| Dismiss | No thanks |
| iOS | Tap the Share button, then Add to Home Screen. |

### Generic failure

> Something went wrong.
>
> Reloading usually fixes it. If it keeps happening, [tell us what you were doing] and we will look into it.

The report link opens a pre-filled GitHub issue. Nothing is sent automatically.

## Dates and durations

Via `Intl`, in the user's locale and time zone.

| Context | Format |
|---|---|
| Quota reset | "midnight Pacific, about 7 hours from now" |
| Card interval | "in 3 days", "in 2 weeks", "tomorrow" |
| Last studied | "yesterday", "3 days ago", "last month" |
| Duration | "4 min", "1 hr 12 min" |

Relative time for anything recent, since "3 days ago" is easier to process than a date.

## Accessibility in copy

- Link text describes its destination. Never "click here" or "read more".
- Buttons and icon-only controls have accessible names.
- Errors are announced to assistive technology, not only shown visually.
- No instruction depends on colour: never "the red items", always "the items marked as missed".
- No instruction depends on position: never "the button below", since layout reflows.

See [ACCESSIBILITY.md](ACCESSIBILITY.md).

## Reviewing copy

Copy changes are reviewed like code. When adding a string, check it against this list:

1. Would a stressed nineteen-year-old understand it immediately?
2. Does it say what happened and what to do next?
3. Does it avoid blaming the user?
4. Is it free of internals?
5. Is it free of hype and banned words?
6. Are numbers concrete?
7. Does it avoid implying payment?
8. Is it sentence case?
9. If it is a button, is it a verb?
