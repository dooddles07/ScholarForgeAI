import type { PageText } from '@/domain/text/chunking';

const CHARS_PER_PAGE = 1800;

/*
 * Plain text has no pages, but every citation in this product is a page number. We paginate at a
 * fixed size so a citation still points somewhere a reader can find.
 */
export async function parseText(file: File): Promise<{ pages: PageText[]; pageCount: number }> {
  const raw = await file.text();
  const normalised = raw.replace(/\r\n/g, '\n').trim();

  if (normalised.length === 0) return { pages: [], pageCount: 0 };

  const pages: PageText[] = [];
  const paragraphs = normalised.split(/\n{2,}/);
  let buffer = '';

  for (const paragraph of paragraphs) {
    buffer += (buffer.length > 0 ? '\n\n' : '') + paragraph.trim();
    if (buffer.length >= CHARS_PER_PAGE) {
      pages.push({ page: pages.length + 1, text: buffer });
      buffer = '';
    }
  }
  if (buffer.trim().length > 0) pages.push({ page: pages.length + 1, text: buffer });

  return { pages, pageCount: pages.length };
}
