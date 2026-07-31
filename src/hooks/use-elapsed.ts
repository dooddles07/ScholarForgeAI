import { useEffect, useRef, useState } from 'react';

/* Coarse on purpose: the display is minutes, so a per-second tick would re-render for nothing. */
const TICK_MS = 10_000;

export function useElapsed(enabled: boolean): number {
  const startedAt = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setInterval(() => setElapsed(Date.now() - startedAt.current), TICK_MS);
    return () => clearInterval(timer);
  }, [enabled]);

  return elapsed;
}
