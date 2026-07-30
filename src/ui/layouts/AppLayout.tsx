import { Outlet, useLocation } from 'react-router';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { OfflineBanner } from './OfflineBanner';
import { nav } from '@/copy/labels';

export function AppLayout() {
  const location = useLocation();

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
          <div key={location.pathname} className="route-fade">
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
