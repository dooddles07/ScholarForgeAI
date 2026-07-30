# Open Questions

Purpose: decisions deliberately deferred, and the information needed to settle them.
Last updated: 2026-07-30

Recorded here rather than forgotten. Each entry says what the question is, why it is not being decided now, and what would settle it.

---

## Q1 — Charting library or hand-written SVG?

**Status:** deferred to M11.

The dashboard needs an accuracy trend line and a per-topic bar chart. `recharts` is in [TECH-STACK.md](../03-ARCHITECTURE/TECH-STACK.md) provisionally, but two simple charts may be cheaper as hand-written SVG given the 300 KB bundle budget.

**Settled by:** building both, measuring the bundle difference. If `recharts` costs more than about 40 KB gzipped for two charts, write the SVG.

**Note:** if `recharts` is kept, it must be lazy-loaded with the dashboard route so it never affects the initial bundle.

---

## Q2 — Stemming in BM25?

**Status:** not in v1.

Stemming would let "mitochondria" match "mitochondrial". It also introduces a class of confusing mismatch, and adds either a dependency or a hand-written stemmer.

**Settled by:** whether tier-2 retrieval quality generates complaints. Query expansion via the model already covers the synonym case, which is the larger problem. See [ADR-0006](../08-DECISIONS/ADR-0006-BM25-RETRIEVAL-NOT-EMBEDDINGS.md).

---

## Q3 — Share-target registration?

**Status:** candidate for v1.x.

A PWA can register as a share target, so a user could share a PDF straight from another app into ScholarForge. That is a genuinely nice entry point, and it shortens the first-visit flow.

**Settled by:** checking current browser support, particularly on iOS, and confirming it does not complicate the manifest or the service worker. Worth doing if support is good.

---

## Q4 — High-contrast theme?

**Status:** candidate for v1.1.

Dark mode is not the same as a high-contrast theme. Some low-vision users need considerably more contrast than AA.

**Settled by:** deciding whether `prefers-contrast: more` support is enough, or whether a separate token set is warranted. Lean toward the media query first, since it costs a token block rather than a theme system.

Noted as a known gap in [ACCESSIBILITY.md](../02-DESIGN/ACCESSIBILITY.md).

---

## Q5 — How generous should the per-IP daily limit be?

**Status:** needs a real number before launch.

Too low and a student cramming legitimately gets blocked. Too high and one user drains the shared pool.

**Settled by:** instrumenting a real study session and measuring how many generations a genuinely heavy evening produces, then setting the limit comfortably above it. A false positive is worse than a small amount of over-use.

Complicated by shared NAT: a whole school may appear as one address. Lean generous. See [RATE-LIMITING-AND-ABUSE.md](../04-OPERATIONS/RATE-LIMITING-AND-ABUSE.md).

---

## Q6 — Should short-answer marking use the model?

**Status:** unresolved.

Short-answer questions cannot be marked by string comparison. Using the model to judge costs an extra request per answer, which against a request-limited free tier is expensive.

**Options**

1. Model-marked, one request per answer. Accurate, expensive.
2. Batch-marked at the end of the quiz, one request for all answers. Much cheaper, but no immediate feedback.
3. Self-marked: show the expected answer and let the student judge. Free, and arguably better pedagogically, since it forces the student to compare their answer honestly.

**Leaning toward 3 with 2 as an option.** Self-assessment is standard practice in flashcard systems for exactly this reason, and it costs nothing. But it needs testing with real users before committing.

---

## Q7 — What happens to a leech card?

**Status:** partially specified.

A card failed repeatedly is flagged as a leech, and the message suggests rewording it. But should the app offer to regenerate it automatically?

**Consideration:** a leech is usually a badly written card — compound, ambiguous, or testing too much — rather than genuinely hard material. Automatic regeneration would help, but it costs a request and might discard something the user edited.

**Settled by:** seeing whether leeches are common in practice, and whether their content is usually fixable.

---

## Q8 — Should synthesised page numbers be labelled differently?

**Status:** partially specified.

DOCX, EPUB, and text files have no real pages, so we synthesise them by character count. [DOCUMENT-PROCESSING.md](../03-ARCHITECTURE/DOCUMENT-PROCESSING.md) says these are labelled approximate.

**The question:** is "page 12 (approximate)" clearer than a section reference like "Chapter 3, section 2"? A structural reference may be more useful for formats that genuinely have structure rather than pages.

**Settled by:** trying both with real EPUB and DOCX files and seeing which is easier to verify against the source. Verifiability is the point of a citation.

---

## Q9 — Multi-document citations across a study set

**Status:** specified but untested.

With 10 documents in a study set, a citation needs to name the file as well as the page. "From page 47" is ambiguous; "From Lecture 3, page 47" is not.

**Settled by:** building it and checking the label stays readable on a 320px screen. The risk is a long filename making the citation wrap awkwardly.

---

## Q10 — Should the app warn before sending a very large document?

**Status:** unresolved.

Tier-1 retrieval sends whole documents, which can be a lot of text. Users on metered data might reasonably want to know.

**Consideration:** the request is one-directional and modest by video-streaming standards, so a warning might be noise. But we promise transparency about what leaves the device.

**Leaning toward:** a passive indicator of how much text will be sent, available on request rather than as an interruption.

---

## Q11 — Fallback provider: worth implementing before it is needed?

**Status:** documented, not implemented.

OpenRouter is documented as a fallback in [ADR-0002](../08-DECISIONS/ADR-0002-SHARED-KEY-BEHIND-PROXY.md) but not built.

**Argument for building it early:** if Gemini's free tier changes suddenly, having the fallback ready avoids downtime.

**Argument against:** it doubles the provider surface to test and maintain, and OpenRouter's free-model roster churns constantly, so a fallback built now may need rewriting before it is used.

**Leaning against building it speculatively.** The provider sits behind one module, so adding it later is contained. Revisit if the shared quota is consistently exhausted.

---

## Q12 — Streak grace: one day, or one per week?

**Status:** specified as one, total.

The streak forgives one missed day. But once used, is it gone forever, or does it refresh?

**Consideration:** forever is harsh over a months-long streak. Refreshing weekly is more forgiving but makes the streak mean less.

**Leaning toward:** one grace day per week, unused ones not accumulating. Needs a decision before M6.

---

## How to close one of these

1. Gather whatever information the entry says would settle it
2. Decide
3. If it is architecturally significant, write an ADR
4. Update the affected documents
5. Record it in [ACTIVITY-LOG.md](../ACTIVITY-LOG.md)
6. Remove the entry from this file

An entry that has been sitting here for a long time without being needed is a sign the question did not matter. Delete it rather than keeping it out of tidiness.

## Adding one

Add an entry when a decision is deferred rather than made. Say what the question is, why it is not being answered now, and what would answer it.

The last part is what makes this file useful rather than a list of vague worries.
