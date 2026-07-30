import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { parseEpub } from './epub';

/* jsdom's File/Blob don't implement arrayBuffer() in this environment, so tests use a minimal
   stand-in exposing only what the parser actually calls. */
function fileFromBytes(bytes: Uint8Array, name: string): File {
  return { arrayBuffer: async () => bytes.buffer, name } as unknown as File;
}

async function buildEpub(chapters: { id: string; href: string; html: string }[]): Promise<File> {
  const zip = new JSZip();
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>`,
  );

  const manifestItems = chapters
    .map((c) => `<item id="${c.id}" href="${c.href}" media-type="application/xhtml+xml"/>`)
    .join('');
  const spineItems = chapters.map((c) => `<itemref idref="${c.id}"/>`).join('');
  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0"?><package><metadata><dc:title>Test Book</dc:title></metadata><manifest>${manifestItems}</manifest><spine>${spineItems}</spine></package>`,
  );

  for (const c of chapters) {
    zip.file(`OEBPS/${c.href}`, c.html);
  }

  const bytes = await zip.generateAsync({ type: 'uint8array' });
  return fileFromBytes(bytes, 'book.epub');
}

describe('parseEpub', () => {
  it('extracts one page per spine chapter, in spine order, and reads the title', async () => {
    const file = await buildEpub([
      { id: 'ch1', href: 'ch1.xhtml', html: '<html><body><p>Chapter one text.</p></body></html>' },
      { id: 'ch2', href: 'ch2.xhtml', html: '<html><body><p>Chapter two text.</p></body></html>' },
    ]);

    const result = await parseEpub(file);

    expect(result.title).toBe('Test Book');
    expect(result.pageCount).toBe(2);
    expect(result.pages[0]?.text).toContain('Chapter one text.');
    expect(result.pages[1]?.text).toContain('Chapter two text.');
  });

  it('strips html tags and decodes basic entities', async () => {
    const file = await buildEpub([
      { id: 'ch1', href: 'ch1.xhtml', html: '<html><body><p>Salt &amp; pepper &lt;3</p></body></html>' },
    ]);

    const result = await parseEpub(file);
    expect(result.pages[0]?.text).toBe('Salt & pepper <3');
  });

  it('skips chapters with no extractable text', async () => {
    const file = await buildEpub([
      { id: 'ch1', href: 'ch1.xhtml', html: '<html><body></body></html>' },
      { id: 'ch2', href: 'ch2.xhtml', html: '<html><body><p>Real content.</p></body></html>' },
    ]);

    const result = await parseEpub(file);
    expect(result.pageCount).toBe(1);
    expect(result.pages[0]?.text).toContain('Real content.');
  });
});
