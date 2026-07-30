import * as SwitchPrimitive from '@radix-ui/react-switch';
import type { ReactNode } from 'react';
import { useAppearance, useSettings } from '@/hooks/use-settings';
import { useExportBackup, useImportBackup } from '@/hooks/use-backup';
import { PageHeader } from '@/ui/components/PageHeader';
import { Button } from '@/ui/components/primitives/Button';
import { nav, settings as copy } from '@/copy/labels';
import { ApiKeyField } from './ApiKeyField';
import { DangerZone } from './DangerZone';

export default function SettingsPage() {
  useAppearance();
  const { settings, update } = useSettings();
  const exportBackup = useExportBackup();
  const { status: importStatus, inputRef, trigger: triggerImport, handleFile } = useImportBackup();

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
            <div className="flex flex-wrap items-center gap-2 p-4">
              <Button variant="secondary" onClick={() => void exportBackup()}>
                {copy.exportAll}
              </Button>
              <Button variant="secondary" onClick={triggerImport}>
                {copy.importPack}
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = '';
                }}
              />
              {importStatus === 'success' && (
                <p role="status" className="w-full text-sm text-fg-muted">
                  {copy.importSuccess}
                </p>
              )}
              {importStatus === 'error' && (
                <p role="alert" className="w-full text-sm text-incorrect">
                  {copy.importError}
                </p>
              )}
            </div>
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
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onChange}
      aria-label={label}
      className="inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full bg-line transition-colors duration-[--duration-fast] data-[state=checked]:bg-accent"
    >
      <SwitchPrimitive.Thumb className="block size-5 translate-x-1 rounded-full bg-white transition-transform duration-[--duration-fast] data-[state=checked]:translate-x-6" />
    </SwitchPrimitive.Root>
  );
}
