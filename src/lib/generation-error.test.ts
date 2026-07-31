import { describe, expect, it } from 'vitest';
import { generic, quota } from '@/copy/errors';
import { generationErrorMessage } from './generation-error';

function proxyError(code: string): Error {
  return Object.assign(new Error(code), { code });
}

describe('generationErrorMessage', () => {
  it('shows the honest quota message for QUOTA_EXCEEDED', () => {
    expect(generationErrorMessage(proxyError('QUOTA_EXCEEDED'))).toBe(
      `${quota.heading} ${quota.wait}`,
    );
  });

  it('shows the same message for SERVICE_DISABLED and SERVICE_UNAVAILABLE', () => {
    expect(generationErrorMessage(proxyError('SERVICE_DISABLED'))).toContain(quota.heading);
    expect(generationErrorMessage(proxyError('SERVICE_UNAVAILABLE'))).toContain(quota.heading);
  });

  it('falls back to the generic message for anything else', () => {
    expect(generationErrorMessage(proxyError('PROVIDER_ERROR'))).toBe(
      `${generic.what} ${generic.next}`,
    );
    expect(generationErrorMessage(new Error('No usable passages'))).toBe(
      `${generic.what} ${generic.next}`,
    );
    expect(generationErrorMessage('not an error')).toBe(`${generic.what} ${generic.next}`);
  });
});
