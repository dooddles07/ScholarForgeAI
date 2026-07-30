import { ArrowUpRight } from 'lucide-react';
import { Section } from './Section';
import { openSource } from '@/copy/marketing';

const REPO_URL = 'https://github.com/dooddles07/ScholarForgeAI';
const SELF_HOST_URL = `${REPO_URL}/blob/main/docs/07-OPEN-SOURCE/SELF-HOSTING-GUIDE.md`;

export function OpenSource() {
  return (
    <Section heading={openSource.heading} eyebrow="Open source">
      <div className="mt-8 max-w-[62ch] space-y-5">
        {openSource.body.map((paragraph) => (
          <p key={paragraph} className="text-lg leading-relaxed text-ink-muted">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={REPO_URL}
          className="cta-lift inline-flex min-h-11 items-center gap-2 rounded-md bg-mark px-5 py-2.5 font-medium text-ink transition-opacity duration-[--duration-fast] hover:opacity-90"
        >
          {openSource.primaryCta}
          <ArrowUpRight aria-hidden className="size-4" />
        </a>
        <a
          href={SELF_HOST_URL}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-ink-line px-5 py-2.5 font-medium text-ink-fg transition-colors duration-[--duration-fast] hover:bg-ink-raised"
        >
          {openSource.secondaryCta}
          <ArrowUpRight aria-hidden className="size-4" />
        </a>
      </div>
    </Section>
  );
}
