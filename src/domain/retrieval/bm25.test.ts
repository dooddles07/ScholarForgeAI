import { describe, expect, it } from 'vitest';
import type { TextChunk } from '@/domain/types';
import { bm25Rank } from './bm25';

function chunk(over: Partial<TextChunk> = {}): TextChunk {
  return {
    id: 'c1',
    text: '',
    pageStart: 1,
    pageEnd: 1,
    headingPath: [],
    charCount: 0,
    ...over,
  };
}

describe('bm25Rank', () => {
  it('ranks the chunk with more matching terms higher', () => {
    const chunks = [
      chunk({ id: 'a', text: 'The Krebs cycle produces ATP in the mitochondria.' }),
      chunk({ id: 'b', text: 'Mitosis is a process of cell division.' }),
      chunk({ id: 'c', text: 'The Krebs cycle is also called the citric acid cycle.' }),
    ];

    const results = bm25Rank(chunks, 'What is the Krebs cycle', 3);

    expect(results[0]?.chunk.id).not.toBe('b');
    expect(results.map((r) => r.chunk.id)).not.toContain('b');
  });

  it('returns empty when no chunk matches any query term', () => {
    const chunks = [chunk({ text: 'Completely unrelated content about gardening.' })];
    expect(bm25Rank(chunks, 'quantum physics equations', 5)).toEqual([]);
  });

  it('returns empty for an empty query or empty document set', () => {
    expect(bm25Rank([chunk({ text: 'something' })], '', 5)).toEqual([]);
    expect(bm25Rank([], 'anything', 5)).toEqual([]);
  });

  it('boosts a chunk whose heading matches a query term', () => {
    const chunks = [
      chunk({ id: 'no-heading', text: 'photosynthesis happens in the chloroplast of a plant cell' }),
      chunk({
        id: 'with-heading',
        text: 'photosynthesis happens in the chloroplast of a plant cell',
        headingPath: ['Photosynthesis'],
      }),
    ];

    const results = bm25Rank(chunks, 'photosynthesis', 2);
    expect(results[0]?.chunk.id).toBe('with-heading');
  });

  it('respects topK', () => {
    const chunks = Array.from({ length: 10 }, (_, i) => chunk({ id: `c${i}`, text: 'apple apple apple' }));
    expect(bm25Rank(chunks, 'apple', 3)).toHaveLength(3);
  });
});
