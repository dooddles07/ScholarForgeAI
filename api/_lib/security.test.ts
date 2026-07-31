import { describe, expect, it } from 'vitest';
import { isPlausibleApiKey } from './security.js';

describe('isPlausibleApiKey', () => {
  it('accepts a well-formed key', () => {
    expect(isPlausibleApiKey('AIzaSyD-abc123_XYZ789example456')).toBe(true);
  });

  it('rejects a key that is too short', () => {
    expect(isPlausibleApiKey('short-key')).toBe(false);
  });

  it('rejects a key that is too long', () => {
    expect(isPlausibleApiKey('a'.repeat(201))).toBe(false);
  });

  it('rejects a key containing whitespace', () => {
    expect(isPlausibleApiKey('AIzaSyD abc123 XYZ789 example456')).toBe(false);
  });

  it('rejects a key containing a disallowed character', () => {
    expect(isPlausibleApiKey('AIzaSyD/abc123.XYZ789<example>456')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isPlausibleApiKey('')).toBe(false);
  });
});
