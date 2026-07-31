/* Origin check and IP hashing. Both are cheap, low-bar deterrents against casual scripted abuse,
   not a security boundary against a determined attacker — see RATE-LIMITING-AND-ABUSE.md. */

export function isAllowedOrigin(origin: string | undefined): boolean {
  const allowed = process.env.ALLOWED_ORIGIN;
  if (!allowed) return true; // unset in local/preview: origin check is skipped, not enforced
  return origin === allowed;
}

export function clientIp(forwardedFor: string | undefined): string {
  return forwardedFor?.split(',')[0]?.trim() ?? 'unknown';
}

/* The IP is hashed with a server-only salt so the quota key never holds a plain address. */
export async function hashIp(ip: string): Promise<string> {
  const salt = process.env.IP_HASH_SALT ?? '';
  const bytes = new TextEncoder().encode(ip + salt);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
