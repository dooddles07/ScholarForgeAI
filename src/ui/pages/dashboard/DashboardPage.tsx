import { Link } from 'react-router';
import { useAppearance, useSettings } from '@/hooks/use-settings';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import { PageHeader } from '@/ui/components/PageHeader';
import { nav, streak } from '@/copy/labels';
import { emptyStates } from '@/copy/empty-states';
import { AccuracyTrend } from './AccuracyTrend';
import { WeakTopics } from './WeakTopics';

export default function DashboardPage() {
  useAppearance();
  const { settings } = useSettings();
  const stats = useDashboardStats();

  if (!stats) return null;

  const hasData = stats.completed.length > 0 || stats.reviewCount > 0;

  return (
    <>
      <PageHeader title={nav.progress} />

      <div className="px-4 pt-6 md:px-8">
        <div className="mx-auto max-w-3xl lg:mx-0 lg:max-w-4xl">
          {!hasData ? (
            <div className="max-w-md">
              {/* No fake sample charts. */}
              <p className="text-base text-fg-muted">{emptyStates.dashboard.body}</p>
              <Link to="/app/library" className="mt-4 inline-block text-base text-accent underline">
                {emptyStates.dashboard.action}
              </Link>
            </div>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat label="Due today" value={String(stats.dueCount)} />
                <Stat label="Cards reviewed" value={String(stats.reviewCount)} />
                <Stat
                  label="Streak"
                  value={
                    settings.streakCount > 0 ? streak.active(settings.streakCount) : 'Not started'
                  }
                />
              </dl>

              <AccuracyTrend attempts={stats.completed} className="mt-10" />
              <WeakTopics attempts={stats.completed} className="mt-10" />
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-surface p-4">
      <dt className="text-sm text-fg-muted">{label}</dt>
      {/* Numbers over gauges. "7 of 10" beats a dial. */}
      <dd className="mt-1 text-2xl font-semibold tabular text-fg">{value}</dd>
    </div>
  );
}
