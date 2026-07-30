import type { StoredDocument } from '@/domain/types';
import { chunkPages, estimateTokens, type PageText } from '@/domain/text/chunking';
import { pageRangeOutline } from '@/domain/text/outline';
import { checkFile } from '@/domain/validation/file-check';
import { parsePdf, PdfScanError } from './formats/pdf';
import { parseText } from './formats/text';
import { parseDocx } from './formats/docx';
import { parsePptx } from './formats/pptx';
import { parseEpub } from './formats/epub';

export type ParseStage = 'reading' | 'extracting' | 'checking' | 'structure' | 'finishing';

export interface ParseProgress {
  stage: ParseStage;
  page?: number;
  total?: number;
}

export type ParseFailure =
  | 'scannedPdf'
  | 'passwordProtected'
  | 'corrupt'
  | 'emptyResult'
  | 'outOfMemory'
  | 'unsupported';

export class ParseError extends Error {
  constructor(readonly failure: ParseFailure) {
    super(failure);
    this.name = 'ParseError';
  }
}

function titleFrom(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export async function parseFile(
  file: File,
  onProgress: (progress: ParseProgress) => void,
  signal?: AbortSignal,
): Promise<StoredDocument> {
  const check = checkFile(file);
  if (!check.ok) throw new ParseError('unsupported');

  onProgress({ stage: 'reading' });

  let pages: PageText[] = [];
  let pageCount = 0;
  let title: string | null = null;
  let outline: StoredDocument['outline'] = [];
  const warnings: string[] = [];

  try {
    if (check.format === 'pdf') {
      const result = await parsePdf(
        file,
        ({ page, total }) => onProgress({ stage: 'extracting', page, total }),
        signal,
      );
      pages = result.pages;
      pageCount = result.pageCount;
      title = result.title;
      outline = result.outline;
      warnings.push(...result.warnings);
    } else if (check.format === 'text') {
      const result = await parseText(file);
      pages = result.pages;
      pageCount = result.pageCount;
    } else if (check.format === 'docx') {
      const result = await parseDocx(file);
      pages = result.pages;
      pageCount = result.pageCount;
      title = result.title;
    } else if (check.format === 'pptx') {
      const result = await parsePptx(file);
      pages = result.pages;
      pageCount = result.pageCount;
      title = result.title;
    } else if (check.format === 'epub') {
      const result = await parseEpub(file);
      pages = result.pages;
      pageCount = result.pageCount;
      title = result.title;
    } else {
      throw new ParseError('unsupported');
    }
  } catch (error) {
    if (error instanceof ParseError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    if (error instanceof PdfScanError) throw new ParseError('scannedPdf');

    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (message.includes('password')) throw new ParseError('passwordProtected');
    if (message.includes('memory') || message.includes('allocation')) {
      throw new ParseError('outOfMemory');
    }
    throw new ParseError('corrupt');
  }

  onProgress({ stage: 'checking' });
  const chunks = chunkPages(pages);
  if (chunks.length === 0) throw new ParseError('emptyResult');

  onProgress({ stage: 'structure' });
  if (outline.length === 0) outline = pageRangeOutline(chunks);

  onProgress({ stage: 'finishing' });

  return {
    id: crypto.randomUUID(),
    title: title ?? titleFrom(file.name),
    fileName: file.name,
    format: check.format,
    byteSize: file.size,
    pageCount,
    createdAt: Date.now(),
    studySetId: null,
    chunks,
    outline,
    estimatedTokens: estimateTokens(chunks),
    parseWarnings: warnings,
  };
}
