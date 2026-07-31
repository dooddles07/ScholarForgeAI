import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Exam, ExamConfig, StoredDocument } from '@/domain/types';
import { getExamForDocument, saveExam } from '@/persistence/study';
import { useGenerateQuestions } from './use-generation';

/* Persists the generated exam so it survives a reload, per FEATURES-SPECIFICATION.md's
   resumability promise — previously only held in local component state. */
export function useExam(doc: StoredDocument | undefined) {
  const generateQuestions = useGenerateQuestions();

  const exam = useLiveQuery(
    () => (doc ? getExamForDocument(doc.id) : Promise.resolve(undefined)),
    [doc?.id],
    undefined,
  );

  const build = useCallback(
    async (config: ExamConfig): Promise<Exam> => {
      if (!doc) throw new Error('No document');
      const questions = await generateQuestions(doc, config.count);
      const newExam: Exam = {
        id: crypto.randomUUID(),
        title: `${doc.title} — Practice Exam`,
        documentId: doc.id,
        studySetId: doc.studySetId,
        createdAt: Date.now(),
        config,
        questions,
        instructions: 'Answer every question in the space provided.',
      };
      await saveExam(newExam);
      return newExam;
    },
    [doc, generateQuestions],
  );

  return { exam, build };
}
