import { useCallback } from 'react';
import { mockDocument, MOCK_DOC_ID } from '@/ai/mock/document';
import { getDocument, saveDocument } from '@/persistence/documents';

export function useLoadSample() {
  return useCallback(async () => {
    const existing = await getDocument(MOCK_DOC_ID);
    if (!existing) await saveDocument({ ...mockDocument, createdAt: Date.now() });
    return MOCK_DOC_ID;
  }, []);
}
