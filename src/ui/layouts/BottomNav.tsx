import { NavLink } from 'react-router';
import { cn } from '@/lib/utils';
import { navItems } from './nav-items';

/*
 * Bottom navigation up to lg, because the bottom third of a phone screen is the only part a
 * thumb reaches comfortably. Clears the home indicator via env(safe-area-inset-bottom).
 */
export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-raised pb-safe lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2',
                  'text-xs transition-colors duration-[--duration-fast]',
                  isActive ? 'text-accent' : 'text-fg-muted hover:text-fg',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon aria-hidden className="size-6" strokeWidth={isActive ? 2.4 : 1.8} />
                  <span className={cn(isActive && 'font-medium')}>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
