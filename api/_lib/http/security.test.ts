import { afterEach, describe, expect, it } from 'vitest';
import { clientIp, hashIp, isAllowedOrigin } from './security.js';

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe('isAllowedOrigin', () => {
  it('accepts only the configured origin', () => {
    process.env.ALLOWED_ORIGIN = 'https://scholarforge.app';
    expect(isAllowedOrigin('https://scholarforge.app')).toBe(true);
    expect(isAllowedOrigin('https://evil.example')).toBe(false);
    expect(isAllowedOrigin(undefined)).toBe(false);
  });

  /* Deliberate, and the reason docs/SECURITY.md insists the variable is set in production: unset
     means every origin passes. */
  it('skips the check entirely when unconfigured', () => {
    delete process.env.ALLOWED_ORIGIN;
    expect(isAllowedOrigin('https://anything.example')).toBe(true);
    expect(isAllowedOrigin(undefined)).toBe(true);
  });
});

describe('clientIp', () => {
  it('takes the first address from a proxy chain', () => {
    expect(clientIp('203.0.113.5, 70.41.3.18, 150.172.238.178')).toBe('203.0.113.5');
    expect(clientIp('  203.0.113.5  ')).toBe('203.0.113.5');
  });

  it('falls back to a placeholder rather than throwing when the header is absent', () => {
    expect(clientIp(undefined)).toBe('unknown');
  });
});

describe('hashIp', () => {
  it('never returns the address itself', async () => {
    process.env.IP_HASH_SALT = 'salt';
    const hash = await hashIp('203.0.113.5');
    expect(hash).not.toContain('203.0.113.5');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is stable, so a repeat request counts against the same quota key', async () => {
    process.env.IP_HASH_SALT = 'salt';
    expect(await hashIp('203.0.113.5')).toBe(await hashIp('203.0.113.5'));
  });

  it('separates different addresses', async () => {
    process.env.IP_HASH_SALT = 'salt';
    expect(await hashIp('203.0.113.5')).not.toBe(await hashIp('203.0.113.6'));
  });

  /* The salt is what stops a hash being reversed by running every address through SHA-256. */
  it('produces a different hash under a different salt', async () => {
    process.env.IP_HASH_SALT = 'salt-a';
    const a = await hashIp('203.0.113.5');
    process.env.IP_HASH_SALT = 'salt-b';
    expect(await hashIp('203.0.113.5')).not.toBe(a);
  });
});
