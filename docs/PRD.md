# Product Requirements

What ScholarForge AI is, who it is for, and the testable criteria a feature has to meet.

## In one sentence

ScholarForge AI turns whatever you already have to study from into practice you can actually do.

## The problem

You have a 200-page PDF and an exam on Thursday. Reading it again will not help. What helps is
being asked questions, finding out what you do not know, and drilling that.

Students already have the material. What they lack is a way to convert it into practice.

| The gap                                                              | What happens today                                                                       |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Re-reading feels productive but does not build recall                | Students highlight for hours and still blank in the exam                                 |
| Making your own flashcards works, but takes longer than the studying | Most people give up on card-making by week two                                           |
| Good study tools exist but cost money                                | A subscription is a real barrier for a student, especially outside high-income countries |
| Free tools are limited on purpose                                    | Free tiers cap you at 10 cards, or lock exports, or paywall the useful part              |
| Tools assume a laptop                                                | Plenty of students study primarily on a phone                                            |

The pedagogy is not controversial. Retrieval practice and spaced repetition are among the
best-evidenced learning techniques there are. The problem has never been that students do not know
this — it is that doing it by hand is tedious, and the tools that automate it charge rent.

## The goal

**Primary.** A student goes from "I have a file" to "I am being quizzed on it" in under two
minutes, on a phone, after a Google sign-in, without paying anything.

**Secondary.** What the AI produces is grounded in the uploaded document and cites where it came
from, so a student can trust it and check it. Progress is visible. Anyone can fork the project and
run their own copy. Nothing a student uploads leaves their device unless it has to.

## What "free" means, precisely

A hard constraint, not an aspiration. **$0 for the user** — no subscription, trial, credit card,
paywall, or ads. **$0 for the maintainer** — hosting, build, storage, and AI calls all fit inside
permanent free tiers, not expiring trial credits. **$0 to fork.**

The one thing not promised is unlimited AI generation. A shared free API key has a real daily
ceiling. When it runs out the app says so plainly and states when it resets. It never silently
fails and never asks for money.

## Guiding principles

1. **It has to work in the ninety seconds before someone gives up.** No onboarding tour, no empty
   dashboard. Sign-in is the one required step; everything past it is upload, then results.
2. **Words are part of the product.** "Processing failed: unable to extract text layer" is a bad
   sentence. Copy is reviewed like code.
3. **Never invent facts.** Every question, answer, and explanation comes from the uploaded document
   and points back to its page. A study tool that hallucinates is worse than no tool, because the
   student memorises the wrong thing and finds out in the exam.
4. **Your files are yours.** Parsed in the browser, stored in the browser. Only the text needed to
   answer a specific request reaches a server, and the interface says so.
5. **Phone first.** Designed for a thumb on a small screen, then allowed to expand.
6. **Boring technology.** Fewest dependencies that do the job. A student contributor should be able
   to read a file and understand it.
7. **Small files, clear seams.** A large file is a signal it is doing too much.

## Who it is for

A student studying alone, under time pressure, on their own device — often a mid-range phone on
slow or metered data, often late at night, often close to a deadline.

Teachers generating practice exams are a real and welcome secondary audience, served by the same
exam generator. There is no separate teacher mode.

**Not for:** anyone wanting a tutor, a homework-answering service, a note-taking app, a cheating
tool, or a social network.

## Features

| Feature           | What you get                                                                      |
| ----------------- | --------------------------------------------------------------------------------- |
| Upload            | PDF, PowerPoint, Word, EPUB, plain text or Markdown                               |
| Quizzes           | MCQ, true/false, short answer, fill-in-the-blank, instant feedback, page citation |
| Flashcards        | Auto-generated, editable, swipeable                                               |
| Explanations      | Any concept at three depths                                                       |
| Exam generator    | A full practice exam plus a separate answer key, printable                        |
| Spaced repetition | Cards return on an FSRS schedule based on what you forget                         |
| Ask your document | Chat with the file; answers cite page numbers                                     |
| Weak spots        | Which topics you keep failing and what to review next                             |
| Export            | Anki and Quizlet CSV, printable PDF, full JSON archive                            |

## Requirements

Identifiers are stable. Reference them in commits, issues, and tests. Each criterion is something
you can actually check; anything not checkable has been rewritten until it is.

### Epic A — Getting material in

**A1. Upload a document.** Drag-and-drop and tap-to-browse both work; on a phone the native picker
opens. Accepted: `.pdf`, `.pptx`, `.docx`, `.epub`, `.txt`, `.md`. Progress shown with named
stages, not an indeterminate spinner. The interface stays responsive because parsing runs in a
worker. On success the document appears in the library with its title and page count. A visible
statement confirms the file did not leave the device. **No network request carrying file contents
is made during upload or parsing.**

**A2. Be told clearly when a file will not work.** A scanned PDF is detected and refused with a
message explaining it is images rather than text. A password-protected PDF is refused with an
explanation. An oversized file is refused before parsing, naming its actual size and the limit. An
unsupported format is refused, listing the formats that do work. Every failure message names a next
step. No message shows a stack trace, an error code, or the words "failed" or "invalid" alone.

**A3. Combine several files into one study set.** Up to 10 documents per set. Citations remain
traceable to the correct source file and page. Sets can be renamed and deleted, with deletion
asking for confirmation and stating what will be lost.

### Epic B — Practising

**B1. Generate a quiz.** Count selectable as 5, 10, 20, or custom up to 50. Difficulty Easy /
Medium / Hard. Topic scope from the detected outline, defaulting to the whole document. Types
selectable across MCQ, true/false, short answer, fill-in-the-blank. **Every returned question
carries a source page number; questions without one never reach the user.** Correct-answer position
is randomised across a set. Generation is cancellable and cancelling keeps what was already
produced. Time to first question under 30 seconds for a 20-page document.

**B2. Take a quiz.** One question per screen, primary control in thumb reach. Progress as a
position out of a total. After answering: correctness, the correct answer, an explanation, and the
source page. A control opens the source passage. A control reports a bad question, excluding it
from scoring. Closing mid-quiz and returning restores the same position. Fully keyboard-operable
with visible focus.

**B3. See results and act on them.** Score, time taken, and accuracy per topic. One action retries
only the missed questions. One action converts missed questions into flashcards. Results stored
locally and shown in dashboard history.

**B4. Study flashcards.** Generated automatically including cloze cards. Tap or click flips; swipe
works on touch. Four-point rating per card. Cards editable, deletable, and creatable by hand.
Read-aloud per card. Keyboard: space flips, 1–4 rate.

**B5. Review on a schedule.** Each card has a next-due date computed by FSRS. The home screen shows
a count due today. A session serves due cards, defaulting to 20 with an option to continue. Ratings
change the next interval in the direction FSRS specifies. A streak counter tolerates one missed day
without resetting. Repeatedly failed cards are flagged as leeches.

### Epic C — Understanding

**C1. Get something explained.** Triggerable from selected text, from a topic in the outline, and
from a quiz answer. Three depths: Simple, Normal, Deep. Switching depth does not lose the previous
version. Source pages cited. If the document does not cover the topic, the response says so rather
than answering from general knowledge. Explanations are saveable and readable offline.

**C2. Ask questions about the document.** Chat scoped to a document or study set. Answers carry
inline page references that open the source passage. When the document lacks the answer, the reply
says so. History persists per document. Any answer converts to a flashcard in one action. **No
embedding API is called at any point.**

### Epic D — Exams

**D1. Generate a practice exam.** Question count, type mix, difficulty distribution, and topic
coverage all configurable. Optional time limit and marks per question. Output includes an exam and
a separate answer key, with key entries carrying a rationale and a source page.

**D2. Take or print the exam.** In-app taking shows a countdown when a limit is set and scores on
submission. Print output contains no navigation or interface chrome and is legible in light colours
regardless of dark mode. The answer key begins on a new page. Page breaks never split a question
from its options.

### Epic E — Progress

**E1. See where I am weak.** Accuracy per topic computed from stored quiz and card history. A
ranked list recommends what to review next. An accuracy trend charted over time. A single action
generates a quiz weighted towards the weakest topics. **All computation is local; no analytics
request leaves the device.**

### Epic F — Keeping and moving data

**F1. Export.** Flashcards to CSV that imports cleanly into Anki and Quizlet. A study pack as one
`.json`. A full archive of all local data as `.json`. Exports work offline.

**F2. Import.** Study packs and full archives import successfully. A malformed or mismatched file
is rejected with a clear explanation and no partial write. Import never overwrites existing data
without asking — it merges by id.

**F3. Delete everything.** One clearly labelled control removes all local data. Confirmation states
exactly what will be lost and that it cannot be undone. After deletion the app returns to its
first-run state.

### Epic G — Availability and limits

**G1. Work offline.** After a first successful load the app opens with no connection. Card review,
saved quizzes, saved explanations, and saved exams all work offline. An offline indicator names
what is currently unavailable. Actions requiring AI are disabled with an explanation, not left to
fail.

**G2. Handle an exhausted quota gracefully.** The message says so plainly and states when it
resets. No alternative is offered, because there is none. Nothing already stored becomes
unavailable. The word "upgrade" appears nowhere and no payment is ever suggested.

**G3. Install to the home screen.** Installed, the app opens full screen with its own icon.

### Epic H — Account and sync

Added after the original scope; see the reversal note below.

**H1. Sign in.** Every `/app` route requires Google sign-in. The session persists across visits.
Sign-out returns to the marketing page.

**H2. Sync study data on demand.** A signed-in user can push their full library to their own cloud
document and pull it on another device. Nothing study-related is uploaded without an explicit
action. Restoring merges rather than replacing, so it never destroys local work.

**H3. Sync preferences automatically.** Display preferences and the study streak follow the account
across devices without a button, propagating live. No study content travels with them. Changes made
offline queue and flush on reconnect.

## Non-functional requirements

| Requirement                         | Target                                                 | Verified by                               |
| ----------------------------------- | ------------------------------------------------------ | ----------------------------------------- |
| First contentful paint              | Under 1.5s on 4G                                       | Lighthouse, manually                      |
| Initial JavaScript bundle           | Under 300 KB gzipped, excluding lazy parsers           | CI build check                            |
| Parse a 100-page PDF                | Under 10s on a mid-range Android                       | Manual test on real hardware              |
| Interface responsive during parsing | No frame longer than 50ms on the main thread           | Performance profile                       |
| Accessibility violations            | Zero `axe-core` violations, every route, two viewports | CI                                        |
| Contrast                            | WCAG 2.2 AA throughout                                 | Automated axe check plus manual review    |
| Keyboard operation                  | Every feature reachable and operable                   | Manual test                               |
| Cost to run                         | $0                                                     | Every dependency on a permanent free tier |

## Out of scope

Scope discipline is the main thing standing between this project and never shipping. Each item
below was considered and rejected on purpose.

**Teacher and classroom mode.** Class rosters, assigning work, collecting submissions, grade books.
A second product with a second set of users, a second permission model, and a hard requirement for
server storage. A teacher is well served by the exam generator and print export.

**Native mobile apps in the stores.** A Play Store account is a one-time fee and an Apple Developer
account an annual one; both break the zero-cost constraint outright. An installable PWA gives a
home-screen icon, offline use, and a full-screen feel for nothing.

**Multiple languages.** English only, interface and generated output. Translation infrastructure
plus ongoing upkeep is real work with no payoff until an audience asks. Strings are centralised in
`src/copy/`, so adding i18n later is contained rather than a rewrite.

**Scanned documents and OCR.** Client-side OCR means a large extra library, slow and unreliable on
the mid-range phones we target. A scanned PDF is detected and refused with a clear message rather
than half-processed into garbage. Revisit if that message becomes a common complaint.

**A paid tier.** There is none, and there never will be. This is why the quota ceiling is a hard
wall rather than an upsell.

### A reversal worth recording

Accounts and cross-device sync were originally out of scope, on the reasoning that an account wall
is the biggest reason a student closes the tab, and that local-first storage delivers the whole
product without making us the custodian of personal data.

Both were subsequently built. Sign-in is now mandatory for every `/app` route, study data syncs on
demand, and preferences sync automatically. The original concern was not wrong — it was
outweighed. The mitigation is that study data still never leaves the device without an explicit
action, and what syncs automatically carries no study content.

## Open questions

**Stemming in BM25.** Would let "mitochondria" match "mitochondrial", but introduces a class of
confusing mismatch. Settled by whether retrieval quality generates complaints.

**Share-target registration.** A PWA can register as a share target, so a user could share a PDF
straight from another app. A genuinely nice entry point. Settled by checking current browser
support, particularly iOS.

**High-contrast theme.** A candidate beyond AA, for users who need more than the standard requires.

**Warning before the quota wall.** No `quotaRemaining` value exists in any response, so the
interface cannot warn a user before they hit zero. Needs an API change to fix.

Settled and recorded so they are not relitigated: charts are hand-written SVG rather than a library
(the whole dashboard chunk lands at 1.6 KB gzipped, against tens of kilobytes before drawing
anything), and the trend chart carries `role="img"` with the same figures repeated as a text list
beneath it, because a line is not readable by everyone.
