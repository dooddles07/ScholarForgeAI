import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { parsePptx } from './pptx';

/* jsdom's File/Blob don't implement arrayBuffer() in this environment, so tests use a minimal
   stand-in exposing only what the parser actually calls. */
function fileFromBytes(bytes: Uint8Array, name: string): File {
  return { arrayBuffer: async () => bytes.buffer, name } as unknown as File;
}

async function buildPptx(slideTexts: string[]): Promise<File> {
  const zip = new JSZip();
  slideTexts.forEach((text, i) => {
    const xml = `<?xml version="1.0"?><p:sld xmlns:a="a"><a:t>${text}</a:t></p:sld>`;
    zip.file(`ppt/slides/slide${i + 1}.xml`, xml);
  });
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  return fileFromBytes(bytes, 'deck.pptx');
}

describe('parsePptx', () => {
  it('extracts one page per slide, in slide order', async () => {
    const file = await buildPptx(['First slide', 'Second slide', 'Third slide']);
    const result = await parsePptx(file);

    expect(result.pageCount).toBe(3);
    expect(result.pages.map((p) => p.text)).toEqual(['First slide', 'Second slide', 'Third slide']);
    expect(result.pages.map((p) => p.page)).toEqual([1, 2, 3]);
  });

  it('sorts slides numerically, not lexically (slide10 after slide2)', async () => {
    const zip = new JSZip();
    zip.file('ppt/slides/slide1.xml', '<a:t>one</a:t>');
    zip.file('ppt/slides/slide2.xml', '<a:t>two</a:t>');
    zip.file('ppt/slides/slide10.xml', '<a:t>ten</a:t>');
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    const file = fileFromBytes(bytes, 'deck.pptx');

    const result = await parsePptx(file);
    expect(result.pages.map((p) => p.text)).toEqual(['one', 'two', 'ten']);
  });

  it('skips slides with no text', async () => {
    const file = await buildPptx(['Has text', '']);
    const result = await parsePptx(file);
    expect(result.pages).toHaveLength(1);
  });
});
