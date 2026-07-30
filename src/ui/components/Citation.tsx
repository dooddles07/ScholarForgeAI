import { useId, useState } from 'react';
import { Highlighter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { quiz } from '@/copy/labels';

interface CitationProps {
  pageStart: number;
  pageEnd?: number;
  /* The supporting sentence from the document. Without it there is nothing to open. */
  quote?: string | undefined;
  className?: string;
}

function pageLabel(pageStart: number, pageEnd?: number) {
  if (pageEnd && pageEnd !== pageStart) return `From pages ${pageStart}–${pageEnd}`;
  return quiz.source(pageStart);
}

/*
 * The trust signal, and the one thing that separates this from a tool that makes things up.
 * Styled as content rather than as a caveat: amber, legible, and tappable to open the source.
 */
export function Citation({ pageStart, pageEnd, quote, className }: CitationProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const label = pageLabel(pageStart, pageEnd);

  if (!quote) {
    return (
      <p className={cn('flex items-center gap-1.5 text-sm text-mark-text', className)}>
        <Highlighter aria-hidden className="size-4" />
        <span className="font-mono tabular">{label}</span>
      </p>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          'inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm',
          'bg-mark-soft text-mark-text transition-colors duration-[--duration-fast]',
          'hover:bg-mark/35 cursor-pointer',
        )}
      >
        <Highlighter aria-hidden className="size-4" />
        <span className="font-mono tabular font-medium">{label}</span>
        <span aria-hidden className="text-mark-text/50">|</span>
        <span className="underline underline-offset-2">
          {open ? quiz.hideSource : quiz.showSource}
        </span>
      </button>

      {/* grid-rows 0fr to 1fr animates height without knowing the content size. */}
      <div
        id={panelId}
        className={cn(
          'grid transition-[grid-template-rows] duration-[--duration-slow] ease-[--ease]',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <SourcePassage quote={quote} label={label} />
        </div>
      </div>
    </div>
  );
}

/* The thread: an amber rule running from the citation down the edge of the passage. */
function SourcePassage({ quote, label }: { quote: string; label: string }) {
  return (
    <figure className="mt-3 flex gap-3">
      <span aria-hidden className="w-0.5 shrink-0 rounded-full bg-mark-line" />
      <div className="min-w-0">
        <blockquote className="measure text-base text-fg">
          <span className="bg-mark-soft box-decoration-clone px-1 py-0.5 leading-relaxed">
            {quote}
          </span>
        </blockquote>
        <figcaption className="mt-2 font-mono text-xs tabular text-fg-muted">{label}</figcaption>
      </div>
    </figure>
  );
}
