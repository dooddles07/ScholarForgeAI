import { useCallback } from 'react';
import { deleteEverything } from '@/persistence/study';

export function useDeleteEverything() {
  return useCallback(async () => {
    await deleteEverything();
    /* A full reload guarantees no stale live query is holding rows that no longer exist. */
    window.location.href = '/app/library';
  }, []);
}
