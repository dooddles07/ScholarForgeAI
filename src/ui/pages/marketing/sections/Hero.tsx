import { Lock } from 'lucide-react';
import { DropZone } from '@/ui/components/DropZone';
import { hero } from '@/copy/marketing';
import { Specimen } from './Specimen';

interface HeroProps {
  onFile: (file: File) => void;
}

export function Hero({ onFile }: HeroProps) {
  return (
    <section className="mx-auto max-w-6xl px-5 pt-6 pb-16 sm:px-8 sm:pt-12 lg:pt-24 lg:pb-28">
      <div className="grid items-start gap-14 lg:grid-cols-12 lg:gap-12">
        {/*
          Sized so the drop zone clears the fold on a 320x568 screen. It is the point of the
          page; anything above it is earning its height.
        */}
        <div className="lg:col-span-7">
          <div className="motion-enter">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-mark">
              {hero.eyebrow}
            </p>

            <h1 className="display mt-3 text-[2.25rem] text-ink-fg sm:mt-5 sm:text-6xl lg:text-[4.25rem]">
              {hero.headline}
            </h1>

            <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted sm:mt-5 sm:text-xl">
              {hero.sub}
            </p>
          </div>

          <div className="motion-enter" style={{ animationDelay: 'var(--duration-fast)' }}>
            <DropZone
              tone="ink"
              className="mt-5 max-w-xl sm:mt-8"
              onAccepted={onFile}
              label={hero.dropzone}
              activeLabel={hero.dropzoneActive}
              formats={hero.formats}
            />

            <p className="mt-4 flex max-w-xl items-start gap-2 text-sm text-ink-muted">
              <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-mark" />
              {hero.privacy}
            </p>
            <p className="mt-1.5 pl-6 text-sm font-medium text-ink-fg">{hero.cost}</p>
          </div>
        </div>

        <div className="lg:col-span-5 lg:pt-6">
          <Specimen />
        </div>
      </div>
    </section>
  );
}
