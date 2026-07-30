import { useState } from 'react';
import { Button } from '@/ui/components/primitives/Button';
import { byok } from '@/copy/labels';

/*
 * Asking someone to paste a credential without saying what happens to it is not acceptable, so
 * the privacy note sits next to the field rather than in a policy page.
 */
export function ApiKeyField({
  value,
  onSave,
}: {
  value: string | null;
  onSave: (key: string | null) => void;
}) {
  const [draft, setDraft] = useState('');
  const saved = Boolean(value);

  if (saved) {
    return (
      <div className="p-4">
        <p className="text-base text-fg">{byok.confirmation}</p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => {
            setDraft('');
            onSave(null);
          }}
        >
          {byok.remove}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <p className="text-base font-medium text-fg">{byok.heading}</p>
      <p className="mt-1 max-w-[62ch] text-sm text-fg-muted">{byok.intro}</p>

      <ol className="mt-4 space-y-1.5 text-sm text-fg-muted">
        {[byok.step1, byok.step2, byok.step3].map((step, i) => (
          <li key={step} className="flex gap-2">
            <span className="font-mono tabular text-fg-muted">{i + 1}.</span>
            {step}
          </li>
        ))}
      </ol>

      <div className="mt-4">
        <label htmlFor="api-key" className="text-base text-fg">
          {byok.fieldLabel}
        </label>
        <input
          id="api-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-describedby="api-key-privacy"
          className="mt-1.5 min-h-11 w-full rounded-md border border-line bg-surface px-3 font-mono text-base text-fg"
        />
        <p id="api-key-privacy" className="mt-2 max-w-[62ch] text-sm text-fg-muted">
          {byok.privacyNote}
        </p>
      </div>

      <Button className="mt-4" disabled={!draft.trim()} onClick={() => onSave(draft.trim())}>
        {byok.save}
      </Button>
    </div>
  );
}
