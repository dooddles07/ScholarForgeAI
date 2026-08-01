import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

afterEach(() => {
  cleanup();
  vi.resetModules();
});

/* Each test imports fresh so the module-level singleton never leaks between cases — same
   isolation technique used for module state in src/ai/client.test.ts's "real proxy mode" block. */
async function loadModule() {
  return import('./use-quota-warning');
}

function makeProbe(useLowQuotaWarning: () => number | null) {
  return function Probe() {
    const value = useLowQuotaWarning();
    return <p>{value === null ? 'none' : String(value)}</p>;
  };
}

describe('useLowQuotaWarning', () => {
  it('reports nothing before any generation call has reported a value', async () => {
    const { useLowQuotaWarning } = await loadModule();
    const Probe = makeProbe(useLowQuotaWarning);
    render(<Probe />);
    expect(screen.getByText('none')).toBeInTheDocument();
  });

  it('stays silent while remaining is at or above the threshold', async () => {
    const { useLowQuotaWarning, reportQuotaRemaining, LOW_QUOTA_THRESHOLD } = await loadModule();
    const Probe = makeProbe(useLowQuotaWarning);
    render(<Probe />);
    act(() => reportQuotaRemaining(LOW_QUOTA_THRESHOLD));
    expect(screen.getByText('none')).toBeInTheDocument();
    act(() => reportQuotaRemaining(LOW_QUOTA_THRESHOLD + 20));
    expect(screen.getByText('none')).toBeInTheDocument();
  });

  it('surfaces the number once remaining drops below the threshold', async () => {
    const { useLowQuotaWarning, reportQuotaRemaining } = await loadModule();
    const Probe = makeProbe(useLowQuotaWarning);
    render(<Probe />);
    act(() => reportQuotaRemaining(3));
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('surfaces zero rather than treating it as falsy/absent', async () => {
    const { useLowQuotaWarning, reportQuotaRemaining } = await loadModule();
    const Probe = makeProbe(useLowQuotaWarning);
    render(<Probe />);
    act(() => reportQuotaRemaining(0));
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('updates live as later calls report a different number', async () => {
    const { useLowQuotaWarning, reportQuotaRemaining } = await loadModule();
    const Probe = makeProbe(useLowQuotaWarning);
    render(<Probe />);
    act(() => reportQuotaRemaining(4));
    expect(screen.getByText('4')).toBeInTheDocument();
    act(() => reportQuotaRemaining(2));
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
