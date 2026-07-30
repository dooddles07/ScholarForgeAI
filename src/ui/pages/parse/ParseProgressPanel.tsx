import type { ParseProgress } from '@/parsing';
import { parsing } from '@/copy/labels';

const STAGE_ORDER = ['reading', 'extracting', 'checking', 'structure', 'finishing'] as const;

function stageText(progress: ParseProgress): string {
  switch (progress.stage) {
    case 'extracting':
      return progress.page && progress.total
        ? parsing.extracting(progress.page, progress.total)
        : parsing.reading;
    case 'reading':
      return parsing.reading;
    case 'checking':
      return parsing.checking;
    case 'structure':
      return parsing.structure;
    case 'finishing':
      return parsing.finishing;
  }
}

/*
 * Named stages with real numbers rather than an indeterminate spinner. This screen carries the
 * first impression of whether the thing is competent.
 */
export function ParseProgressPanel({
  fileName,
  progress,
}: {
  fileName: string;
  progress: ParseProgress;
}) {
  const stageIndex = STAGE_ORDER.indexOf(progress.stage);
  const withinStage =
    progress.page && progress.total ? progress.page / progress.total : stageIndex === 0 ? 0 : 1;
  const percent = Math.round(((stageIndex + withinStage) / STAGE_ORDER.length) * 100);

  return (
    <div>
      <p className="truncate font-mono text-sm text-fg-muted">{fileName}</p>

      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Reading your file"
        className="mt-4 h-2 overflow-hidden rounded-full bg-surface"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-[--duration] ease-[--ease]"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p aria-live="polite" className="mt-4 text-xl font-medium text-fg">
        {stageText(progress)}
      </p>
      <p className="mt-1 font-mono text-sm tabular text-fg-muted">{percent}%</p>
    </div>
  );
}
