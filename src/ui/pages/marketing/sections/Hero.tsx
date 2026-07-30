import { Lock } from 'lucide-react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { DropZone } from '@/ui/components/DropZone';
import { hero } from '@/copy/marketing';
import { Specimen } from './Specimen';

interface HeroProps {
  onFile: (file: File) => void;
}

/* Marketing-only: the one place this app spends its `motion` dependency, on the one entrance a
   visitor sees exactly once. Everything under /app stays CSS-only (see App.tsx). */
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export function Hero({ onFile }: HeroProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="mx-auto max-w-6xl px-5 pt-6 pb-16 sm:px-8 sm:pt-12 lg:pt-24 lg:pb-28">
      <div className="grid items-start gap-14 lg:grid-cols-12 lg:gap-12">
        {/*
          Sized so the drop zone clears the fold on a 320x568 screen. It is the point of the
          page; anything above it is earning its height.
        */}
        <motion.div
          className="lg:col-span-7"
          initial={reduceMotion ? false : 'hidden'}
          animate="show"
          variants={container}
        >
          <motion.p
            variants={item}
            className="font-mono text-xs uppercase tracking-[0.18em] text-mark"
          >
            {hero.eyebrow}
          </motion.p>

          <motion.h1
            variants={item}
            className="display mt-3 text-[2.25rem] text-ink-fg sm:mt-5 sm:text-6xl lg:text-[4.25rem]"
          >
            {hero.headline}
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted sm:mt-5 sm:text-xl"
          >
            {hero.sub}
          </motion.p>

          <motion.div variants={item}>
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
          </motion.div>
        </motion.div>

        <div className="lg:col-span-5 lg:pt-6">
          <Specimen />
        </div>
      </div>
    </section>
  );
}
