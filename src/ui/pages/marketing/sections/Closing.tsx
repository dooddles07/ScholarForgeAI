import { DropZone } from '@/ui/components/DropZone';
import { closing, hero } from '@/copy/marketing';

interface ClosingProps {
  onFile: (file: File) => void;
}

export function Closing({ onFile }: ClosingProps) {
  return (
    <section className="border-t border-ink-line/70 py-20 lg:py-28">
      <div className="mx-auto max-w-2xl px-5 text-center sm:px-8">
        <h2 className="display text-4xl text-ink-fg sm:text-5xl">{closing.heading}</h2>
        <p className="mx-auto mt-4 max-w-md text-lg text-ink-muted">{closing.body}</p>

        <DropZone
          tone="ink"
          className="mt-8 text-left"
          onAccepted={onFile}
          label={closing.cta}
          activeLabel={hero.dropzoneActive}
          formats={hero.formats}
        />

        <p className="mt-10 text-base text-ink-muted">{closing.footnote}</p>
      </div>
    </section>
  );
}
