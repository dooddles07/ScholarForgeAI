import type { PageText } from '@/domain/text/chunking';

export interface PptxResult {
  pages: PageText[];
  pageCount: number;
  title: string | null;
}

function slideNumber(name: string): number {
  return Number(name.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
}

function extractSlideText(xml: string): string {
  const matches = xml.match(/<a:t>([^<]*)<\/a:t>/g) ?? [];
  return matches
    .map((m) => m.slice('<a:t>'.length, -'</a:t>'.length))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/*
 * The only file importing jszip for slides. One slide is one page: it is the natural citation
 * unit for a deck, and matches how a student would look the reference up.
 */
export async function parsePptx(file: File): Promise<PptxResult> {
  const JSZip = (await import('jszip')).default;
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => slideNumber(a) - slideNumber(b));

  const pages: PageText[] = [];
  let pageNum = 0;
  for (const name of slideFiles) {
    pageNum += 1;
    const xml = await zip.file(name)!.async('text');
    const text = extractSlideText(xml);
    if (text.length === 0) continue;
    pages.push({ page: pageNum, text });
  }

  return { pages, pageCount: slideFiles.length, title: null };
}
