import { useCallback } from 'react';
import type { ChatMessage, Question, StoredDocument } from '@/domain/types';
import { answerQuestion, generateQuestions } from '@/ai/client';

/*
 * The bridge from UI to the AI layer. Components never call the client directly, so swapping
 * fixtures for the real proxy touches nothing above this line.
 */

export function useGenerateQuestions() {
  return useCallback(
    (doc: StoredDocument, count: number): Promise<Question[]> => generateQuestions(doc, count),
    [],
  );
}

export function useAskDocument() {
  return useCallback(
    async (doc: StoredDocument, question: string): Promise<ChatMessage> => {
      const reply = await answerQuestion(doc, question);
      return {
        id: `m-${Date.now()}-a`,
        role: 'assistant',
        content: reply.content,
        citations: reply.citations.map((c) => ({ ...c, documentId: doc.id })),
        createdAt: Date.now(),
      };
    },
    [],
  );
}
