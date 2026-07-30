import { Link, useParams } from 'react-router';
import { Layers, MessageCircleQuestion, PenLine, Zap } from 'lucide-react';
import { useDocument } from '@/hooks/use-documents';
import { useAppearance } from '@/hooks/use-settings';
import { relativeTime } from '@/lib/format';
import { PageHeader } from '@/ui/components/PageHeader';
import { documentHub } from '@/copy/labels';
import { TopicOutline } from './TopicOutline';

export default function DocumentPage() {
  useAppearance();
  const { id } = useParams();
  const doc = useDocument(id);

  if (doc === undefined) return null;

  if (doc === null || !doc) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center md:px-8">
        <p className="text-base text-fg-muted">That document is not in this browser any more.</p>
        <Link to="/app/library" className="mt-4 inline-block text-accent underline">
          Back to the library
        </Link>
      </div>
    );
  }

  const hasRealOutline = doc.outline.some((node) => !node.id.startsWith('range-'));

  return (
    <>
      <PageHeader
        title={doc.title}
        meta={documentHub.meta(doc.pageCount, relativeTime(doc.createdAt))}
        backTo="/app/library"
      />

      <div className="px-4 pt-6 md:px-8">
        <div className="mx-auto max-w-3xl lg:mx-0">
          {/* Quiz me is primary: retrieval practice is the highest-value action here. */}
          <Link
            to={`/app/quiz/${doc.id}`}
            className="flex min-h-16 w-full items-center justify-center gap-2 rounded-md bg-accent px-6 text-lg font-medium text-accent-fg transition-colors duration-[--duration-fast] hover:bg-accent-hover"
          >
            <Zap aria-hidden className="size-5" />
            {documentHub.quiz}
          </Link>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <SecondaryAction
              to={`/app/cards/${doc.id}`}
              icon={<Layers aria-hidden className="size-5 text-accent" />}
              label={documentHub.flashcards}
            />
            <SecondaryAction
              to={`/app/chat/${doc.id}`}
              icon={<MessageCircleQuestion aria-hidden className="size-5 text-accent" />}
              label={documentHub.ask}
            />
          </div>

          <SecondaryAction
            className="mt-3"
            to={`/app/exam/${doc.id}`}
            icon={<PenLine aria-hidden className="size-5 text-accent" />}
            label={documentHub.exam}
          />

          <TopicOutline nodes={doc.outline} hasRealOutline={hasRealOutline} className="mt-10" />
        </div>
      </div>
    </>
  );
}

function SecondaryAction({
  to,
  icon,
  label,
  className,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={`flex min-h-14 items-center gap-3 rounded-md border border-line bg-surface px-5 text-base font-medium text-fg transition-colors duration-[--duration-fast] hover:border-accent/60 ${className ?? ''}`}
    >
      {icon}
      {label}
    </Link>
  );
}
