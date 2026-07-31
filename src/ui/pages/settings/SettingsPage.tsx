import { PageHeader } from '@/ui/components/PageHeader';
import { nav, settings as copy } from '@/copy/labels';
import { AppearanceSection } from './components/AppearanceSection';
import { StudyingSection } from './components/StudyingSection';
import { DataSection } from './components/DataSection';
import { Group } from './components/SettingsPrimitives';
import { CloudSyncSection } from './CloudSyncSection';

export default function SettingsPage() {
  return (
    <>
      <PageHeader title={nav.settings} />

      <div className="px-4 pt-6 md:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <AppearanceSection />
          <StudyingSection />

          <Group title={copy.syncHeading}>
            <CloudSyncSection />
          </Group>

          <DataSection />
        </div>
      </div>
    </>
  );
}
