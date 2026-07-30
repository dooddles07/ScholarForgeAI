import type { DocumentFormat } from '@/domain/types';

export const MAX_FILE_BYTES = 50 * 1024 * 1024;

const FORMAT_BY_EXTENSION: Record<string, DocumentFormat> = {
  pdf: 'pdf',
  pptx: 'pptx',
  docx: 'docx',
  epub: 'epub',
  txt: 'text',
  md: 'text',
};

const LEGACY = new Set(['doc', 'ppt', 'xls']);

export const ACCEPTED_EXTENSIONS = '.pdf,.pptx,.docx,.epub,.txt,.md';

export type FileRejection =
  | { reason: 'tooLarge'; size: string }
  | { reason: 'legacyFormat' }
  | { reason: 'unsupported'; extension: string }
  | { reason: 'empty' };

export type FileCheck =
  | { ok: true; format: DocumentFormat }
  | { ok: false; rejection: FileRejection };

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extensionOf(fileName: string): string {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? (parts.at(-1) ?? '') : '';
}

/* Reject before spending thirty seconds parsing. Fail at the earliest possible point. */
export function checkFile(file: File): FileCheck {
  const extension = extensionOf(file.name);

  if (LEGACY.has(extension)) return { ok: false, rejection: { reason: 'legacyFormat' } };

  const format = FORMAT_BY_EXTENSION[extension];
  if (!format) {
    return { ok: false, rejection: { reason: 'unsupported', extension: `.${extension}` } };
  }

  if (file.size === 0) return { ok: false, rejection: { reason: 'empty' } };

  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, rejection: { reason: 'tooLarge', size: formatBytes(file.size) } };
  }

  return { ok: true, format };
}
