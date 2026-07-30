import type { PageText } from '@/domain/text/chunking';

export interface EpubResult {
  pages: PageText[];
  pageCount: number;
  title: string | null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function joinPath(dir: string, href: string): string {
  if (!dir) return href;
  const parts = (dir + href).split('/');
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') resolved.pop();
    else resolved.push(part);
  }
  return resolved.join('/');
}

/*
 * The only file importing jszip for books. One spine item (chapter) is one page: an EPUB has no
 * page numbers of its own, and the chapter is the finest unit we can name in a citation.
 */
export async function parseEpub(file: File): Promise<EpubResult> {
  const JSZip = (await import('jszip')).default;
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerXml) throw new Error('Invalid EPUB: missing container.xml');

  const opfPath = containerXml.match(/full-path="([^"]+)"/)?.[1];
  if (!opfPath) throw new Error('Invalid EPUB: missing package reference');

  const opfXml = await zip.file(opfPath)?.async('text');
  if (!opfXml) throw new Error('Invalid EPUB: missing package document');

  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';

  const manifest = new Map<string, string>();
  const itemPattern = /<item\b[^>]*\/?>/g;
  for (const tag of opfXml.match(itemPattern) ?? []) {
    const id = tag.match(/\bid="([^"]+)"/)?.[1];
    const href = tag.match(/\bhref="([^"]+)"/)?.[1];
    if (id && href) manifest.set(id, href);
  }

  const spineIds: string[] = [];
  const spinePattern = /<itemref\b[^>]*\/?>/g;
  for (const tag of opfXml.match(spinePattern) ?? []) {
    const idref = tag.match(/\bidref="([^"]+)"/)?.[1];
    if (idref) spineIds.push(idref);
  }

  const title = opfXml.match(/<dc:title[^>]*>([^<]*)<\/dc:title>/)?.[1]?.trim() || null;

  const pages: PageText[] = [];
  let pageNum = 0;
  for (const id of spineIds) {
    const href = manifest.get(id);
    if (!href) continue;
    const html = await zip.file(joinPath(opfDir, href))?.async('text');
    if (!html) continue;
    const text = stripHtml(html);
    if (text.length === 0) continue;
    pageNum += 1;
    pages.push({ page: pageNum, text });
  }

  return { pages, pageCount: pageNum, title };
}
