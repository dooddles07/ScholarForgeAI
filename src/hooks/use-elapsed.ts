import { useEffect, useState } from 'react';

/* Coarse on purpose: the display is minutes, so a per-second tick would re-render for nothing. */
const TICK_MS = 10_000;

export function useElapsed(enabled: boolean): number {
  // Lazy initializer: runs exactly once, unlike useRef(Date.now()) which would call the impure
  // Date.now() on every render pass.
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setInterval(() => setElapsed(Date.now() - startedAt), TICK_MS);
    return () => clearInterval(timer);
  }, [enabled, startedAt]);

  return elapsed;
}
