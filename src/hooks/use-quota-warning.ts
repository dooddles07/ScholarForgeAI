import { useSyncExternalStore } from 'react';

/*
 * Module-level singleton fed by every successful generation call's onQuotaRemaining callback.
 * Below LOW_QUOTA_THRESHOLD the number is worth a banner; above it, it is noise mid-quiz. Mirrors
 * useIsOffline's pattern (module state + subscribe) since there is no Context or state library
 * anywhere else in src/ — see docs/superpowers/specs/2026-08-01-quota-warning-banner-design.md.
 */
export const LOW_QUOTA_THRESHOLD = 5;

let remaining: number | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): number | null {
  return remaining;
}

/* Handed directly to ai/client.ts as GenerateOptions.onQuotaRemaining — a plain function, not a
   hook, so hooks/*.ts can pass it through without depending on React render timing. */
export function reportQuotaRemaining(value: number): void {
  remaining = value;
  notify();
}

/* null until a generation call has reported a value, or once that value is no longer low enough
   to mention. Zero is a valid, meaningful value — never coerced to null. */
export function useLowQuotaWarning(): number | null {
  const value = useSyncExternalStore(subscribe, getSnapshot);
  return value !== null && value < LOW_QUOTA_THRESHOLD ? value : null;
}
