# ADR-0006 — Client-side BM25 retrieval, not vector embeddings

**Status:** Accepted
**Date:** 2026-07-30

## Context

Two features need to find the relevant part of a document before asking the model about it: ask-your-document chat, and generating questions scoped to a selected topic.

The standard 2026 answer is retrieval-augmented generation with vector embeddings: split the document into chunks, embed each chunk via an API, store the vectors, and retrieve by semantic similarity at query time.

Applied here, that has a cost problem. Embedding a 500-page textbook means somewhere in the region of a thousand chunks, and therefore a thousand embedding API calls, for a single upload by a single user. Against a shared free quota measured in hundreds of requests per day (see [ADR-0002](ADR-0002-SHARED-KEY-BEHIND-PROXY.md)), one user uploading one textbook could consume the entire day's allowance for everyone.

There is also a much simpler observation available. Gemini 2.5 Flash has a one-million-token context window. A 200-page document is roughly 100,000 tokens. **Most documents students upload fit in the context window whole**, which means for the common case there is no retrieval problem to solve at all.

## Decision

**A two-tier strategy, with no embedding API involved at any point.**

**Tier 1 — document fits the context window.** Send the whole text. No retrieval, no chunk selection, and the model sees complete context, which produces better questions and better-grounded answers than any chunk-selection scheme would.

**Tier 2 — document exceeds the context window.** Select the most relevant chunks using **BM25 keyword ranking, computed in the browser**. BM25 is a well-established ranking function, it is a few dozen lines of code, it needs no model and no API, and it runs in milliseconds over a document-sized index.

Retrieval quality in tier 2 is improved cheaply by structural signals we already have from parsing: heading and chapter titles, page proximity, and the detected topic outline. A chunk under a heading matching the query ranks higher regardless of body-text overlap.

## Why

**It costs nothing.** No embedding calls at all. The shared quota is spent only on generation, which is the part the user actually asked for.

**It is instant.** No indexing wait after upload, no vectors to compute. Upload finishes and the document is immediately queryable.

**It works offline.** The index is built and searched locally, so chunk selection needs no connection.

**Nothing to store.** No vector database, no embedding cache, no additional dependency with its own free tier to monitor.

**Tier 1 covers the majority case with better quality than embeddings would give.** This is the part worth emphasising: for a typical lecture PDF, sending the whole document beats retrieving pieces of it. Embeddings would be a downgrade, not an upgrade.

**Keyword search suits the actual queries.** Students ask about named things: "what is the Krebs cycle", "explain mitosis", "what did Keynes argue". Technical terminology is exactly where lexical matching performs well. The semantic-similarity advantage is largest for vague, paraphrased queries, which are not the dominant pattern here.

## Alternatives considered

### Embedding-based RAG with an API

**Rejected on cost.** A thousand-plus API calls per large upload against a shared quota of a few hundred per day is not viable. It would also add an indexing delay after upload and a vector store to maintain.

### Client-side embeddings via transformers.js

**Rejected.** Removes the API cost, but means downloading an embedding model of tens of megabytes and running inference over every chunk on the device. On a mid-range phone, indexing a textbook this way would take minutes and drain battery. The result would still be worse than tier 1's whole-document approach.

### No retrieval at all — truncate long documents

**Rejected.** Silently ignoring the second half of a book is a correctness failure. A student would be quizzed on chapters 1 to 8 of a 20-chapter book with no indication anything was missing.

### Let the user pick the chapter manually

**Partially adopted, as a complement rather than a replacement.** Manual topic scoping is a real feature and it is in [FEATURES-SPECIFICATION.md](../01-PRODUCT/FEATURES-SPECIFICATION.md). But it cannot be the only mechanism, because ask-your-document needs to work without the user knowing in advance which chapter holds the answer.

## Consequences

### Easier

- Zero retrieval cost, in both API calls and storage
- No indexing delay; documents are queryable the moment parsing finishes
- Retrieval works offline
- Very little code, and code that a contributor can read and understand
- Better answer quality in the common case, since the model sees the whole document

### Harder

- **Vocabulary mismatch.** BM25 cannot match "heart attack" to a document that only says "myocardial infarction". Mitigated by asking the model to expand the query into likely synonyms before ranking, which costs one cheap call rather than a thousand.
- **Tier 2 quality is genuinely lower than embeddings would give.** Accepted. It affects only very long documents, and the structural signals recover much of the gap.
- **Token cost per request is higher in tier 1**, since we send whole documents. This consumes tokens-per-minute allowance rather than requests-per-day allowance, and the request count is the binding constraint on the free tier.
- **We must detect which tier applies**, which means a reliable token estimate before sending.

### Things we must build because of this decision

- A token estimator to choose between tiers, with a safety margin
- A BM25 implementation with structural boosting from headings and the topic outline
- Query expansion via a single cheap model call, for tier 2
- Chunking that respects document structure, so chunks break at headings rather than mid-sentence
- A clear indication to the user when only part of a very long document informed an answer

## Revisit if

Free or genuinely cheap embedding becomes available at a volume that fits the quota, or if tier 2 retrieval quality turns out to be a common complaint in practice.
