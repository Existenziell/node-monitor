import { FOOTER_LEFT_LINKS, FOOTER_RIGHT_LINKS } from '@/data/links';
import { Logo } from './Logo';
import { ExternalLinkIcon } from './Icons';

function FooterLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="nav-link-muted text-xs"
    >
      {label}
      <ExternalLinkIcon />
    </a>
  );
}

export function Footer() {
  return (
    <footer className="mt-8 pt-4 border-t border-level-3 flex items-center justify-between gap-4">
      <nav className="flex items-center gap-4 flex-1 justify-end" aria-label="Footer links">
        {FOOTER_LEFT_LINKS.map(({ href, label }) => (
          <FooterLink key={href} href={href} label={label} />
        ))}
      </nav>
      <Logo className="h-6 w-6 shrink-0" />
      <nav className="flex items-center gap-4 flex-1 justify-start" aria-label="Footer links">
        {FOOTER_RIGHT_LINKS.map(({ href, label }) => (
          <FooterLink key={href} href={href} label={label} />
        ))}
      </nav>
    </footer>
  );
}
