import { describe, expect, it } from 'vitest';
import type { OutlineNode, TextChunk } from '@/domain/types';
import { flattenOutline, pageRangeOutline } from './outline';

const chunk = (pageStart: number, pageEnd: number): TextChunk => ({
  id: `chunk-${pageStart}`,
  text: 't',
  pageStart,
  pageEnd,
  headingPath: [],
  charCount: 1,
});

describe('pageRangeOutline', () => {
  it('returns an empty array for no chunks', () => {
    expect(pageRangeOutline([])).toEqual([]);
  });

  it('titles a single-page group as "Page N"', () => {
    const nodes = pageRangeOutline([chunk(1, 1)], 5);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]!.title).toBe('Page 1');
  });

  it('titles a multi-page group as "Pages N to M"', () => {
    const nodes = pageRangeOutline([chunk(1, 1), chunk(10, 10)], 1);
    expect(nodes[0]!.title).toMatch(/^Pages 1 to \d+$/);
    expect(nodes[0]!.pageStart).toBe(1);
  });

  it('splits the full page span into the requested number of groups', () => {
    const nodes = pageRangeOutline([chunk(1, 1), chunk(10, 10)], 5);
    expect(nodes).toHaveLength(5);
    expect(nodes[0]!.pageStart).toBe(1);
    expect(nodes.at(-1)!.pageEnd).toBe(10);
  });
});

describe('flattenOutline', () => {
  it('returns a leaf node as-is', () => {
    const leaf: OutlineNode = {
      id: 'a',
      title: 'A',
      level: 1,
      pageStart: 1,
      pageEnd: 1,
      children: [],
    };
    expect(flattenOutline([leaf])).toEqual([leaf]);
  });

  it('flattens nested children in depth-first order', () => {
    const child: OutlineNode = {
      id: 'a-1',
      title: 'A.1',
      level: 2,
      pageStart: 1,
      pageEnd: 1,
      children: [],
    };
    const parent: OutlineNode = {
      id: 'a',
      title: 'A',
      level: 1,
      pageStart: 1,
      pageEnd: 2,
      children: [child],
    };
    expect(flattenOutline([parent]).map((n) => n.id)).toEqual(['a', 'a-1']);
  });
});
