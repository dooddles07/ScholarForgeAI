import { useCallback } from 'react';
import type { StoredDocument } from '@/domain/types';
import { saveDocument } from '@/persistence/documents';

export function useSaveDocument() {
  return useCallback((doc: StoredDocument) => saveDocument(doc), []);
}
