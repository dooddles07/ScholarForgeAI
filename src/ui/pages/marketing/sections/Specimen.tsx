import { Highlighter } from 'lucide-react';

/*
 * The thesis, stated as an object rather than a claim: a real page, the passage that was used,
 * and the question it produced, joined by a thread that carries the page number along with it.
 */
export function Specimen() {
  return (
    <figure className="relative mx-auto w-full max-w-sm" aria-labelledby="specimen-caption">
      <PaperFragment />

      <div className="relative flex h-14 justify-center">
        <span aria-hidden className="thread-line w-0.5 rounded-full bg-mark" />
      </div>

      <QuestionCard />

      <figcaption id="specimen-caption" className="sr-only">
        A passage on page 47 of a lecture handout, and the multiple-choice question generated from
        it, which cites that same page.
      </figcaption>
    </figure>
  );
}

function PaperFragment() {
  return (
    <div className="paper-sheet rounded-md shadow-lg">
      <p className="paper-sheet__header px-5 py-3 font-mono text-[0.7rem] tracking-wide text-paper-muted">
        lecture-notes-week-8.pdf &middot; p. 47
      </p>
      <div className="space-y-2 px-5 py-4 text-sm leading-7">
        <p className="text-paper-muted">The cycle turns twice for each molecule of glucose.</p>
        <p>
          <mark className="bg-mark/70 box-decoration-clone px-1 py-0.5 text-paper-fg">
            NADH carries electrons from the Krebs cycle to the electron transport chain.
          </mark>
        </p>
        <p className="text-paper-muted">Four oxidation steps each reduce an electron carrier.</p>
      </div>
    </div>
  );
}

function QuestionCard() {
  return (
    <div className="rounded-md border border-ink-line bg-ink-raised p-5">
      <p className="text-base font-medium text-ink-fg">
        Which molecule carries electrons from the Krebs cycle to the electron transport chain?
      </p>

      <ul className="mt-4 space-y-2">
        {['NADH', 'ATP', 'Pyruvate'].map((option, i) => (
          <li
            key={option}
            className={
              i === 0
                ? 'rounded-sm border border-mark/45 bg-mark/12 px-3 py-2 text-sm text-ink-fg'
                : 'rounded-sm border border-ink-line px-3 py-2 text-sm text-ink-muted'
            }
          >
            {option}
          </li>
        ))}
      </ul>

      <p className="mt-4 flex items-center gap-1.5 text-sm text-mark">
        <Highlighter aria-hidden className="size-4" />
        <span className="font-mono tabular">From page 47</span>
      </p>
    </div>
  );
}
