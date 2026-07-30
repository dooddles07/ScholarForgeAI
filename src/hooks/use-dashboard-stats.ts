import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/persistence/db';

export function useDashboardStats() {
  return useLiveQuery(async () => {
    const [dueCount, reviewCount, attempts] = await Promise.all([
      db.cards.where('due').belowOrEqual(Date.now()).count(),
      db.reviewLog.count(),
      db.attempts.toArray(),
    ]);
    return {
      dueCount,
      reviewCount,
      completed: attempts.filter((a) => a.completedAt !== null && a.score !== null),
    };
  }, []);
}
