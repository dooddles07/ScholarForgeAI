import { Section } from './Section';
import { grounding } from '@/copy/marketing';

export function Grounding() {
  return (
    <Section heading={grounding.heading} eyebrow="The rule we do not bend">
      <div className="mt-8 max-w-[62ch] space-y-5">
        <p className="text-lg leading-relaxed text-ink-muted">{grounding.body[0]}</p>
        <p className="border-l-2 border-mark pl-5 text-lg leading-relaxed text-ink-fg">
          {grounding.body[1]}
        </p>
      </div>
    </Section>
  );
}
