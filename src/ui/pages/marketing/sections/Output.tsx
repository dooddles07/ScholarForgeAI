import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Section } from './Section';
import { output } from '@/copy/marketing';
import { CardSample, ExamSample, ExplanationSample, QuizSample } from './output-samples';

const samples: ReactNode[] = [
  <QuizSample key="quiz" />,
  <CardSample key="cards" />,
  <ExplanationSample key="explain" />,
  <ExamSample key="exam" />,
];

/* Each row alternates sides, so the eye moves rather than running down a single column. */
export function Output() {
  return (
    <Section id="what-you-get" heading={output.heading} eyebrow="What you get">
      <ul className="mt-12 space-y-14 lg:space-y-20">
        {output.items.map((item, i) => (
          <li key={item.title} className="grid items-center gap-6 lg:grid-cols-12 lg:gap-12">
            <div className={i % 2 === 1 ? 'lg:col-span-5 lg:order-2' : 'lg:col-span-5'}>
              <h3 className="display text-3xl text-ink-fg">{item.title}</h3>
              <p className="mt-3 max-w-[46ch] text-lg leading-relaxed text-ink-muted">
                {item.body}
              </p>
            </div>

            <div className={i % 2 === 1 ? 'lg:col-span-7 lg:order-1' : 'lg:col-span-7'}>
              {/* Flush to the outer margin on whichever side the sample lands. */}
              <div className={cn('mx-auto max-w-md', i % 2 === 1 ? 'lg:mx-0' : 'lg:ml-auto lg:mr-0')}>
                {samples[i]}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
