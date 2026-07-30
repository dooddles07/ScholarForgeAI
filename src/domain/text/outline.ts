import type { OutlineNode, TextChunk } from '@/domain/types';

/*
 * Fallback structure when a document carries no usable bookmarks. Page ranges are honest about
 * what we know; inventing chapter titles from guesses would be worse than admitting we found none.
 */
export function pageRangeOutline(chunks: TextChunk[], groups = 5): OutlineNode[] {
  if (chunks.length === 0) return [];

  const first = chunks[0];
  const last = chunks.at(-1);
  if (!first || !last) return [];

  const firstPage = first.pageStart;
  const lastPage = last.pageEnd;
  const span = Math.max(1, Math.ceil((lastPage - firstPage + 1) / groups));

  const nodes: OutlineNode[] = [];
  for (let start = firstPage; start <= lastPage; start += span) {
    const end = Math.min(start + span - 1, lastPage);
    nodes.push({
      id: `range-${start}-${end}`,
      title: start === end ? `Page ${start}` : `Pages ${start} to ${end}`,
      level: 1,
      pageStart: start,
      pageEnd: end,
      children: [],
    });
  }
  return nodes;
}

export function flattenOutline(nodes: OutlineNode[]): OutlineNode[] {
  return nodes.flatMap((node) => [node, ...flattenOutline(node.children)]);
}
