import { Link, useNavigate } from 'react-router';
import { FileText } from 'lucide-react';
import { useDocuments } from '@/hooks/use-documents';
import { useAppearance } from '@/hooks/use-settings';
import { setPendingFile } from '@/lib/pending-file';
import { relativeTime } from '@/lib/format';
import { formatBytes } from '@/domain/validation/file-check';
import { DropZone } from '@/ui/components/DropZone';
import { PageHeader } from '@/ui/components/PageHeader';
import { hero } from '@/copy/marketing';
import { emptyStates } from '@/copy/empty-states';
import { nav } from '@/copy/labels';
import { SampleDocumentButton } from './SampleDocumentButton';

export default function LibraryPage() {
  useAppearance();
  const navigate = useNavigate();
  const documents = useDocuments();

  function handleFile(file: File) {
    setPendingFile(file);
    void navigate('/app/parse');
  }

  const isEmpty = documents !== undefined && documents.length === 0;

  return (
    <>
      <PageHeader title={nav.library} />

      <div className="px-4 pt-6 md:px-8">
        <div className="mx-auto max-w-3xl lg:mx-0 lg:max-w-4xl">
          {isEmpty && <p className="mb-5 text-base text-fg-muted">{emptyStates.library.body}</p>}

          <DropZone
            onAccepted={handleFile}
            label={hero.dropzone}
            activeLabel={hero.dropzoneActive}
            formats={hero.formats}
          />

          {isEmpty && <SampleDocumentButton className="mt-4" />}

          {documents && documents.length > 0 && (
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {documents.map((doc) => (
                <li key={doc.id}>
                  <Link
                    to={`/app/doc/${doc.id}`}
                    className="flex h-full min-h-28 flex-col rounded-md border border-line bg-surface p-4 transition-colors duration-[--duration-fast] hover:border-accent/60"
                  >
                    <span className="flex items-start gap-2.5">
                      <FileText aria-hidden className="mt-0.5 size-5 shrink-0 text-accent" />
                      <span className="font-medium text-fg">{doc.title}</span>
                    </span>
                    <span className="mt-auto pt-3 font-mono text-xs tabular text-fg-muted">
                      {doc.pageCount} pages &middot; {formatBytes(doc.byteSize)} &middot;{' '}
                      {relativeTime(doc.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
