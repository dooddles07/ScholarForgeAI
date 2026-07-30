import * as Dialog from '@radix-ui/react-dialog';
import { useDeleteEverything } from '@/hooks/use-delete-everything';
import { Button } from '@/ui/components/primitives/Button';
import { deleteAll, storage } from '@/copy/labels';

export function DangerZone() {
  const deleteEverything = useDeleteEverything();

  return (
    <div className="p-4">
      <p className="max-w-[62ch] text-sm text-fg-muted">{storage.firstRun}</p>

      <Dialog.Root>
        {/* Destructive action sits at the end of the group, never bottom-anchored where a thumb
            lands by accident. */}
        <Dialog.Trigger asChild>
          <Button variant="secondary" className="mt-5">
            {deleteAll.label}
          </Button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay fixed inset-0 z-40 bg-black/50" />
          <Dialog.Content className="dialog-content fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md rounded-md border border-incorrect/40 bg-incorrect-soft p-4">
            <Dialog.Title className="text-base font-medium text-fg">
              {deleteAll.confirmHeading}
            </Dialog.Title>
            <Dialog.Description className="mt-2 max-w-[62ch] text-sm text-fg-muted">
              {deleteAll.confirmBody}
            </Dialog.Description>
            <p className="mt-2 text-sm text-fg-muted">{deleteAll.suggestion}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {/* The cancel button says what keeping means: "Cancel" is ambiguous under stress. */}
              <Dialog.Close asChild>
                <Button variant="secondary">{deleteAll.cancel}</Button>
              </Dialog.Close>
              <Button variant="destructive" onClick={() => void deleteEverything()}>
                {deleteAll.confirm}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
