import { useCallback } from 'react';
import { getSettings, updateSettings } from '@/persistence/settings';
import { recordStudyDay, type StreakEvent } from '@/domain/streak/streak';

/* Called from any real study action (a card rated, a quiz question answered). Reads the current
   settings fresh rather than trusting a possibly-stale value from a hook, since this can fire
   from several places in quick succession. */
export function useRecordStudyDay() {
  return useCallback(async (): Promise<StreakEvent> => {
    const settings = await getSettings();
    const update = recordStudyDay({
      streakCount: settings.streakCount,
      streakLastDay: settings.streakLastDay,
      streakGraceUsed: settings.streakGraceUsed,
    });

    if (update.event !== 'sameDay') {
      await updateSettings({
        streakCount: update.streakCount,
        streakLastDay: update.streakLastDay,
        streakGraceUsed: update.streakGraceUsed,
      });
    }

    return update.event;
  }, []);
}
