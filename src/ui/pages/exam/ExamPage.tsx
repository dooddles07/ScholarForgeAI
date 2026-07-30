import { useState } from 'react';
import { useParams } from 'react-router';
import { Printer } from 'lucide-react';
import type { Question } from '@/domain/types';
import { useDocument } from '@/hooks/use-documents';
import { useAppearance } from '@/hooks/use-settings';
import { useGenerateQuestions } from '@/hooks/use-generation';
import { PageHeader } from '@/ui/components/PageHeader';
import { Button } from '@/ui/components/primitives/Button';
import { exam as examCopy, generation } from '@/copy/labels';
import { ExamPaper } from './ExamPaper';
import '@/styles/print.css';

export default function ExamPage() {
  useAppearance();
  const { id } = useParams();
  const doc = useDocument(id);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [building, setBuilding] = useState(false);
  const [tab, setTab] = useState<'exam' | 'key'>('exam');
  const generateQuestions = useGenerateQuestions();

  if (!doc) return null;

  async function build() {
    if (!doc) return;
    setBuilding(true);
    try {
      setQuestions(await generateQuestions(doc, 10));
    } finally {
      setBuilding(false);
    }
  }

  return (
    <>
      <PageHeader title={examCopy.heading} meta={doc.title} backTo={`/app/doc/${doc.id}`} />

      <div className="px-4 pt-6 md:px-8">
        {questions.length === 0 ? (
          <div className="mx-auto max-w-md">
            <p className="text-base text-fg-muted">
              A full paper with a separate answer key, sized to print on A4.
            </p>
            <Button className="mt-5" disabled={building} onClick={() => void build()}>
              {building ? generation.exam : examCopy.generate}
            </Button>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl">
            <div className="no-print flex flex-wrap items-center gap-2">
              {/* Side by side from lg; behind a tab below it, where there is no room for two. */}
              <div className="flex rounded-md border border-line p-1 lg:hidden">
                {(['exam', 'key'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTab(value)}
                    aria-pressed={tab === value}
                    className={
                      tab === value
                        ? 'min-h-11 rounded-sm bg-accent px-4 text-sm font-medium text-accent-fg'
                        : 'min-h-11 rounded-sm px-4 text-sm text-fg-muted'
                    }
                  >
                    {value === 'exam' ? examCopy.preview : examCopy.answerKey}
                  </button>
                ))}
              </div>

              <Button variant="secondary" className="ml-auto" onClick={() => window.print()}>
                <Printer aria-hidden />
                {examCopy.print}
              </Button>
            </div>

            <div className="print-exam mt-6 grid gap-10 lg:grid-cols-2">
              <div className={tab === 'exam' ? '' : 'hidden lg:block'}>
                <ExamPaper title={doc.title} questions={questions} />
              </div>
              <div className={tab === 'key' ? 'print-answer-key' : 'hidden lg:block'}>
                <ExamPaper title={doc.title} questions={questions} answerKey />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
