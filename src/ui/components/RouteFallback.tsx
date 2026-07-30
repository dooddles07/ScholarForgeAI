/*
 * Deliberately quiet. No pulsing skeleton: a route chunk resolves in well under a second and a
 * flashing placeholder reads as a fault.
 */
export function RouteFallback() {
  return <div className="min-h-dvh bg-bg" role="status" aria-live="polite" aria-label="Loading" />;
}
