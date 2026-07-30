import { Check, Highlighter, Volume2 } from 'lucide-react';

/* Real artifacts at small scale, so the section shows the output instead of describing it. */

const shell = 'rounded-md border border-ink-line bg-ink-raised p-5';
const cite = 'mt-3 flex items-center gap-1.5 font-mono text-xs tabular text-mark';

export function QuizSample() {
  return (
    <div className={shell}>
      <p className="font-mono text-xs text-ink-muted">Question 4 of 10</p>
      <p className="mt-2 font-medium text-ink-fg">Where does glycolysis take place?</p>
      <ul className="mt-3 space-y-1.5 text-sm">
        <li className="flex items-center gap-2 rounded-sm border border-correct/40 bg-correct/10 px-3 py-2 text-ink-fg">
          <Check aria-hidden className="size-4 text-correct" />
          The cytoplasm
        </li>
        <li className="rounded-sm border border-ink-line px-3 py-2 text-ink-muted">
          The mitochondrial matrix
        </li>
      </ul>
      <p className={cite}>
        <Highlighter aria-hidden className="size-3.5" />
        From page 41
      </p>
    </div>
  );
}

export function CardSample() {
  return (
    <div className={shell}>
      <p className="font-mono text-xs text-ink-muted">12 of 23</p>
      <p className="mt-2 font-medium text-ink-fg">What does NADH do?</p>
      <p className="mt-2 text-sm text-ink-muted">
        Carries electrons to the electron transport chain.
      </p>
      <div className="mt-3 grid grid-cols-4 gap-1.5 text-center font-mono text-[0.65rem]">
        {[
          ['Again', '10m'],
          ['Hard', '1d'],
          ['Good', '3d'],
          ['Easy', '6d'],
        ].map(([label, interval]) => (
          <div key={label} className="rounded-sm border border-ink-line px-1 py-1.5">
            <div className="text-ink-fg">{label}</div>
            <div className="text-ink-muted">{interval}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExplanationSample() {
  return (
    <div className={shell}>
      <div className="flex flex-wrap gap-1.5 font-mono text-[0.65rem]">
        {['Simple', 'Normal', 'Deep'].map((depth, i) => (
          <span
            key={depth}
            className={
              i === 0
                ? 'rounded-full bg-mark px-2.5 py-1 text-ink'
                : 'rounded-full border border-ink-line px-2.5 py-1 text-ink-muted'
            }
          >
            {depth}
          </span>
        ))}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-fg">
        Think of NADH as a courier. It picks up electrons in the Krebs cycle and drops them at the
        start of the transport chain.
      </p>
      <p className={cite}>
        <Volume2 aria-hidden className="size-3.5" />
        Based on pages 47 to 49
      </p>
    </div>
  );
}

export function ExamSample() {
  return (
    <div className="paper-sheet rounded-md shadow-lg">
      <p className="paper-sheet__header px-5 py-2.5 font-mono text-[0.65rem] uppercase tracking-widest text-paper-muted">
        Cellular Respiration &middot; 45 minutes &middot; 25 questions
      </p>
      <ol className="space-y-3 px-5 py-4 text-sm text-paper-fg">
        <li>
          <span className="font-mono text-paper-muted">1.</span> Which molecule is the primary
          electron carrier?
        </li>
        <li>
          <span className="font-mono text-paper-muted">2.</span> Glycolysis occurs in the
          cytoplasm. True or false?
        </li>
        <li className="text-paper-muted">
          <span className="font-mono">3.</span> Explain why the cycle turns twice.
        </li>
      </ol>
    </div>
  );
}
