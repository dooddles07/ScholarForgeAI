import type { ReactNode } from 'react';
import { useAppearance, useSettings } from '@/hooks/use-settings';
import { PageHeader } from '@/ui/components/PageHeader';
import { nav, settings as copy } from '@/copy/labels';
import { ApiKeyField } from './ApiKeyField';
import { DangerZone } from './DangerZone';

export default function SettingsPage() {
  useAppearance();
  const { settings, update } = useSettings();

  return (
    <>
      <PageHeader title={nav.settings} />

      <div className="px-4 pt-6 md:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
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
          </Group>

          <Group title={copy.studying}>
            <Row label={copy.dailyCardLimit}>
              <input
                type="number"
                inputMode="numeric"
                min={5}
                max={200}
                aria-label={copy.dailyCardLimit}
                value={settings.dailyCardLimit}
                onChange={(e) => void update({ dailyCardLimit: Number(e.target.value) })}
                className="min-h-11 w-24 rounded-md border border-line bg-surface px-3 text-base tabular text-fg"
              />
            </Row>
          </Group>

          <Group title={copy.ai}>
            <ApiKeyField
              value={settings.userApiKey}
              onSave={(userApiKey) => void update({ userApiKey })}
            />
          </Group>

          <Group title={copy.yourData}>
            <DangerZone />
          </Group>

          <Group title={copy.about}>
            <Row label={copy.version}>
              <span className="font-mono text-base tabular text-fg-muted">0.1.0</span>
            </Row>
            <Row label={copy.sourceCode}>
              <a
                href="https://github.com/dooddles07/ScholarForgeAI"
                className="min-h-11 text-base text-accent underline"
              >
                On GitHub
              </a>
            </Row>
          </Group>
        </div>
      </div>
    </>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      <div className="mt-3 divide-y divide-line rounded-md border border-line">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-base text-fg">{label}</p>
        {hint && <p className="mt-0.5 text-sm text-fg-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-[--duration-fast] ${
        checked ? 'bg-accent' : 'bg-line'
      }`}
    >
      <span
        className={`absolute top-1 size-5 rounded-full bg-white transition-[left] duration-[--duration-fast] ${
          checked ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  );
}
