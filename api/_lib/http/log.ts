/* console.* output is captured by Vercel's function logs at no extra cost -- the free observability
   mechanism available here. Never pass prompts, document text, or a raw IP: only the salted hash
   and small scalar fields. */
export function logEvent(event: string, fields: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ event, ts: Date.now(), ...fields }));
}
