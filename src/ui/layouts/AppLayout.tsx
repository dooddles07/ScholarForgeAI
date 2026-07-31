import { Outlet, useLocation } from 'react-router';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { OfflineBanner } from './OfflineBanner';
import { AuthGate } from '@/ui/components/AuthGate';
import { useAppearance } from '@/hooks/use-settings';
import { useSettingsSync } from '@/hooks/use-settings-sync';
import { nav } from '@/copy/labels';

/* Both hooks belong here rather than on a page: a theme arriving from another device, or the
   device flipping to dark at sunset, has to reach every route, not just the one that asked. */
export function AppLayout() {
  const location = useLocation();
  useAppearance();
  useSettingsSync();

  return (
    <AuthGate>
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
    </AuthGate>
  );
}
