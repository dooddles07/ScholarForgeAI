import { Link } from 'react-router';
import { useAppearance, useSettings } from '@/hooks/use-settings';
import { useDueCards } from '@/hooks/use-deck';
import { PageHeader } from '@/ui/components/PageHeader';
import { ReviewSession } from '@/ui/components/ReviewSession';
import { nav } from '@/copy/labels';
import { emptyStates } from '@/copy/empty-states';

export default function ReviewPage() {
  useAppearance();
  const { settings } = useSettings();
  const dueCards = useDueCards(settings.dailyCardLimit);

  if (dueCards === undefined) return null;

  return (
    <>
      <PageHeader
        title={nav.review}
        meta={dueCards.length > 0 ? `${dueCards.length} due today` : undefined}
      />

      <div className="px-4 pt-6 md:px-8">
        {dueCards.length === 0 ? (
          <div className="mx-auto max-w-md text-center">
            <p className="text-base text-fg-muted">{emptyStates.dueToday.body}</p>
            <Link to="/app/library" className="mt-5 inline-block text-base text-accent underline">
              {emptyStates.dashboard.action}
            </Link>
          </div>
        ) : (
          <ReviewSession
            cards={dueCards}
            doneAction={
              <Link to="/app/dashboard" className="text-base text-accent underline">
                See my progress
              </Link>
            }
          />
        )}
      </div>
    </>
  );
}
