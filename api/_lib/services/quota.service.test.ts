import { afterEach, describe, expect, it, vi } from 'vitest';

const redisMock = {
  get: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
};

vi.mock('@upstash/redis', () => ({
  Redis: { fromEnv: vi.fn(() => redisMock) },
}));

import { Redis } from '@upstash/redis';
import { checkAndConsumeQuota, incrementErrorCounter } from './quota.service.js';

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
  vi.clearAllMocks();
});

describe('checkAndConsumeQuota', () => {
  it('fails closed when Redis.fromEnv throws', async () => {
    vi.mocked(Redis.fromEnv).mockImplementationOnce(() => {
      throw new Error('no creds');
    });
    expect(await checkAndConsumeQuota('hash')).toEqual({
      ok: false,
      reason: 'SERVICE_UNAVAILABLE',
      remaining: 0,
    });
  });

  it('short-circuits on the kill switch without incrementing counters', async () => {
    redisMock.get.mockResolvedValue(true);
    expect(await checkAndConsumeQuota('hash')).toEqual({
      ok: false,
      reason: 'SERVICE_DISABLED',
      remaining: 0,
    });
    expect(redisMock.incr).not.toHaveBeenCalled();
  });

  it('fails closed when a counter increment rejects', async () => {
    redisMock.get.mockResolvedValue(false);
    redisMock.incr.mockRejectedValue(new Error('down'));
    expect(await checkAndConsumeQuota('hash')).toEqual({
      ok: false,
      reason: 'SERVICE_UNAVAILABLE',
      remaining: 0,
    });
  });

  it('sets a TTL only on the first increment of each daily counter', async () => {
    redisMock.get.mockResolvedValue(false);
    // burst-ip, burst-global (both past their first increment, no expire), daily-ip (first), daily-global (not first)
    redisMock.incr
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(5);
    const result = await checkAndConsumeQuota('hash');
    expect(redisMock.expire).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
  });

  it('does not re-set the TTL on subsequent increments', async () => {
    redisMock.get.mockResolvedValue(false);
    redisMock.incr
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(5);
    await checkAndConsumeQuota('hash');
    expect(redisMock.expire).not.toHaveBeenCalled();
  });

  it('respects DAILY_IP_LIMIT and rejects once it is exceeded', async () => {
    process.env.DAILY_IP_LIMIT = '2';
    redisMock.get.mockResolvedValue(false);
    redisMock.incr
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(3);
    expect(await checkAndConsumeQuota('hash')).toEqual({
      ok: false,
      reason: 'QUOTA_EXCEEDED',
      remaining: 0,
    });
  });

  it('respects DAILY_GLOBAL_LIMIT and rejects once it is exceeded', async () => {
    process.env.DAILY_GLOBAL_LIMIT = '2';
    redisMock.get.mockResolvedValue(false);
    redisMock.incr
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(3);
    expect(await checkAndConsumeQuota('hash')).toEqual({
      ok: false,
      reason: 'QUOTA_EXCEEDED',
      remaining: 0,
    });
  });

  it('returns OK with the remaining daily allowance on the happy path', async () => {
    process.env.DAILY_IP_LIMIT = '40';
    redisMock.get.mockResolvedValue(false);
    // burst-ip, burst-global, daily-ip, daily-global
    redisMock.incr
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(5);
    expect(await checkAndConsumeQuota('hash')).toEqual({ ok: true, reason: 'OK', remaining: 35 });
  });

  it('rejects with RATE_LIMITED once BURST_IP_LIMIT is exceeded, without touching daily counters', async () => {
    process.env.BURST_IP_LIMIT = '3';
    redisMock.get.mockResolvedValue(false);
    redisMock.incr.mockResolvedValueOnce(4).mockResolvedValueOnce(1);
    expect(await checkAndConsumeQuota('hash')).toEqual({
      ok: false,
      reason: 'RATE_LIMITED',
      remaining: 0,
    });
    expect(redisMock.incr).toHaveBeenCalledTimes(2); // burst-ip, burst-global only
  });

  it('rejects with RATE_LIMITED once BURST_GLOBAL_LIMIT is exceeded', async () => {
    process.env.BURST_GLOBAL_LIMIT = '3';
    redisMock.get.mockResolvedValue(false);
    redisMock.incr.mockResolvedValueOnce(1).mockResolvedValueOnce(4);
    expect(await checkAndConsumeQuota('hash')).toEqual({
      ok: false,
      reason: 'RATE_LIMITED',
      remaining: 0,
    });
  });

  it('sets a 90s TTL on burst keys only on their first increment', async () => {
    redisMock.get.mockResolvedValue(false);
    redisMock.incr
      .mockResolvedValueOnce(1) // burst-ip, first
      .mockResolvedValueOnce(1) // burst-global, first
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    await checkAndConsumeQuota('hash');
    expect(redisMock.expire).toHaveBeenCalledWith(expect.stringContaining('burst:'), 90);
  });
});

describe('incrementErrorCounter', () => {
  it('increments a key scoped by code and date, setting TTL only on the first increment', async () => {
    redisMock.incr.mockResolvedValueOnce(1);
    await incrementErrorCounter('BAD_REQUEST');
    expect(redisMock.incr).toHaveBeenCalledWith(expect.stringMatching(/^errors:BAD_REQUEST:\d{4}-\d{2}-\d{2}$/));
    expect(redisMock.expire).toHaveBeenCalledTimes(1);
  });

  it('does not re-set the TTL on subsequent increments', async () => {
    redisMock.incr.mockResolvedValueOnce(4);
    await incrementErrorCounter('BAD_REQUEST');
    expect(redisMock.expire).not.toHaveBeenCalled();
  });

  it('resolves silently when Redis is unreachable, never throwing', async () => {
    redisMock.incr.mockRejectedValueOnce(new Error('down'));
    await expect(incrementErrorCounter('BAD_REQUEST')).resolves.toBeUndefined();
  });

  it('resolves silently when Redis.fromEnv throws', async () => {
    vi.mocked(Redis.fromEnv).mockImplementationOnce(() => {
      throw new Error('no creds');
    });
    await expect(incrementErrorCounter('BAD_REQUEST')).resolves.toBeUndefined();
  });
});
