/*
 * A File cannot survive a route change in the URL, and putting it in IndexedDB before we know it
 * parses would leave junk behind. Module scope is enough: it lives for one navigation.
 *
 * Read with peek, not take. StrictMode mounts an effect twice, and a destructive read leaves the
 * second pass with nothing to parse. The file is cleared once parsing settles.
 */
let pending: File | null = null;

export function setPendingFile(file: File) {
  pending = file;
}

export function peekPendingFile(): File | null {
  return pending;
}

export function clearPendingFile() {
  pending = null;
}
