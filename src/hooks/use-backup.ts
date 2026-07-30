import { useCallback, useRef, useState } from 'react';
import { exportBackup, importBackup } from '@/persistence/backup';
import { isBackupPayload } from '@/domain/export/backup';
import { downloadTextFile } from '@/lib/download';
import { updateSettings } from '@/persistence/settings';

function backupFileName(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `scholarforge-backup-${date}.json`;
}

export function useExportBackup() {
  return useCallback(async () => {
    const payload = await exportBackup();
    downloadTextFile(backupFileName(), JSON.stringify(payload, null, 2), 'application/json');
    await updateSettings({ lastExportAt: Date.now() });
  }, []);
}

export function useImportBackup() {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  const trigger = useCallback(() => inputRef.current?.click(), []);

  const handleFile = useCallback(async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isBackupPayload(parsed)) throw new Error('Not a ScholarForge backup file');
      await importBackup(parsed);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }, []);

  return { status, inputRef, trigger, handleFile };
}
