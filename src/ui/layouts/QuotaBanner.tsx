import { TriangleAlert } from 'lucide-react';
import { useLowQuotaWarning } from '@/hooks/use-quota-warning';
import { quotaWarning } from '@/copy/errors';

/* Mirrors OfflineBanner: same collapse transition, same role/aria-live, no dismiss control — the
   number only moves down over a day, so hiding it would show a stale state rather than none. */
export function QuotaBanner() {
  const remaining = useLowQuotaWarning();

  return (
    <div
      className={`grid transition-[grid-template-rows] duration-[--duration-slow] ease-[--ease] ${
        remaining !== null ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className="overflow-hidden">
        {remaining !== null && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-2 border-b border-line bg-surface px-4 py-2.5 text-sm text-fg-muted"
          >
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
            <p>{quotaWarning.message(remaining)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
