import { describe, expect, it } from 'vitest';
import { chunkPages, estimateTokens } from './chunking';

describe('chunkPages', () => {
  it('returns an empty array for no pages', () => {
    expect(chunkPages([])).toEqual([]);
  });

  it('skips blank pages', () => {
    const chunks = chunkPages([{ page: 1, text: '   ' }, { page: 2, text: '\n\n' }]);
    expect(chunks).toEqual([]);
  });

  it('combines pages under the target into one chunk with correct page range', () => {
    const chunks = chunkPages(
      [
        { page: 1, text: 'first page text' },
        { page: 2, text: 'second page text' },
      ],
      1000,
    );
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ pageStart: 1, pageEnd: 2 });
    expect(chunks[0]!.text).toContain('first page text');
    expect(chunks[0]!.text).toContain('second page text');
  });

  it('flushes into a new chunk once the target is exceeded', () => {
    const chunks = chunkPages(
      [
        { page: 1, text: 'a'.repeat(10) },
        { page: 2, text: 'b'.repeat(10) },
      ],
      10,
    );
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toMatchObject({ pageStart: 1, pageEnd: 1 });
    expect(chunks[1]).toMatchObject({ pageStart: 2, pageEnd: 2 });
  });
});

describe('estimateTokens', () => {
  it('estimates roughly one token per four characters', () => {
    const chunks = chunkPages([{ page: 1, text: 'x'.repeat(400) }], 1000);
    expect(estimateTokens(chunks)).toBe(100);
  });

  it('returns 0 for no chunks', () => {
    expect(estimateTokens([])).toBe(0);
  });
});
