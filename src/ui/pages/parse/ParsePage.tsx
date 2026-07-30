import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppearance } from '@/hooks/use-settings';
import { clearPendingFile, peekPendingFile } from '@/lib/pending-file';
import { parseFile, ParseError, type ParseProgress } from '@/parsing';
import { useSaveDocument } from '@/hooks/use-save-document';
import { Button } from '@/ui/components/primitives/Button';
import { parsing } from '@/copy/labels';
import { upload, generic } from '@/copy/errors';
import { ParseProgressPanel } from './ParseProgressPanel';

type State =
  | { kind: 'working'; fileName: string; progress: ParseProgress }
  | { kind: 'failed'; what: string; next: string }
  | { kind: 'nothing' };

function failureCopy(error: unknown) {
  if (error instanceof ParseError) {
    switch (error.failure) {
      case 'scannedPdf':
        return upload.scannedPdf;
      case 'passwordProtected':
        return upload.passwordProtected;
      case 'emptyResult':
        return upload.emptyResult;
      case 'outOfMemory':
        return upload.outOfMemory;
      case 'unsupported':
        return upload.unsupported('that kind of');
      case 'corrupt':
        return upload.corrupt;
    }
  }
  return generic;
}

export default function ParsePage() {
  useAppearance();
  const navigate = useNavigate();
  const abortRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<State>({ kind: 'nothing' });
  const saveDocument = useSaveDocument();

  useEffect(() => {
    const file = peekPendingFile();
    if (!file) {
      setState({ kind: 'nothing' });
      return undefined;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setState({ kind: 'working', fileName: file.name, progress: { stage: 'reading' } });

    parseFile(
      file,
      (progress) =>
        setState((prev) => (prev.kind === 'working' ? { ...prev, progress } : prev)),
      controller.signal,
    )
      .then(async (doc) => {
        clearPendingFile();
        await saveDocument(doc);
        void navigate(`/app/doc/${doc.id}`, { replace: true });
      })
      .catch((error: unknown) => {
        /* An abort is either the user cancelling or StrictMode remounting. Keep the file. */
        if (error instanceof DOMException && error.name === 'AbortError') return;
        clearPendingFile();
        setState({ kind: 'failed', ...failureCopy(error) });
      });

    return () => controller.abort();
  }, [navigate, saveDocument]);

  if (state.kind === 'nothing') {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center md:px-8">
        <p className="text-base text-fg-muted">There is no file waiting to be read.</p>
        <Button className="mt-5" onClick={() => void navigate('/app/library')}>
          Go to the library
        </Button>
      </div>
    );
  }

  if (state.kind === 'failed') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 md:px-8" role="alert">
        <h1 className="text-2xl font-semibold text-fg">{state.what}</h1>
        <p className="mt-3 text-base leading-relaxed text-fg-muted">{state.next}</p>
        <Button className="mt-6" onClick={() => void navigate('/app/library')}>
          Try another file
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 md:px-8">
      <ParseProgressPanel fileName={state.fileName} progress={state.progress} />
      <Button
        variant="secondary"
        className="mt-8"
        onClick={() => {
          abortRef.current?.abort();
          clearPendingFile();
          void navigate('/app/library');
        }}
      >
        {parsing.cancel}
      </Button>
    </div>
  );
}
