import { Section } from './Section';
import { cost } from '@/copy/marketing';

export function Cost() {
  return (
    <Section id="cost" heading={cost.heading} eyebrow="What it costs">
      <p className="mt-4 max-w-[62ch] text-lg text-ink-muted">{cost.body}</p>

      {/*
        Horizontal scroll is contained here; the page body never scrolls sideways. tabIndex makes
        the scroll region reachable by keyboard, which axe flags otherwise.
      */}
      <div
        tabIndex={0}
        role="region"
        aria-label={cost.tableCaption}
        className="mt-10 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0"
      >
        <table className="w-full min-w-[42rem] border-collapse text-left">
          <caption className="sr-only">{cost.tableCaption}</caption>
          <thead>
            <tr className="border-b border-ink-line">
              {cost.columns.map((column, i) => (
                <th
                  key={column}
                  scope="col"
                  className={
                    'py-3 font-mono text-xs font-normal uppercase tracking-[0.14em] text-ink-muted' +
                    (i === cost.columns.length - 1 ? ' text-right' : '')
                  }
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cost.rows.map((row) => (
              <tr key={row[0]} className="border-b border-ink-line/60">
                <th scope="row" className="py-4 pr-4 font-medium text-ink-fg">
                  {row[0]}
                </th>
                <td className="py-4 pr-4 text-ink-muted">{row[1]}</td>
                <td className="py-4 pr-4 text-ink-muted">{row[2]}</td>
                <td className="py-4 text-right font-mono tabular text-mark">{row[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="display mt-8 text-2xl text-ink-fg sm:text-3xl">{cost.total}</p>
      <p className="mt-4 max-w-[62ch] text-base leading-relaxed text-ink-muted">{cost.footnote}</p>
    </Section>
  );
}
