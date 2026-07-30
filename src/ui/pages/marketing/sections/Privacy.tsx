import { Check } from 'lucide-react';
import { Section } from './Section';
import { privacy } from '@/copy/marketing';

export function Privacy() {
  return (
    <Section heading={privacy.heading} eyebrow="Privacy">
      <div className="mt-8 grid gap-10 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <p className="max-w-[62ch] text-lg leading-relaxed text-ink-muted">{privacy.body[0]}</p>

          {/* Stated plainly rather than buried: the text does transit, and pretending otherwise
              would be the exact dishonesty the rest of this page argues against. */}
          <div className="rounded-lg border border-mark/35 bg-mark/[0.06] p-5">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-mark">
              {privacy.caveatLabel}
            </p>
            <p className="mt-3 text-base leading-relaxed text-ink-fg">{privacy.caveat}</p>
          </div>
        </div>

        <div className="lg:col-span-5">
          <h3 className="font-mono text-xs uppercase tracking-[0.16em] text-ink-muted">
            {privacy.staysLabel}
          </h3>
          <ul className="mt-4 space-y-3">
            {privacy.stays.map((item) => (
              <li key={item} className="flex items-start gap-3 text-base text-ink-fg">
                <Check aria-hidden className="mt-1 size-4 shrink-0 text-mark" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
