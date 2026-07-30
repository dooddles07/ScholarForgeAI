# Document Processing

Purpose: how an uploaded file becomes text we can generate from.
Last updated: 2026-07-30

All of this runs in the browser, in a Web Worker. No file is ever uploaded. See [ADR-0005](../08-DECISIONS/ADR-0005-CLIENT-SIDE-PARSING.md).

## Pipeline

```
File
 │
 ├─ 1. Pre-flight        size, extension, emptiness      ─► reject early
 ├─ 2. Format dispatch   lazy-import the right parser
 ├─ 3. Extract           raw text with page numbers
 ├─ 4. Scan detection    text-density heuristic          ─► reject with help
 ├─ 5. Clean             headers, footers, hyphenation
 ├─ 6. Structure         build the heading outline
 ├─ 7. Chunk             split on structure, not length alone
 ├─ 8. Estimate tokens   decides the retrieval tier
 └─ 9. Index             build BM25 term frequencies
 │
 ▼
StoredDocument  ──► persistence
```

Stages 3 through 9 report progress back to the main thread so the interface can show what is actually happening rather than an indeterminate spinner.

## Stage 1 — Pre-flight

Checked before any parsing work, because rejecting a 200 MB file after thirty seconds of processing is a bad experience.

| Check | Limit | On failure |
|---|---|---|
| File size | 50 MB | Reject, naming the file's actual size and the limit |
| Extension | `.pdf .pptx .docx .epub .txt .md` | Reject, listing what does work |
| Non-empty | over 0 bytes | Reject |
| Files in set | 10 | Reject, suggest a second study set |

Legacy `.doc` and `.ppt` get their own message, since "unsupported" is unhelpful when the user has a Word file. The message explains they are older formats and suggests re-saving as `.docx` or `.pptx`.

## Stage 2 — Format dispatch

```ts
const parsers = {
  pdf:  () => import('./formats/pdf'),
  pptx: () => import('./formats/pptx'),
  docx: () => import('./formats/docx'),
  epub: () => import('./formats/epub'),
  text: () => import('./formats/text'),
};
```

Dynamic imports so a `.txt` upload never downloads the PDF engine. This is the single biggest bundle-size win available to us.

## Stage 3 — Extraction, per format

### PDF — `pdfjs-dist`

Iterate pages, call `getTextContent()`, and keep the page number with every text run.

Real-world PDFs are messy, and three problems recur:

**Reading order.** Multi-column layouts often return text in the wrong order, so paragraphs interleave across columns. Detected by clustering text items by x-coordinate: if items form two or more distinct horizontal bands, read each band top to bottom in turn rather than trusting the raw item order.

**Hyphenation across line breaks.** `photo-` at end of line, `synthesis` at the start of the next. Joined when the fragment before the hyphen is lowercase and the fragment after is lowercase, which avoids wrongly joining genuine hyphenated compounds and line-initial capitals.

**Ligatures.** Extracted text often contains `ﬁ`, `ﬂ`, `ﬀ`. Normalised to ASCII, otherwise keyword search silently fails to match `find` against `ﬁnd`.

Also captured: the outline or bookmarks, when the PDF has them. That is by far the most reliable structure source available, better than any heading heuristic.

### PPTX — `jszip` plus our own reader

A `.pptx` is a zip archive. Slides live at `ppt/slides/slideN.xml`, speaker notes at `ppt/notesSlides/notesSlideN.xml`.

Read text from `<a:t>` elements in document order. Slide number becomes the page number. Speaker notes are included and labelled, because lecturers frequently put the actual explanation there while the slide holds only bullets.

Slide titles are identified from the title placeholder and become outline entries. Presentations therefore produce unusually clean structure.

### DOCX — `mammoth`

Convert to HTML rather than raw text, because the HTML preserves heading levels, and heading levels are what the outline is built from.

DOCX has no pages, since pagination is a rendering concern. We synthesise page numbers at roughly 3,000 characters per page so citations remain meaningful, and label them as approximate in the interface.

### EPUB — `jszip` plus our own reader

Also a zip. `META-INF/container.xml` points to the OPF file, the OPF spine gives chapter order, and each chapter is an XHTML file.

Chapter titles become outline entries. Page numbers are synthesised per chapter, as with DOCX. The navigation document, when present, gives a better outline than heading inference.

### Plain text and Markdown

Read directly. For Markdown, `#` heading levels build the outline. Pages synthesised by character count.

## Stage 4 — Scan detection

Image-only PDFs are the most common upload failure, and getting the message right matters more than the detection being clever.

Heuristic: if extracted text averages under 100 characters per page across the document, treat it as a scan.

Refined slightly to avoid false positives: a document with many genuinely sparse pages, such as a title-slide-heavy deck, is checked for whether *any* page has substantial text. A document where no page clears the threshold is a scan. A document where some pages do is processed, with a warning naming the pages that yielded nothing.

The message explains the file contains pictures of text rather than text, and suggests finding a text version or a different export. It does not use the word "failed", and it does not mention OCR, since we do not offer it. Exact wording in [CONTENT-AND-COPY-GUIDE.md](../02-DESIGN/CONTENT-AND-COPY-GUIDE.md).

## Stage 5 — Cleaning

Removing noise that would otherwise become quiz questions. A question about a running header is worse than no question.

| Noise | Detection |
|---|---|
| Running headers and footers | The same short line appearing at the top or bottom of most pages |
| Bare page numbers | Lines matching only digits, or `Page N`, `N of M` |
| Hyphenation breaks | Handled at extraction |
| Excess whitespace | Collapse runs of blank lines and spaces |
| Ligatures and smart quotes | Normalise to ASCII equivalents |
| Copyright and licence boilerplate | Repeated identical blocks across pages |

Header and footer detection is frequency-based: a line appearing in the same page position on more than 60% of pages is furniture, not content. This threshold correctly keeps chapter titles that appear on only their own pages.

Cleaning is conservative by design. Wrongly deleting real content is far worse than leaving some noise, since the noise mostly gets ignored downstream while missing content cannot be quizzed at all.

## Stage 6 — Structure

Outline sources, in order of preference:

1. **Embedded structure** — PDF bookmarks, EPUB navigation, DOCX heading styles, PPTX title placeholders. Use it whenever present.
2. **Markdown headings** — for `.md` files.
3. **Heuristic inference** — for everything else.

Heuristics, applied only as a fallback: short lines that are not sentences, in a noticeably larger font (available from PDF text metrics), or numbered like `3.2 Glycolysis`, or in title case and standing alone between blank lines.

The outline drives topic selection everywhere in the app, so it is worth getting right. When inference produces nothing usable, the document still works, but topic scoping falls back to page ranges instead of named topics, and the interface says so rather than presenting an empty topic list.

## Stage 7 — Chunking

Chunks are the unit of citation and of retrieval, so their boundaries matter.

Rules:

- **Target 1,000 characters, hard maximum 2,000.**
- **Never split mid-sentence.** Prefer a paragraph boundary; fall back to a sentence boundary.
- **Never split across a heading.** A heading always starts a new chunk.
- **Carry a 100-character overlap** between adjacent chunks, so a fact sitting on a boundary is not lost to retrieval.
- **Record `headingPath`** on every chunk, for example `['Chapter 3', 'Glycolysis']`, which is what lets BM25 use structural signal.
- **Record `pageStart` and `pageEnd`**, since these become the citation shown to the user.

Chunks shorter than 100 characters are merged into their neighbour, since a chunk containing only a heading is useless for retrieval and produces a citation that points at nothing.

## Stage 8 — Token estimation

Decides whether the whole document can be sent or whether retrieval is needed. See [ADR-0006](../08-DECISIONS/ADR-0006-BM25-RETRIEVAL-NOT-EMBEDDINGS.md).

Estimate at roughly 4 characters per token for English, then apply a 20% safety margin. Precision is unnecessary; we only need to be reliably on the correct side of a very large threshold, and the cost of overestimating is one unnecessary retrieval step while the cost of underestimating is a rejected request.

## Stage 9 — BM25 index

Built once at upload, stored with the document, held in memory during a session.

Per chunk: tokenise on word boundaries, lowercase, strip punctuation, drop stopwords, and record term frequencies. Store document-level frequencies for the IDF component.

No stemming in v1. It helps recall modestly and costs a dependency plus a class of confusing mismatches. Recorded in [OPEN-QUESTIONS.md](../06-PLANNING/OPEN-QUESTIONS.md).

## Progress reporting

The worker posts named stages, because "Extracting text, page 40 of 180" is reassuring in a way that a spinner is not.

| Stage | Message |
|---|---|
| 3 | Reading your file |
| 4 | Checking the text |
| 5 | Tidying up |
| 6 | Finding the topics |
| 7–9 | Getting it ready |

Page-level progress is included during extraction, which is the slow stage.

## Performance

| Concern | Approach |
|---|---|
| Interface freezing | Web Worker, always. Non-negotiable. |
| Very long documents | Yield to the event loop every 10 pages so progress updates render |
| Memory exhaustion | Release page resources after extraction; hard 50 MB file ceiling |
| Low-end devices | Offer a page range for documents over 200 pages |
| Bundle weight | Parsers lazy-imported per format |

Target: a 100-page PDF in under 10 seconds on a mid-range Android device. Verified on real hardware, not an emulator, per [TESTING-STRATEGY.md](../05-ENGINEERING/TESTING-STRATEGY.md).

## Failure handling

| Failure | Message intent |
|---|---|
| Scanned PDF | It is pictures of text; find a text version |
| Password-protected | It is locked; remove the password and retry |
| Corrupt file | We could not read it; try re-downloading or re-exporting |
| Too large | Names the actual size and the limit |
| Legacy `.doc`/`.ppt` | Older format; re-save as `.docx`/`.pptx` |
| Out of memory | The file is too big for this device; try a page range |
| Unknown parser error | Something went wrong reading this file, with a link to report it |

Every message names a next step. No message shows a stack trace or a library error string. When one document in a study set fails, the others still process.

## Testing

Committed fixtures in `tests/fixtures/`, covering: a clean text PDF, a two-column academic paper, a scanned PDF, a password-protected PDF, a slide deck with speaker notes, a DOCX with heading styles, an EPUB with navigation, a Markdown file, a corrupt file, and a PDF with heavy ligature use.

Parsing regressions are only detectable against real files, so these are committed to the repository rather than generated.
