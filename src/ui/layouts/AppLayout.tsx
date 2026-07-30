import { Outlet } from 'react-router';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { OfflineBanner } from './OfflineBanner';
import { nav } from '@/copy/labels';

export function AppLayout() {
  return (
    <div className="min-h-dvh bg-bg">
      <a href="#main" className="skip-link">
        {nav.skipToContent}
      </a>

      <Sidebar />

      <div className="lg:pl-60">
        <OfflineBanner />
        {/* Bottom padding clears the tab bar; it is only present below lg. */}
        <main id="main" tabIndex={-1} className="pb-28 lg:pb-12">
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
