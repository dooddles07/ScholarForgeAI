import { useExportBackup, useImportBackup } from '@/hooks/use-backup';
import { useSettings } from '@/hooks/use-settings';
import { useStorageEstimate } from '@/hooks/use-storage-estimate';
import { formatBytes } from '@/domain/validation/file-check';
import { relativeTime } from '@/lib/format';
import { Button } from '@/ui/components/primitives/Button';
import { settings as copy, storage as storageCopy } from '@/copy/labels';
import { DangerZone } from '../DangerZone';
import { Group, Row } from './SettingsPrimitives';

/* Past this the browser is close enough to evicting data that the user should hear about it. */
const WARN_PERCENT = 80;
const BLOCKED_PERCENT = 95;

export function DataSection() {
  const { settings, update } = useSettings();
  const exportBackup = useExportBackup();
  const { status: importStatus, inputRef, trigger: triggerImport, handleFile } = useImportBackup();
  const estimate = useStorageEstimate(
    !settings.hasRequestedPersistence,
    () => void update({ hasRequestedPersistence: true }),
  );

  return (
    <Group title={copy.yourData}>
      {estimate !== undefined && (
        <Row
          label={copy.storageUsed}
          hint={
            estimate === null
              ? copy.storageUnknown
              : copy.storageUsedValue(formatBytes(estimate.usedBytes), estimate.percentUsed)
          }
        >
          {estimate !== null && estimate.percentUsed >= WARN_PERCENT && (
            <p role="status" className="text-sm text-warning">
              {estimate.percentUsed >= BLOCKED_PERCENT
                ? storageCopy.blocked95
                : storageCopy.warning80(estimate.percentUsed)}
            </p>
          )}
        </Row>
      )}

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
        {settings.lastExportAt && (
          <p className="w-full text-sm text-fg-muted">
            {copy.lastExported(relativeTime(settings.lastExportAt))}
          </p>
        )}
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
  );
}
