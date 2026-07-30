import { NavLink, Link } from 'react-router';
import { cn } from '@/lib/utils';
import { navItems } from './nav-items';

/* From lg up, the extra width goes to navigation rather than to stretching the content. */
export function Sidebar() {
  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-line lg:bg-surface">
      <Link to="/" className="flex min-h-16 items-center px-6">
        <img src="/brand/logo-horizontal.png" alt="ScholarForge AI" className="h-6 w-auto" />
      </Link>

      <nav aria-label="Main" className="flex-1 px-3 py-2">
        <ul className="space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-base',
                    'transition-colors duration-[--duration-fast]',
                    isActive
                      ? 'bg-accent-soft font-medium text-accent'
                      : 'text-fg-muted hover:bg-surface-raised hover:text-fg',
                  )
                }
              >
                <Icon aria-hidden className="size-5" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
