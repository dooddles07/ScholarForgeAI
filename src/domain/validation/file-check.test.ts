import { describe, expect, it } from 'vitest';
import { checkFile, formatBytes, MAX_FILE_BYTES } from './file-check';

const file = (name: string, size: number): File => {
  const f = new File([new Uint8Array(size)], name);
  return f;
};

describe('checkFile', () => {
  it.each(['legacy.doc', 'legacy.ppt', 'legacy.xls'])('rejects legacy format %s', (name) => {
    const result = checkFile(file(name, 100));
    expect(result).toEqual({ ok: false, rejection: { reason: 'legacyFormat' } });
  });

  it('rejects an unsupported extension', () => {
    const result = checkFile(file('notes.rtf', 100));
    expect(result).toEqual({
      ok: false,
      rejection: { reason: 'unsupported', extension: '.rtf' },
    });
  });

  it('rejects an empty file', () => {
    const result = checkFile(file('notes.pdf', 0));
    expect(result).toEqual({ ok: false, rejection: { reason: 'empty' } });
  });

  it('rejects a file over the size limit', () => {
    const result = checkFile(file('big.pdf', MAX_FILE_BYTES + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejection.reason).toBe('tooLarge');
    }
  });

  it.each([
    ['notes.pdf', 'pdf'],
    ['slides.pptx', 'pptx'],
    ['report.docx', 'docx'],
    ['book.epub', 'epub'],
    ['plain.txt', 'text'],
    ['readme.md', 'text'],
  ] as const)('accepts %s as format %s', (name, format) => {
    const result = checkFile(file(name, 100));
    expect(result).toEqual({ ok: true, format });
  });
});

describe('formatBytes', () => {
  it('formats sub-KB sizes in bytes', () => {
    expect(formatBytes(500)).toBe('500 bytes');
  });

  it('formats KB-range sizes', () => {
    expect(formatBytes(2048)).toBe('2 KB');
  });

  it('formats MB-range sizes', () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});
