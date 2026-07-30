import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionProps {
  id?: string;
  heading: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  headingClassName?: string;
}

export function Section({
  id,
  heading,
  eyebrow,
  children,
  className,
  headingClassName,
}: SectionProps) {
  return (
    <section id={id} className={cn('border-t border-ink-line/70 py-20 lg:py-28', className)}>
      <div className="reveal-up mx-auto max-w-6xl px-5 sm:px-8">
        {eyebrow && (
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-mark">{eyebrow}</p>
        )}
        <h2
          className={cn(
            'display mt-3 text-3xl text-ink-fg sm:text-4xl lg:text-5xl',
            headingClassName,
          )}
        >
          {heading}
        </h2>
        {children}
      </div>
    </section>
  );
}
