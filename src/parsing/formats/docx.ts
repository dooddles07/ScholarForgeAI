import type { PageText } from '@/domain/text/chunking';

const CHARS_PER_PAGE = 1800;

export interface DocxResult {
  pages: PageText[];
  pageCount: number;
  title: string | null;
}

/*
 * The only file importing mammoth, and it is imported dynamically: a user uploading a .pdf
 * should not download the docx engine.
 *
 * DOCX has no native page concept once extracted as plain text, so we paginate at a fixed size,
 * matching the text.ts approach, so every citation still points somewhere a reader can find.
 */
export async function parseDocx(file: File): Promise<DocxResult> {
  const mammoth = await import('mammoth');
  const buffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer: buffer });

  const normalised = value.replace(/\r\n/g, '\n').trim();
  if (normalised.length === 0) return { pages: [], pageCount: 0, title: null };

  const pages: PageText[] = [];
  const paragraphs = normalised.split(/\n{2,}/);
  let buffer2 = '';

  for (const paragraph of paragraphs) {
    buffer2 += (buffer2.length > 0 ? '\n\n' : '') + paragraph.trim();
    if (buffer2.length >= CHARS_PER_PAGE) {
      pages.push({ page: pages.length + 1, text: buffer2 });
      buffer2 = '';
    }
  }
  if (buffer2.trim().length > 0) pages.push({ page: pages.length + 1, text: buffer2 });

  return { pages, pageCount: pages.length, title: null };
}
