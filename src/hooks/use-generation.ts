import { useCallback } from 'react';
import type { ChatMessage, Question, StoredDocument } from '@/domain/types';
import { answerQuestion, generateQuestions } from '@/ai/client';
import { useSettings } from './use-settings';

/*
 * The bridge from UI to the AI layer. Components never call the client directly, so swapping
 * fixtures for the real proxy touches nothing above this line. The user's own key, when saved,
 * rides along on every call and bypasses the shared quota entirely.
 */

export function useGenerateQuestions() {
  const { settings } = useSettings();

  return useCallback(
    (doc: StoredDocument, count: number): Promise<Question[]> =>
      generateQuestions(doc, count, { apiKey: settings.userApiKey }),
    [settings.userApiKey],
  );
}

export function useAskDocument() {
  const { settings } = useSettings();

  return useCallback(
    async (doc: StoredDocument, question: string): Promise<ChatMessage> => {
      const reply = await answerQuestion(doc, question, { apiKey: settings.userApiKey });
      return {
        id: `m-${Date.now()}-a`,
        role: 'assistant',
        content: reply.content,
        citations: reply.citations.map((c) => ({ ...c, documentId: doc.id })),
        createdAt: Date.now(),
      };
    },
    [settings.userApiKey],
  );
}
