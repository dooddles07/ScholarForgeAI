import { useState } from 'react';
import { useDeleteEverything } from '@/hooks/use-delete-everything';
import { Button } from '@/ui/components/primitives/Button';
import { deleteAll, storage } from '@/copy/labels';

export function DangerZone() {
  const deleteEverything = useDeleteEverything();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="p-4">
      <p className="max-w-[62ch] text-sm text-fg-muted">{storage.firstRun}</p>

      {confirming ? (
        <div className="mt-5 rounded-md border border-incorrect/40 bg-incorrect-soft p-4">
          <p className="text-base font-medium text-fg">{deleteAll.confirmHeading}</p>
          <p className="mt-2 max-w-[62ch] text-sm text-fg-muted">{deleteAll.confirmBody}</p>
          <p className="mt-2 text-sm text-fg-muted">{deleteAll.suggestion}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {/* The cancel button says what keeping means: "Cancel" is ambiguous under stress. */}
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              {deleteAll.cancel}
            </Button>
            <Button variant="destructive" onClick={() => void deleteEverything()}>
              {deleteAll.confirm}
            </Button>
          </div>
        </div>
      ) : (
        /* Destructive action sits at the end of the group, never bottom-anchored where a thumb
           lands by accident. */
        <Button variant="secondary" className="mt-5" onClick={() => setConfirming(true)}>
          {deleteAll.label}
        </Button>
      )}
    </div>
  );
}
