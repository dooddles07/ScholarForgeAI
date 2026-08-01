#!/usr/bin/env node
import { Redis } from '@upstash/redis';

const KEY = 'killswitch';
const [, , command] = process.argv;

function usage() {
  console.error('Usage: node scripts/kill-switch.mjs <status|on|off>');
  console.error('Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in the environment.');
  process.exit(1);
}

if (!['status', 'on', 'off'].includes(command)) usage();

let redis;
try {
  redis = Redis.fromEnv();
} catch {
  console.error('Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.');
  process.exit(1);
}

const url = process.env.UPSTASH_REDIS_REST_URL ?? '';
console.log(`Target: ${url.replace(/\/\/.*@/, '//')}`); // no credentials in output

if (command === 'status') {
  const value = await redis.get(KEY);
  console.log(value ? 'Kill switch is ON — generation disabled.' : 'Kill switch is OFF — generation enabled.');
} else if (command === 'on') {
  await redis.set(KEY, true);
  console.log('Kill switch set ON. Generation will return SERVICE_DISABLED.');
} else {
  await redis.del(KEY);
  console.log('Kill switch cleared. Generation enabled.');
}
