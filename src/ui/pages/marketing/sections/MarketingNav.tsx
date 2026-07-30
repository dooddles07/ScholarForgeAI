import { Link } from 'react-router';
import { nav } from '@/copy/marketing';

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-line/70 bg-ink/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link to="/" className="text-base font-semibold tracking-tight text-ink-fg">
          ScholarForge
          <span className="ml-1.5 font-mono text-xs text-mark">AI</span>
        </Link>

        <nav aria-label="Sections" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {nav.links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="flex min-h-11 items-center rounded-md px-3 text-sm text-ink-muted transition-colors duration-[--duration-fast] hover:bg-ink-raised hover:text-ink-fg"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <Link
          to="/app/library"
          className="flex min-h-11 items-center rounded-md border border-ink-line px-4 text-sm font-medium text-ink-fg transition-colors duration-[--duration-fast] hover:bg-ink-raised"
        >
          {nav.openApp}
        </Link>
      </div>
    </header>
  );
}
