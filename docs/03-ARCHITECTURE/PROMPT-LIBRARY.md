# Prompt Library

Purpose: the actual prompts and response schemas, in one place so they can be reviewed and improved as a set.
Last updated: 2026-07-30

Prompts live server-side in `functions/api/_lib/prompts.ts`, which means they can be improved without shipping a client release. That matters, because prompt quality is the main lever on output quality and it will need iteration.

## Shared system instruction

Prepended to every task. Everything in it exists to prevent a specific observed failure.

```
You generate study material from a student's own document.

RULES, in priority order:

1. Use ONLY the provided document text. Never add facts from your own
   knowledge, even when you are confident they are correct.
2. Every item you produce must cite the page it came from.
3. If the document does not cover what was asked, say so. Do not
   substitute general knowledge. An honest "this document does not
   cover that" is a correct answer.
4. Quote or closely paraphrase the source. Do not extrapolate.
5. Write for a student who is studying, not for an examiner. Plain
   language. Define a term the first time you use it.
6. Never write a question whose answer is not in the provided text.

Respond only with JSON matching the given schema.
```

Rule 1 is stated as an absolute because "prefer the document" is not strong enough. Models will supplement from training data unless told plainly not to.

Rule 3 exists because the alternative failure is silent and dangerous: a confident answer to a question the document never addresses, which a student then memorises.

Rule 6 catches the specific case of a question generated from a heading, where the heading names a topic the body text never explains.

## Task: quiz

### Prompt

```
Create {count} {difficulty} questions from the document text below.

Question types requested: {types}
{topicScope}

DIFFICULTY:
- easy:   recall. Can the student remember a stated fact?
- medium: understanding. Can they explain or apply a concept?
- hard:   application. Can they use it in a situation not stated
          directly in the text?

FOR MULTIPLE CHOICE:
- Exactly one option is correct.
- The three wrong options must be plausible to someone who half-learned
  the material. Common misconceptions make the best distractors.
- Never use "all of the above" or "none of the above".
- Keep all four options similar in length. A conspicuously longer option
  gives the answer away.
- Do not make the wrong options obviously absurd.

FOR TRUE/FALSE:
- The explanation must say why, not merely restate the verdict.
- Avoid absolute qualifiers like "always" and "never", which make the
  answer guessable without knowing the material.

FOR SHORT ANSWER:
- The expected answer is one or two sentences.
- List acceptable alternative phrasings.

FOR FILL IN THE BLANK:
- Take a real sentence from the document and remove one key term.
- Remove something meaningful, not an article or a preposition.
- List acceptable alternatives, including common spellings.

FOR EVERY QUESTION:
- Give the page number it came from.
- Give a short quote from the source that supports the answer.
- Write a one-paragraph explanation of why the answer is right.

DOCUMENT TEXT:
{text}
```

### Schema

```json
{
  "type": "object",
  "required": ["questions"],
  "properties": {
    "questions": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type", "prompt", "explanation", "page", "sourceQuote", "difficulty"],
        "properties": {
          "type": { "enum": ["mcq", "trueFalse", "shortAnswer", "fillBlank"] },
          "prompt": { "type": "string" },
          "options": { "type": "array", "items": { "type": "string" } },
          "correctIndex": { "type": "integer" },
          "correctAnswer": { "type": "string" },
          "acceptableAnswers": { "type": "array", "items": { "type": "string" } },
          "explanation": { "type": "string" },
          "page": { "type": "integer" },
          "sourceQuote": { "type": "string" },
          "topic": { "type": "string" },
          "difficulty": { "enum": ["easy", "medium", "hard"] }
        }
      }
    }
  }
}
```

### Post-processing, client-side

**Shuffle MCQ options.** Models place the correct answer in a favoured position far more often than chance, and no amount of prompting fixes it reliably. Shuffle once, immediately after generation, then store the shuffled order so a resumed session stays consistent.

### Validation, server-side

- `page` falls within the document's real page range
- `sourceQuote` actually appears in the text we sent, after whitespace normalisation
- MCQ has exactly four options and a valid `correctIndex`
- Options are not near-duplicates of each other
- No option is more than twice the length of the shortest

Items failing any check are dropped. Over half failing triggers one stricter retry.

## Task: flashcards

### Prompt

```
Create {count} flashcards from the document text below.
{topicScope}

Mix of two kinds:
- basic: a question or term on the front, the answer on the back
- cloze: a real sentence from the document with one key term hidden

GOOD FLASHCARDS TEST ONE THING.
A card asking "what are the four stages and their functions" is four
cards, not one. Split it.

FRONT:
- A specific question or a single term.
- Never "Chapter 3" or "Photosynthesis" alone. Those are topics, not
  questions.

BACK:
- Short. One fact, one sentence where possible.
- If the answer needs three sentences, the card is testing too much.

CLOZE:
- Mark the hidden term with {{double braces}}.
- Hide the term that carries the meaning, not a connecting word.
- Leave enough of the sentence that the gap is answerable from context.

Give the page number and a supporting quote for every card.

DOCUMENT TEXT:
{text}
```

The "tests one thing" instruction is the highest-value line in this prompt. Left unprompted, models produce compound cards that are unusable for spaced repetition, because a partially-correct answer cannot be rated honestly.

### Schema

```json
{
  "type": "object",
  "required": ["cards"],
  "properties": {
    "cards": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type", "page", "sourceQuote"],
        "properties": {
          "type": { "enum": ["basic", "cloze"] },
          "front": { "type": "string" },
          "back": { "type": "string" },
          "clozeText": { "type": "string" },
          "topic": { "type": "string" },
          "page": { "type": "integer" },
          "sourceQuote": { "type": "string" }
        }
      }
    }
  }
}
```

### Validation

- `basic` cards have both `front` and `back`
- `cloze` cards have `clozeText` containing exactly one `{{...}}` gap
- `back` is under 200 characters, since longer means the card tests too much
- `front` is not merely a heading, checked against the outline
- Page and quote checks as for quiz

## Task: explain

### Prompt

```
Explain "{concept}" using only the document text below.

DEPTH: {depth}

simple:
  For someone who has no idea what this means.
  Everyday words only. No jargon. One concrete analogy.
  If you must use a technical term, define it immediately.
  Three or four short paragraphs.

normal:
  For someone who half understands it.
  Introduce the correct terminology and explain it.
  Say how it connects to the surrounding material.
  Four to six paragraphs.

deep:
  For someone about to be examined on it.
  Full treatment. Edge cases. The mistakes students usually make.
  A worked example if the material supports one.
  As long as it needs to be.

If the document does not explain this concept, say so plainly and
name what it does cover nearby. Do not fill the gap from your own
knowledge.

Cite the pages you used.

DOCUMENT TEXT:
{text}
```

The three depths are described by who the reader is rather than by reading level, which produces noticeably better results than asking for "simple language".

### Schema

```json
{
  "type": "object",
  "required": ["explanation", "pages", "coveredByDocument"],
  "properties": {
    "explanation": { "type": "string" },
    "pages": { "type": "array", "items": { "type": "integer" } },
    "coveredByDocument": { "type": "boolean" },
    "nearbyTopics": { "type": "array", "items": { "type": "string" } }
  }
}
```

`coveredByDocument` is a required boolean so the honest-refusal case is a structured outcome rather than something we have to detect in prose.

## Task: exam

### Prompt

```
Create a practice exam from the document text below.

Questions: {count}
Type mix: {typeMix}
Difficulty spread: {difficultySpread}
Topics: {topics}
{timeLimit}
{marks}

An exam differs from a quiz:
- Order questions from easier to harder.
- Cover the topics in the proportions given. Do not over-sample one
  chapter because it happens to be more quotable.
- Write instructions a student can follow without help.
- The answer key needs a rationale, not just the answer, because a
  teacher may hand it to students.

All the per-type rules for quiz questions apply here too.

DOCUMENT TEXT:
{text}
```

### Schema

Same question schema as quiz, plus:

```json
{
  "instructions": { "type": "string" },
  "title": { "type": "string" }
}
```

### Validation

As for quiz, plus a check that topic coverage roughly matches the requested proportions. Significant deviation triggers a retry, because a "whole unit" exam that only covers chapter one is a silent failure the user may not notice until they have used it.

## Task: chat

### Prompt

```
Answer the student's question using only the document text below.

QUESTION: {question}

- Cite page numbers inline, like [p. 47].
- If the document does not answer this, say so. Then say what it does
  cover that is close, if anything.
- Do not answer from your own knowledge, even if you are certain.
- Plain language. This is a student, not a colleague.
- Be brief unless the question needs length.

{conversationHistory}

DOCUMENT TEXT:
{text}
```

This is the only task without structured output, because a conversational answer is prose by nature. Citations are extracted from the `[p. N]` pattern after the fact, then validated against the real page range.

## Task: expandQuery

Used only for tier-2 retrieval on documents too long for the context window. One cheap call that materially improves BM25 recall.

### Prompt

```
List search terms for finding this in an academic document.

QUERY: {query}

Include synonyms, technical equivalents, and common variants.
For example, "heart attack" should also give "myocardial infarction"
and "cardiac arrest".

Terms only. No explanation.
```

### Schema

```json
{
  "type": "object",
  "required": ["terms"],
  "properties": {
    "terms": { "type": "array", "items": { "type": "string" } }
  }
}
```

This exists because BM25 cannot match "heart attack" against a document that only says "myocardial infarction". One call fixes the largest weakness of lexical retrieval for a fraction of what embedding the document would cost.

## Prompt engineering notes

Recorded so the reasoning is not lost and the same ground is not re-covered.

| Technique | Why |
|---|---|
| Rules numbered in priority order | Models follow ordered lists more reliably than prose paragraphs |
| Absolute language on grounding | "Prefer the document" is too weak; models supplement regardless |
| Negative examples included | "Never use all of the above" works better than describing good options |
| Reader described, not reading level | "For someone with no idea" beats "use simple language" |
| Honest refusal as a schema field | Makes the correct-refusal case structured rather than something to parse |
| Source quote required per item | Makes grounding mechanically verifiable, not a matter of trust |
| Shuffle applied client-side | Positional bias survives prompting; only shuffling fixes it |

## Changing a prompt

1. Note the specific failure you are fixing
2. Change one thing
3. Run against the fixture documents in `tests/fixtures/`
4. Manually review at least twenty generated items
5. Record the before and after in [ACTIVITY-LOG.md](../ACTIVITY-LOG.md)

Prompt changes cannot be verified by unit tests, so manual review is the gate. Changing several things at once means learning nothing from the result.
