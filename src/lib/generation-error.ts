import { generic, quota } from '@/copy/errors';

const QUOTA_CODES = new Set(['QUOTA_EXCEEDED', 'SERVICE_DISABLED', 'SERVICE_UNAVAILABLE']);

/* The shared quota running dry is an expected, designed state, not a bug — it gets its own
   honest message rather than the generic "something went wrong" catch-all. */
export function generationErrorMessage(error: unknown): string {
  const code = error instanceof Error && 'code' in error ? String((error as { code: unknown }).code) : undefined;
  if (code && QUOTA_CODES.has(code)) {
    return `${quota.heading} ${quota.wait}`;
  }
  return `${generic.what} ${generic.next}`;
}
