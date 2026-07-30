import { useEffect, useState } from 'react';
import { CloudOff } from 'lucide-react';
import { offline } from '@/copy/labels';

/* Names what still works first. The connection is already gone; listing losses does not help. */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  return (
    <div
      className={`grid transition-[grid-template-rows] duration-[--duration-slow] ease-[--ease] ${
        isOffline ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className="overflow-hidden">
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2 border-b border-line bg-surface px-4 py-2.5 text-sm text-fg-muted"
        >
          <CloudOff aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          <p>{offline.banner}</p>
        </div>
      </div>
    </div>
  );
}
