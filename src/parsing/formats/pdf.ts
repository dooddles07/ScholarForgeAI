import type { OutlineNode } from '@/domain/types';
import type { PageText } from '@/domain/text/chunking';

export interface PdfResult {
  pages: PageText[];
  pageCount: number;
  title: string | null;
  outline: OutlineNode[];
  warnings: string[];
}

export interface PdfProgress {
  page: number;
  total: number;
}

/*
 * The only file importing pdfjs-dist, and it is imported dynamically: a user uploading a .txt
 * should not download a PDF engine.
 *
 * Scope note: this extracts text with page numbers. The Milestone 1 refinements are not here yet:
 * multi-column clustering, hyphen rejoining, and running-header stripping.
 */
export async function parsePdf(
  file: File,
  onProgress: (progress: PdfProgress) => void,
  signal?: AbortSignal,
): Promise<PdfResult> {
  const pdfjs = await import('pdfjs-dist');
  const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc.default;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;

  const pages: PageText[] = [];
  const warnings: string[] = [];
  let emptyPages = 0;

  for (let n = 1; n <= doc.numPages; n += 1) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');

    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length === 0) emptyPages += 1;
    pages.push({ page: n, text });
    page.cleanup();

    onProgress({ page: n, total: doc.numPages });
  }

  /* A PDF that is entirely images has no text to work from, and we must say so rather than
     hand back an empty document that looks like a bug. */
  if (emptyPages === doc.numPages) {
    throw new PdfScanError();
  }
  if (emptyPages > doc.numPages * 0.4) {
    warnings.push(`${emptyPages} of ${doc.numPages} pages had no readable text.`);
  }

  const metadata = await doc.getMetadata().catch(() => null);
  const info = metadata?.info as { Title?: string } | undefined;

  return {
    pages,
    pageCount: doc.numPages,
    title: info?.Title?.trim() || null,
    outline: await readOutline(doc as unknown as OutlineSource),
    warnings,
  };
}

export class PdfScanError extends Error {
  override readonly name = 'PdfScanError';
}

interface PdfOutlineItem {
  title: string;
  items: PdfOutlineItem[];
  dest: unknown;
}

interface OutlineSource {
  getOutline: () => Promise<PdfOutlineItem[] | null>;
  getPageIndex: (ref: never) => Promise<number>;
}

/* Bookmarks are preferred over heuristics: when an author supplied structure, use theirs. */
async function readOutline(doc: OutlineSource): Promise<OutlineNode[]> {
  const raw = await doc.getOutline().catch(() => null);
  if (!raw || raw.length === 0) return [];

  const convert = async (items: PdfOutlineItem[], level: number): Promise<OutlineNode[]> => {
    const nodes: OutlineNode[] = [];
    for (const [i, item] of items.entries()) {
      let pageStart = 1;
      try {
        const dest = Array.isArray(item.dest) ? (item.dest[0] as never) : null;
        if (dest) pageStart = (await doc.getPageIndex(dest)) + 1;
      } catch {
        /* A bookmark with an unresolvable destination still has a usable title. */
      }
      nodes.push({
        id: `outline-${level}-${i}`,
        title: item.title.trim(),
        level,
        pageStart,
        pageEnd: pageStart,
        children: await convert(item.items ?? [], level + 1),
      });
    }
    return nodes;
  };

  return convert(raw, 1);
}
