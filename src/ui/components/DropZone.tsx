import { useRef, useState, type DragEvent } from 'react';
import { FileUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACCEPTED_EXTENSIONS, checkFile, type FileRejection } from '@/domain/validation/file-check';
import { upload } from '@/copy/errors';

interface DropZoneProps {
  onAccepted: (file: File) => void;
  label: string;
  activeLabel: string;
  formats: string;
  tone?: 'ink' | 'app';
  className?: string;
}

function messageFor(rejection: FileRejection) {
  switch (rejection.reason) {
    case 'tooLarge':
      return upload.tooLarge(rejection.size);
    case 'legacyFormat':
      return upload.legacyFormat;
    case 'unsupported':
      return upload.unsupported(rejection.extension);
    case 'empty':
      return upload.emptyResult;
  }
}

export function DropZone({
  onAccepted,
  label,
  activeLabel,
  formats,
  tone = 'app',
  className,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<ReturnType<typeof messageFor> | null>(null);

  const ink = tone === 'ink';

  function handle(file: File | undefined) {
    if (!file) return;
    const result = checkFile(file);
    if (result.ok) {
      setError(null);
      onAccepted(file);
    } else {
      setError(messageFor(result.rejection));
    }
  }

  function onDrop(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    setDragging(false);
    handle(e.dataTransfer.files[0]);
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'group flex w-full cursor-pointer flex-col items-center justify-center gap-3',
          'rounded-lg border-2 border-dashed px-6 py-8 text-center sm:py-14',
          'transition-colors duration-[--duration]',
          ink
            ? 'border-ink-line bg-ink-raised hover:border-mark/60'
            : 'border-line bg-surface hover:border-accent/60',
          dragging && (ink ? 'border-mark bg-mark/10' : 'border-accent bg-accent-soft'),
        )}
      >
        <FileUp
          aria-hidden
          className={cn(
            'size-8 transition-transform duration-[--duration]',
            dragging && 'scale-110',
            ink ? 'text-mark' : 'text-accent',
          )}
        />
        <span
          className={cn('text-lg font-medium', ink ? 'text-ink-fg' : 'text-fg')}
        >
          {dragging ? activeLabel : label}
        </span>
        <span className={cn('font-mono text-xs', ink ? 'text-ink-muted' : 'text-fg-muted')}>
          {formats}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="sr-only"
        aria-label={label}
        onChange={(e) => handle(e.target.files?.[0])}
      />

      {error && (
        <div
          role="alert"
          className={cn(
            'mt-3 rounded-md border px-4 py-3 text-sm',
            ink ? 'border-ink-line bg-ink-raised text-ink-fg' : 'border-line bg-surface text-fg',
          )}
        >
          <p className="font-medium">{error.what}</p>
          <p className={cn('mt-1', ink ? 'text-ink-muted' : 'text-fg-muted')}>{error.next}</p>
        </div>
      )}
    </div>
  );
}
