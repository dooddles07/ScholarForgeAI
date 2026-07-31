import { useCallback } from 'react';
import type { Attempt } from '@/domain/types';
import { saveAttempt } from '@/persistence/study';

export function useSaveAttempt() {
  return useCallback((attempt: Attempt) => saveAttempt(attempt), []);
}
