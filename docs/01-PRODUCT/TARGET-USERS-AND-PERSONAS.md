# Target Users and Personas

Purpose: who we are building for, in enough detail to settle design arguments.
Last updated: 2026-07-31

When a design question comes up, the answer is whatever serves Maya. She is the primary persona and she wins ties.

## Primary persona — Maya, the student studying alone

**Situation.** Second-year university student. Exam in three days. Has a 180-page lecture PDF, four slide decks, and a textbook chapter. Has read all of it once and remembers almost none of it.

**Context of use.** On a phone, in bed, at 11pm. Sometimes on a laptop in a library. Frequently on unreliable wifi or mobile data she is rationing.

**What she wants.** To be asked questions. To find out fast what she does not know. To not waste any of the three days.

**What she will not do**
- Create an account before seeing whether the tool is any good
- Pay anything, or enter a card "for the free trial"
- Sit through an onboarding tour
- Read documentation
- Spend twenty minutes configuring settings
- Manually type out flashcards

**What makes her leave and never return**
- A signup wall on the landing page
- Waiting more than about thirty seconds with no sign of progress
- A generated question that is obviously wrong, with no way to check the source
- Anything that looks like it is about to ask for money
- A layout where the button she needs is off-screen or under her keyboard

**What earns her trust**
- Results appearing before she is asked for anything
- Every answer showing the page it came from, so she can verify it
- Being told plainly that her file stays on her device
- Being told plainly when something has failed, and what to do instead

**Design consequences**
- Google sign-in required app-wide ([ADR-0011](../08-DECISIONS/ADR-0011-MANDATORY-GOOGLE-SIGN-IN.md)); no separate signup form or email capture beyond that
- Upload is the first thing on the first screen
- Every generated item carries a source citation
- Progress feedback during any operation over two seconds
- The primary action is always within thumb reach on a phone
- Errors say what happened and what to try next, in ordinary words

## Secondary persona — Sam, the teacher making practice material

**Situation.** Secondary school or college instructor. Needs twenty practice questions on a topic by tomorrow morning, plus an answer key. Has the syllabus and the textbook chapter as files.

**Context of use.** Laptop, during a free period. Will print the result.

**What he wants.** Control over question count, type, and difficulty. A clean printable exam with a separate answer key. To not retype anything.

**Design consequences**
- The exam generator gets explicit controls for count, question mix, difficulty, and time limit
- Print output is a genuine deliverable, not an afterthought: clean typography, no interface furniture, answer key on its own page
- Export to Anki and Quizlet CSV, because he may already run one of those with his class

**What v1 does not build for Sam.** Classrooms, student rosters, assignment distribution, grade tracking, or a separate teacher mode. He uses the same tool Maya does. If teacher demand turns out to be real, that is a v2 conversation.

## Tertiary persona — Dev, the student contributor

**Situation.** Computer science student who wants a real open-source project on their CV, or who wants this tool to exist for their own course and is willing to help.

**What he needs.** To clone the repository and have it running in under ten minutes. To find a task sized for a first contribution. To understand a file without reading the whole codebase.

**Design consequences**
- One-command local setup, documented in [CONTRIBUTING.md](../07-OPEN-SOURCE/CONTRIBUTING.md)
- The app must run locally without any API key, in a mock mode, so a contributor can work on the interface without credentials
- Small focused files with clear boundaries, per [PROJECT-STRUCTURE.md](../03-ARCHITECTURE/PROJECT-STRUCTURE.md)
- Labelled good-first-issues
- Planning documents public, so the reasoning is inspectable

## Accessibility needs across all personas

These are requirements, not extras. Detail in [ACCESSIBILITY.md](../02-DESIGN/ACCESSIBILITY.md).

- **Screen reader users.** Full keyboard operation, correct semantics, announced state changes.
- **Low vision.** Text scales to 200% without breaking layout; contrast meets WCAG 2.2 AA.
- **Dyslexia.** Generous line height, no justified text, an optional wider-spacing reading mode, and read-aloud via the browser's built-in speech synthesis.
- **Motion sensitivity.** Everything respects `prefers-reduced-motion`.
- **ADHD.** Short default sessions, a visible finish line, an optional focus timer, minimal on-screen clutter.

## Environmental constraints we design against

| Constraint | Consequence |
|---|---|
| Mid-range Android phone, 4GB RAM | Parse large files in a worker; chunk the work; never block the main thread |
| Metered or slow mobile data | Small initial bundle; cache aggressively; work offline once loaded |
| Shared or public computer | No persistent login to leak; a clear "delete everything" control |
| Browser storage may be cleared without warning | Export to a portable file is a first-class feature, and we warn users that local data is local |
| Studying at 2am | Dark mode that is genuinely dark, and does not shout |

## Explicit non-users

We are not designing for these, and we will decline feature requests that only serve them:

- Anyone wanting answers to live homework or an exam in progress
- Institutions wanting analytics on individual students
- Users wanting a general-purpose chatbot unconnected to a document
- Anyone needing enterprise features: SSO, audit logs, admin consoles, compliance reporting
