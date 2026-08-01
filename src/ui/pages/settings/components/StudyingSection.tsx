import { useState } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { DAILY_CARD_LIMIT_MAX, DAILY_CARD_LIMIT_MIN } from '@/domain/settings/synced';
import { settings as copy } from '@/copy/labels';
import { Group, Row, Toggle } from './SettingsPrimitives';

export function StudyingSection() {
  const { settings, update } = useSettings();
  /* Held as a draft so the field can be empty mid-edit without a 0 reaching the review session,
     and so a value arriving from another device is not overwritten by a half-typed one. Adjusted
     during render rather than in an effect, per React's "storing information from previous
     renders" pattern -- the prevLimit guard makes this idempotent, so it does not loop. */
  const [draft, setDraft] = useState(String(settings.dailyCardLimit));
  const [prevLimit, setPrevLimit] = useState(settings.dailyCardLimit);
  if (settings.dailyCardLimit !== prevLimit) {
    setPrevLimit(settings.dailyCardLimit);
    setDraft(String(settings.dailyCardLimit));
  }

  function commit() {
    void update({ dailyCardLimit: Number(draft) });
  }

  return (
    <Group title={copy.studying}>
      <Row label={copy.dailyCardLimit}>
        <input
          type="number"
          inputMode="numeric"
          min={DAILY_CARD_LIMIT_MIN}
          max={DAILY_CARD_LIMIT_MAX}
          aria-label={copy.dailyCardLimit}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          className="min-h-11 w-24 rounded-md border border-line bg-surface px-3 text-base tabular text-fg"
        />
      </Row>

      <Row label={copy.focusTimer} hint={copy.focusTimerHint}>
        <Toggle
          label={copy.focusTimer}
          checked={settings.focusTimerEnabled}
          onChange={(focusTimerEnabled) => void update({ focusTimerEnabled })}
        />
      </Row>
    </Group>
  );
}
