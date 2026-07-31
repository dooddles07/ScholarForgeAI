import { useSettings } from '@/hooks/use-settings';
import { settings as copy } from '@/copy/labels';
import { Group, Row, Toggle } from './SettingsPrimitives';

export function AppearanceSection() {
  const { settings, update } = useSettings();

  return (
    <Group title={copy.appearance}>
      <Row label={copy.theme}>
        <select
          aria-label={copy.theme}
          value={settings.theme}
          onChange={(e) => void update({ theme: e.target.value as typeof settings.theme })}
          className="min-h-11 rounded-md border border-line bg-surface px-3 text-base text-fg"
        >
          <option value="system">{copy.themeSystem}</option>
          <option value="light">{copy.themeLight}</option>
          <option value="dark">{copy.themeDark}</option>
        </select>
      </Row>

      <Row label={copy.readingMode} hint={copy.readingModeHint}>
        <Toggle
          label={copy.readingMode}
          checked={settings.readingMode}
          onChange={(readingMode) => void update({ readingMode })}
        />
      </Row>

      <Row label={copy.reduceMotion} hint={copy.reduceMotionHint}>
        <Toggle
          label={copy.reduceMotion}
          checked={settings.reduceMotion === 'always'}
          onChange={(on) => void update({ reduceMotion: on ? 'always' : 'system' })}
        />
      </Row>
    </Group>
  );
}
