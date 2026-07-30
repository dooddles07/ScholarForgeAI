import { Redis } from '@upstash/redis';

const DAY_SECONDS = 60 * 60 * 24;
const TTL_SECONDS = DAY_SECONDS * 2; // 48 hours, per RATE-LIMITING-AND-ABUSE.md

export type QuotaResult =
  | { ok: true }
  | { ok: false; reason: 'SERVICE_DISABLED' | 'QUOTA_EXCEEDED' | 'SERVICE_UNAVAILABLE' };

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/*
 * Counters increment before the caller ever reaches the model, per RATE-LIMITING-AND-ABUSE.md:
 * a failed generation still consumed real allowance against the provider, so the ceiling must
 * count it too. Fails closed: if Upstash is unreachable, the request is refused rather than let
 * through uncounted, since an unmetered outage could burn the whole day's provider quota.
 */
export async function checkAndConsumeQuota(ipHash: string): Promise<QuotaResult> {
  let redis: Redis;
  try {
    redis = Redis.fromEnv();
  } catch {
    return { ok: false, reason: 'SERVICE_UNAVAILABLE' };
  }

  try {
    const killed = await redis.get<boolean>('killswitch');
    if (killed) return { ok: false, reason: 'SERVICE_DISABLED' };

    const day = todayKey();
    const ipKey = `ip:${ipHash}:${day}`;
    const globalKey = `global:${day}`;

    const ipCount = await redis.incr(ipKey);
    if (ipCount === 1) await redis.expire(ipKey, TTL_SECONDS);

    const globalCount = await redis.incr(globalKey);
    if (globalCount === 1) await redis.expire(globalKey, TTL_SECONDS);

    const ipLimit = Number(process.env.DAILY_IP_LIMIT ?? '10');
    const globalLimit = Number(process.env.DAILY_GLOBAL_LIMIT ?? '50');

    if (ipCount > ipLimit || globalCount > globalLimit) {
      return { ok: false, reason: 'QUOTA_EXCEEDED' };
    }

    return { ok: true };
  } catch {
    return { ok: false, reason: 'SERVICE_UNAVAILABLE' };
  }
}
