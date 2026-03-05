import { Logo } from './Logo';
import { ExternalLinkIcon } from './Icons';

const FOOTER_LINKS = [
  { href: 'http://dashboard.local:8001/', label: 'Dashboard' },
  { href: 'https://bitcoindev.info/', label: 'BitcoinDev' },
  { href: 'https://christof.digital/', label: 'christof.digital' },
] as const;

export function Footer() {
  return (
    <footer className="mt-8 pt-4 border-t border-level-3 flex items-center justify-center gap-6 flex-wrap">
      <Logo className="h-6 w-6" />
      <nav className="flex items-center gap-4" aria-label="Footer links">
        {FOOTER_LINKS.map(({ href, label }) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link-muted text-xs"
          >
            {label}
            <ExternalLinkIcon />
          </a>
        ))}
      </nav>
    </footer>
  );
}
