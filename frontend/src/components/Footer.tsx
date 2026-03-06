import { FOOTER_LEFT_LINKS, FOOTER_RIGHT_LINKS } from '@/data/links';
import { Logo } from './Logo';
import { Link } from './Link';

export function Footer() {
  return (
    <footer className="mt-8 pt-4 border-t border-level-3 flex items-center justify-between gap-4">
      <nav className="flex items-center gap-4 flex-1 justify-end" aria-label="Footer links">
        {FOOTER_LEFT_LINKS.map(({ href, label }) => (
          <Link key={href} href={href} external showExternalIcon className="nav-link-muted text-xs">
            {label}
          </Link>
        ))}
      </nav>
      <Logo className="h-6 w-6 shrink-0" />
      <nav className="flex items-center gap-4 flex-1 justify-start" aria-label="Footer links">
        {FOOTER_RIGHT_LINKS.map(({ href, label }) => (
          <Link key={href} href={href} external showExternalIcon className="nav-link-muted text-xs">
            {label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
