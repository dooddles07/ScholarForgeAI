import { Section } from './Section';
import { thread } from '@/copy/marketing';

/*
 * Genuinely a sequence, so it is numbered. The thread running down the left is the same device
 * the app uses to join a citation to its passage.
 */
export function HowItWorks() {
  return (
    <Section id="how-it-works" heading={thread.heading} eyebrow="How it works">
      <p className="mt-4 max-w-[62ch] text-lg text-ink-muted">{thread.sub}</p>

      <ol className="relative mt-12 space-y-10 pl-10 sm:pl-14">
        <span
          aria-hidden
          className="thread-line absolute left-[0.4375rem] top-2 bottom-2 w-0.5 rounded-full bg-mark/70 sm:left-[0.6875rem]"
        />

        {thread.steps.map((step, i) => (
          <li key={step.label} className="relative">
            <span
              aria-hidden
              className="absolute -left-10 top-1 flex size-4 items-center justify-center rounded-full bg-mark sm:-left-14 sm:size-6"
            >
              <span className="font-mono text-[0.6rem] font-semibold text-ink sm:text-xs">
                {i + 1}
              </span>
            </span>

            <p className="font-mono text-xs uppercase tracking-[0.16em] text-mark">{step.label}</p>
            <h3 className="mt-2 text-xl font-semibold text-ink-fg sm:text-2xl">{step.title}</h3>
            <p className="mt-2 max-w-[58ch] text-lg text-ink-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
