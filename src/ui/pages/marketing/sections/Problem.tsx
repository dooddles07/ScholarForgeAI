import { Section } from './Section';
import { problem } from '@/copy/marketing';

export function Problem() {
  return (
    <Section heading={problem.heading} eyebrow="Why this exists">
      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7">
          {problem.body.map((paragraph) => (
            <p key={paragraph} className="max-w-[62ch] text-lg leading-relaxed text-ink-muted">
              {paragraph}
            </p>
          ))}
        </div>

        <p className="display self-end text-2xl text-mark lg:col-span-5 lg:text-3xl">
          {problem.kicker}
        </p>
      </div>
    </Section>
  );
}
