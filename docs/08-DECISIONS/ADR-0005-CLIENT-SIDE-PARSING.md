# ADR-0005 — Parse all document formats in the browser

**Status:** Accepted
**Date:** 2026-07-30

## Context

Uploaded files must be converted to text before anything else can happen. Five formats need handling: PDF, PPTX, DOCX, EPUB, and plain text or Markdown.

The conventional approach is to upload the file to a server, parse it there with mature tooling, and store the result. That would mean file storage, upload bandwidth, server compute, and custody of student coursework.

## Decision

**All parsing happens in the browser, in a Web Worker. Files are never uploaded anywhere.**

| Format | Library | Licence |
|---|---|---|
| PDF | `pdfjs-dist` | Apache-2.0 |
| PPTX | `jszip` plus our own slide-XML reader | MIT |
| DOCX | `mammoth` | BSD-2-Clause |
| EPUB | `jszip` plus our own chapter-HTML reader | MIT |
| TXT, MD | Native browser APIs | — |

Parsers are lazy-loaded, so a user uploading a text file never downloads the PDF library.

Only the extracted text is ever sent anywhere, and only when the user asks for something to be generated from it.

## Why

**Cost.** File storage and upload bandwidth are the two things that make a free tier expensive fastest. Parsing on the device makes both zero. The user's own CPU does the work.

**Privacy, straightforwardly.** We can say "your files never leave your device" and have it be literally true, with no asterisk. For students uploading coursework, unreleased research, or licensed textbooks, that is a meaningful promise. It also means we hold no user files, so there is nothing to breach and nothing to subpoena.

**Offline.** Re-parsing and re-reading a document works with no connection, because the parser is already cached.

**No upload wait.** A 40 MB PDF on mobile data would take a long time to upload. Parsing it locally starts immediately.

**Simpler operations.** No storage buckets, no retention policy, no virus scanning, no cleanup jobs, no storage quota to monitor.

## Alternatives considered

### Server-side parsing

**Rejected.** Requires file storage and upload bandwidth, both of which are real costs at any volume. Makes us the custodian of student documents with the security and privacy weight that implies. Slower for the user on a mobile connection. Would need its own abuse protection, since an unauthenticated file-upload endpoint is an obvious target.

Better tooling and consistent results across browsers were the genuine attractions, and they were not enough.

### A hybrid: client-side for small files, server-side for large

**Rejected.** Two parsing implementations to write and keep in agreement, and it breaks the privacy promise for exactly the large documents most likely to be sensitive. Worst of both.

### Only support plain text, and make the user convert files themselves

**Rejected.** The whole premise of the product is "upload what you already have". Asking a stressed student to convert a PDF first defeats the point.

## Consequences

### Easier

- Zero storage cost and zero upload bandwidth
- A privacy claim that is true without qualification
- Works offline
- No upload latency
- No file-handling attack surface on the server

### Harder

- **Performance on low-end devices.** A 500-page PDF on a mid-range Android phone is genuinely slow. Mitigated by a Web Worker so the interface stays responsive, real progress reporting, page limits, and the option to process a page range.
- **Bundle size.** `pdfjs-dist` is substantial. Mitigated by lazy loading, so it arrives only when a PDF is actually uploaded.
- **Browser inconsistency.** Behaviour varies across engines, particularly older Safari. Needs real cross-browser testing.
- **Weaker tooling than the server ecosystem.** No client-side equivalent of the mature server-side extraction libraries. PPTX and EPUB in particular need hand-written readers over `jszip`.
- **Memory limits.** A very large file can exhaust the tab. Needs streaming where possible and a hard file-size ceiling.
- **No OCR.** Scanned PDFs cannot be handled without shipping a large OCR library. Out of scope for v1; detected and refused with a clear message. See [NON-GOALS-AND-SCOPE.md](../01-PRODUCT/NON-GOALS-AND-SCOPE.md).

### Things we must build because of this decision

- A Web Worker parsing pipeline with progress reporting per stage
- Lazy dynamic imports per format
- A scanned-PDF detector, using a text-density heuristic
- A file-size ceiling checked before parsing begins
- A page-range option for very long documents
- Memory-pressure handling with a graceful failure message
- Cross-browser test coverage on real documents

Pipeline detail in [DOCUMENT-PROCESSING.md](../03-ARCHITECTURE/DOCUMENT-PROCESSING.md).

## Revisit if

Client-side parsing proves unworkable on the target hardware in real testing, or OCR becomes a requirement. Either would need a superseding ADR that addresses storage cost and the privacy promise head-on.
