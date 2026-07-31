import { describe, expect, it } from 'vitest';
import type { TextChunk } from '@/domain/types';
import { selectSpread } from './select-spread';

const chunk = (id: string, chars: number): TextChunk => ({
  id,
  text: 'x'.repeat(chars),
  pageStart: 1,
  pageEnd: 1,
  headingPath: [],
  charCount: chars,
});

describe('selectSpread', () => {
  it('returns everything when the document already fits', () => {
    const chunks = [chunk('a', 100), chunk('b', 100)];
    expect(selectSpread(chunks, 1000)).toEqual(chunks);
  });

  it('returns an empty array for no chunks or no budget', () => {
    expect(selectSpread([], 1000)).toEqual([]);
    expect(selectSpread([chunk('a', 10)], 0)).toEqual([]);
  });

  it('stays within the character budget', () => {
    const chunks = Array.from({ length: 50 }, (_, i) => chunk(`c${i}`, 100));
    const selected = selectSpread(chunks, 1000);
    const used = selected.reduce((sum, c) => sum + c.text.length, 0);
    expect(used).toBeLessThanOrEqual(1000);
  });

  it('spreads across the document rather than taking only the opening chunks', () => {
    const chunks = Array.from({ length: 50 }, (_, i) => chunk(`c${i}`, 100));
    const selected = selectSpread(chunks, 1000);
    const lastIndex = chunks.indexOf(selected.at(-1)!);
    expect(selected.length).toBeGreaterThan(1);
    expect(lastIndex).toBeGreaterThan(selected.length);
  });

  it('keeps one oversized chunk rather than returning nothing', () => {
    const selected = selectSpread([chunk('big', 5000), chunk('other', 5000)], 100);
    expect(selected).toHaveLength(1);
    expect(selected[0]!.id).toBe('big');
  });
});
