# Project Overview

Purpose: what ScholarForge AI is, the problem it solves, and the principles that govern every decision.
Last updated: 2026-07-31

## In one sentence

ScholarForge AI turns whatever you already have to study from into practice you can actually do.

## The pitch

You have a 200-page PDF and an exam on Thursday. Reading it again will not help. What helps is being asked questions, finding out what you do not know, and drilling that.

Upload the file. ScholarForge AI reads it and gives you a quiz, a set of flashcards, an explanation of anything confusing, and a full practice exam with an answer key. It remembers what you keep getting wrong and brings it back until you stop getting it wrong.

Free. Sign in with Google. Works on your phone. Open source.

## The problem

Students already have the material. What they lack is a way to convert it into practice.

| The gap | What happens today |
|---|---|
| Re-reading feels productive but does not build recall | Students highlight for hours and still blank in the exam |
| Making your own flashcards works, but takes longer than the studying | Most people give up on card-making by week two |
| Good study tools exist but cost money | A subscription is a real barrier for a student, especially outside high-income countries |
| Free tools are limited on purpose | Free tiers cap you at 10 cards, or lock exports, or paywall the useful part |
| Tools assume a laptop | Plenty of students study primarily on a phone |

The pedagogy here is not controversial. Retrieval practice (testing yourself) and spaced repetition (revisiting at increasing intervals) are among the best-evidenced learning techniques there are. The problem has never been that students do not know this. The problem is that doing it by hand is tedious, and the tools that automate it charge rent.

## The goal

Remove the cost and the tedium at the same time.

**Primary goal.** A student can go from "I have a file" to "I am being quizzed on it" in under two minutes, on a phone, after a quick Google sign-in and without paying anything.

**Secondary goals**
- What the AI produces is grounded in the uploaded document, and cites where it came from, so a student can trust it and check it.
- Progress is visible, so studying feels like it is going somewhere.
- Anyone can fork the project and run their own copy for their school or class.
- Nothing a student uploads ever leaves their device unless it has to.

## What "free" means here, precisely

Free is a hard constraint, not an aspiration. It means:

- **$0 for the user.** No subscription, no trial, no credit card, no feature paywall, no ads.
- **$0 for the maintainer.** Hosting, build pipeline, storage, and AI calls all fit inside permanent free tiers, not trial credits that expire.
- **$0 to fork.** Anyone can stand up their own instance without paying for anything.

Every service we depend on is listed in [ZERO-COST-INFRASTRUCTURE.md](../04-OPERATIONS/ZERO-COST-INFRASTRUCTURE.md) with its specific limit and what degrades when that limit is reached. If a dependency cannot be justified at $0, it does not go in.

The one thing we do not promise is unlimited AI generation. A shared free API key has a real daily ceiling. When it runs out, the app says so plainly and offers the user the option of supplying their own free key. It never silently fails and never asks for money.

## Guiding principles

**1. It has to work in the ninety seconds before someone gives up.**
No onboarding tour, no empty dashboard. Sign-in is the one required step ([ADR-0011](../08-DECISIONS/ADR-0011-MANDATORY-GOOGLE-SIGN-IN.md)) and persists after; everything past it is upload, then results. Every screen we put between the file and the first question is a screen where we lose someone.

**2. Words are part of the product.**
This is a tool for stressed people. "Processing failed: unable to extract text layer" is a bad sentence. "This PDF looks like a scan, so there is no text for us to read. Try a different file?" is a good one. Copy is specified in [CONTENT-AND-COPY-GUIDE.md](../02-DESIGN/CONTENT-AND-COPY-GUIDE.md) and reviewed like code.

**3. Never invent facts.**
Every question, answer, and explanation comes from the uploaded document and points back to the page it came from. A study tool that hallucinates is worse than no tool, because the student memorizes the wrong thing and does not find out until the exam.

**4. Your files are yours.**
Documents are parsed in the browser and stored in the browser. We do not upload them, store them, or see them. The only thing that reaches a server is the text needed to answer the request being made, and we say so in the interface.

**5. Phone first.**
The layout is designed for a thumb on a small screen and then allowed to expand. Not the other way round.

**6. Boring technology.**
Fewest dependencies that do the job. No framework we cannot explain the need for. A student contributor should be able to read a file and understand it.

**7. Small files, clear seams.**
Each module does one thing and can be understood without reading its neighbours. When a file gets large, that is a signal it is doing too much. See [PROJECT-STRUCTURE.md](../03-ARCHITECTURE/PROJECT-STRUCTURE.md).

## What it does, briefly

| Feature | What you get |
|---|---|
| Upload | PDF, PowerPoint, Word, EPUB, plain text or Markdown |
| Quizzes | Multiple choice, true/false, short answer, fill-in-the-blank, with instant feedback and a page citation |
| Flashcards | Auto-generated, editable, swipeable |
| Explanations | Any concept explained at three depths, from simple to thorough |
| Exam generator | A full practice exam plus a separate answer key, printable |
| Spaced repetition | Cards come back on a schedule based on what you forget |
| Ask your document | Chat with the file; answers cite page numbers |
| Weak spots | See which topics you keep failing and what to review next |
| Export | Anki and Quizlet CSV, printable PDF |

Full detail in [FEATURES-SPECIFICATION.md](FEATURES-SPECIFICATION.md).

## Who it is for

The primary user is a student studying alone, under time pressure, on their own device. Full personas in [TARGET-USERS-AND-PERSONAS.md](TARGET-USERS-AND-PERSONAS.md).

Teachers generating practice exams are a real and welcome secondary audience, served by the same exam generator, but v1 does not build a separate teacher mode.

## What it is not

A tutor, a homework-answering service, a note-taking app, a cheating tool, or a social network. See [NON-GOALS-AND-SCOPE.md](NON-GOALS-AND-SCOPE.md).

## Licence and openness

Open source from the first commit. Every planning document lives in this repository so the reasoning is public, not just the code. See [CONTRIBUTING.md](../07-OPEN-SOURCE/CONTRIBUTING.md).
