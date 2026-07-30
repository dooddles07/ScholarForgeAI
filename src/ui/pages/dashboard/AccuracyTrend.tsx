import type { Attempt } from '@/domain/types';

/*
 * Hand-written SVG rather than a charting library. This is one polyline and a baseline; recharts
 * would cost more in bundle weight than the whole dashboard route. Resolves the charting question
 * left open in docs/06-PLANNING/OPEN-QUESTIONS.md.
 */
export function AccuracyTrend({
  attempts,
  className,
}: {
  attempts: Attempt[];
  className?: string;
}) {
  const points = attempts
    .slice()
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((a) => a.score ?? 0);

  if (points.length < 2) {
    return (
      <section className={className}>
        <h2 className="text-lg font-semibold text-fg">Accuracy over time</h2>
        <p className="mt-2 text-base text-fg-muted">
          Take one more quiz and a trend line will appear here.
        </p>
      </section>
    );
  }

  const width = 600;
  const height = 160;
  const stepX = width / (points.length - 1);
  const path = points
    .map((value, i) => `${i === 0 ? 'M' : 'L'} ${i * stepX} ${height - (value / 100) * height}`)
    .join(' ');

  const latest = points.at(-1) ?? 0;
  const first = points[0] ?? 0;

  return (
    <section className={className}>
      <h2 className="text-lg font-semibold text-fg">Accuracy over time</h2>
      <p className="mt-1 font-mono text-sm tabular text-fg-muted">
        {first}% to {latest}% across {points.length} quizzes
      </p>

      <div className="mt-4 rounded-md border border-line bg-surface p-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-40 w-full"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Accuracy across ${points.length} quizzes, from ${first} percent to ${latest} percent`}
        >
          <line
            x1="0"
            y1={height / 2}
            x2={width}
            y2={height / 2}
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={path}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      {/* The same numbers as text, because a line is not readable by everyone. */}
      <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs tabular text-fg-muted">
        {points.map((value, i) => (
          <li key={i}>
            #{i + 1}: {value}%
          </li>
        ))}
      </ol>
    </section>
  );
}
