import { Redis } from '@upstash/redis';

const DAY_SECONDS = 60 * 60 * 24;
const TTL_SECONDS = DAY_SECONDS * 2; // 48 hours, per docs/SECURITY.md
const BURST_TTL_SECONDS = 90; // buffer past the 60s window so a key can't linger unexpired

export type QuotaReason =
  | 'OK'
  | 'SERVICE_DISABLED'
  | 'QUOTA_EXCEEDED'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE';

/* Flat shape rather than a discriminated union on `ok: true | false`: Vercel typechecks this
   folder with its own non-strict config, where boolean literal types widen and narrowing on
   `!quota.ok` stops working. `reason` always present keeps it valid under either setting. */
export interface QuotaResult {
  ok: boolean;
  reason: QuotaReason;
  /* Per-IP daily requests left after this one. 0 whenever `ok` is false. */
  remaining: number;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function minuteKey(): string {
  return new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
}

/*
 * Counters increment before the caller ever reaches the model, per docs/SECURITY.md: a failed
 * generation still consumed real allowance against the provider, so the ceiling must count it
 * too. Fails closed: if Upstash is unreachable, the request is refused rather than let through
 * uncounted, since an unmetered outage could burn the whole day's provider quota.
 */
export async function checkAndConsumeQuota(ipHash: string): Promise<QuotaResult> {
  let redis: Redis;
  try {
    redis = Redis.fromEnv();
  } catch {
    return { ok: false, reason: 'SERVICE_UNAVAILABLE', remaining: 0 };
  }

  try {
    const killed = await redis.get<boolean>('killswitch');
    if (killed) return { ok: false, reason: 'SERVICE_DISABLED', remaining: 0 };

    /* Burst check runs first and cheapest: a request that fails it never touches the daily
       counters below, so a tight loop for a few seconds doesn't also burn the day's allowance. */
    const minute = minuteKey();
    const burstIpKey = `burst:${ipHash}:${minute}`;
    const burstGlobalKey = `burst:global:${minute}`;

    const burstIpCount = await redis.incr(burstIpKey);
    if (burstIpCount === 1) await redis.expire(burstIpKey, BURST_TTL_SECONDS);
    const burstGlobalCount = await redis.incr(burstGlobalKey);
    if (burstGlobalCount === 1) await redis.expire(burstGlobalKey, BURST_TTL_SECONDS);

    const burstIpLimit = Number(process.env.BURST_IP_LIMIT ?? '10');
    const burstGlobalLimit = Number(process.env.BURST_GLOBAL_LIMIT ?? '60');
    if (burstIpCount > burstIpLimit || burstGlobalCount > burstGlobalLimit) {
      return { ok: false, reason: 'RATE_LIMITED', remaining: 0 };
    }

    const day = todayKey();
    const ipKey = `ip:${ipHash}:${day}`;
    const globalKey = `global:${day}`;

    const ipCount = await redis.incr(ipKey);
    if (ipCount === 1) await redis.expire(ipKey, TTL_SECONDS);

    const globalCount = await redis.incr(globalKey);
    if (globalCount === 1) await redis.expire(globalKey, TTL_SECONDS);

    /* Groq's free tier allows 1,000 requests/day for the whole project. These defaults sit under
       that with margin; the dashboard values override them and are the real setting. */
    const ipLimit = Number(process.env.DAILY_IP_LIMIT ?? '40');
    const globalLimit = Number(process.env.DAILY_GLOBAL_LIMIT ?? '800');

    if (ipCount > ipLimit || globalCount > globalLimit) {
      return { ok: false, reason: 'QUOTA_EXCEEDED', remaining: 0 };
    }

    return { ok: true, reason: 'OK', remaining: Math.max(0, ipLimit - ipCount) };
  } catch {
    return { ok: false, reason: 'SERVICE_UNAVAILABLE', remaining: 0 };
  }
}
