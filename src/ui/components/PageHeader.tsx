import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  meta?: string | undefined;
  backTo?: string | undefined;
  backLabel?: string | undefined;
  action?: ReactNode;
  className?: string | undefined;
}

export function PageHeader({
  title,
  meta,
  backTo,
  backLabel = 'Back',
  action,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('flex items-start gap-2 px-4 pt-4 md:px-8 md:pt-8', className)}>
      {backTo && (
        <Link
          to={backTo}
          aria-label={backLabel}
          className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors duration-[--duration-fast] hover:bg-surface hover:text-fg"
        >
          <ChevronLeft aria-hidden className="size-6" />
        </Link>
      )}

      <div className="min-w-0 flex-1 pt-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-fg md:text-3xl">{title}</h1>
        {meta && <p className="mt-1 text-sm text-fg-muted">{meta}</p>}
      </div>

      {action}
    </header>
  );
}
