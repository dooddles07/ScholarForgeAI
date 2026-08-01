import { describe, expect, it } from 'vitest';
import type { GroundedChunk, RawCardItem, RawChatResult, RawQuestionItem } from '../models/request.js';
import { groundChat, groundItems, groundedCitation } from './grounding.service.js';

const chunks: GroundedChunk[] = [
  { id: 'c1', text: 'Mitochondria produce ATP.', pageStart: 4, pageEnd: 4 },
  { id: 'c2', text: 'Ribosomes assemble proteins.', pageStart: 9, pageEnd: 10 },
];

function question(chunkId: string): RawQuestionItem {
  return {
    type: 'mcq',
    prompt: 'What produces ATP?',
    options: ['Mitochondria', 'Ribosomes', 'Nucleus', 'Golgi'],
    correctIndex: 0,
    explanation: 'Stated directly in the text.',
    chunkId,
    quote: 'Mitochondria produce ATP.',
  } as RawQuestionItem;
}

describe('groundedCitation', () => {
  it('resolves a citation against a chunk that was actually sent', () => {
    expect(groundedCitation('c2', 'Ribosomes assemble proteins.', chunks)).toEqual({
      chunkId: 'c2',
      pageStart: 9,
      pageEnd: 10,
      quote: 'Ribosomes assemble proteins.',
    });
  });

  it('rejects a chunkId we never sent', () => {
    expect(groundedCitation('c99', 'Invented.', chunks)).toBeNull();
    expect(groundedCitation('', 'Invented.', chunks)).toBeNull();
  });

  /* Page numbers come from our own chunk data. A model that claims a page it likes cannot move
     the citation to it. */
  it('takes page numbers from the chunk, never from the model', () => {
    const claimed = { chunkId: 'c1', pageStart: 999, pageEnd: 999, quote: 'x' };
    const citation = groundedCitation(claimed.chunkId, claimed.quote, chunks);
    expect(citation?.pageStart).toBe(4);
    expect(citation?.pageEnd).toBe(4);
  });
});

describe('groundItems', () => {
  it('keeps grounded items and drops ungrounded ones', () => {
    const items = groundItems([question('c1'), question('c99'), question('c2')], chunks);
    expect(items).toHaveLength(2);
    expect(items.map((i) => (i.citation as { chunkId: string }).chunkId)).toEqual(['c1', 'c2']);
  });

  it('strips the raw chunkId and quote, leaving only the resolved citation', () => {
    const [item] = groundItems([question('c1')], chunks);
    expect(item).not.toHaveProperty('chunkId');
    expect(item).not.toHaveProperty('quote');
    expect(item?.prompt).toBe('What produces ATP?');
  });

  it('returns nothing when every item was invented', () => {
    expect(groundItems([question('c99'), question('nope')], chunks)).toEqual([]);
  });

  it('grounds cards the same way as questions', () => {
    const card = { front: 'F', back: 'B', chunkId: 'c1', quote: 'q' } as RawCardItem;
    const bad = { front: 'F', back: 'B', chunkId: 'c99', quote: 'q' } as RawCardItem;
    expect(groundItems([card, bad], chunks)).toHaveLength(1);
  });
});

describe('groundChat', () => {
  const chat = (ids: string[]): RawChatResult =>
    ({
      content: 'Mitochondria produce ATP.',
      citations: ids.map((id) => ({ chunkId: id, quote: 'q' })),
    }) as RawChatResult;

  it('keeps the answer when at least one citation is real', () => {
    const result = groundChat(chat(['c1', 'c99']), chunks);
    expect(result.content).toBe('Mitochondria produce ATP.');
    expect(result.citations).toHaveLength(1);
  });

  /* Prose with no surviving citation is a fabrication, so the content goes with the citations
     rather than reaching the student unsourced. */
  it('discards the answer entirely when every citation was invented', () => {
    const result = groundChat(chat(['c99']), chunks);
    expect(result.content).toBe('');
    expect(result.citations).toEqual([]);
  });

  it('discards the answer when the model returned no citations at all', () => {
    expect(groundChat(chat([]), chunks).content).toBe('');
  });
});
