import { ICO_CONFIG } from '@/constants/ico';
import { Facebook, Instagram } from 'lucide-react';

const SOCIAL_LINKS = [
  {
    href: 'https://x.com/keychain_big?s=21',
    label: 'X (Twitter)',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    href: 'https://www.instagram.com/keychain_big?igsh=am1wZGY2dWZyZGph&utm_source=qr',
    label: 'Instagram',
    icon: <Instagram className="h-4 w-4" />,
  },
  {
    href: 'https://www.reddit.com/u/KeyChain_Admin/s/SN020wGqgz',
    label: 'Reddit',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0zm6.508 13.672c.072.344.11.702.11 1.072 0 3.496-4.062 6.336-9.075 6.336S.468 18.24.468 14.744c0-.37.038-.728.11-1.072a1.903 1.903 0 01-.685-1.46c0-1.053.855-1.907 1.908-1.907.497 0 .95.192 1.29.506 1.268-.907 3.004-1.495 4.93-1.564l.94-4.39a.382.382 0 01.456-.293l3.108.66a1.345 1.345 0 012.49.49 1.345 1.345 0 01-1.345 1.345 1.345 1.345 0 01-1.336-1.21l-2.775-.59-.84 3.926c1.893.082 3.598.672 4.846 1.57.34-.314.793-.506 1.29-.506 1.053 0 1.907.854 1.907 1.907 0 .563-.246 1.069-.635 1.418zM8.87 13.672a1.345 1.345 0 000 2.69 1.345 1.345 0 000-2.69zm6.26 0a1.345 1.345 0 000 2.69 1.345 1.345 0 000-2.69zm-1.09 4.14c-.98.98-2.87 1.058-2.04 1.058s-1.06-.078-2.04-1.058a.362.362 0 01.512-.512c.614.614 1.412.705 1.528.705s.914-.091 1.528-.705a.362.362 0 01.512.512z" />
      </svg>
    ),
  },
  {
    href: 'https://www.facebook.com/share/1HRrNWAotJ/?mibextid=wwXIfr',
    label: 'Facebook',
    icon: <Facebook className="h-4 w-4" />,
  },
];

export function ICOFooter() {
  return (
    <footer className="w-full min-h-23 border-[hsl(var(--ico-form-border))] py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[hsl(var(--ico-text-secondary))]">
          <p>Powered by Casper Network</p>
          <div className="flex items-center gap-3">
            {SOCIAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                className="hover:text-[hsl(var(--ico-brand-primary))] transition-colors"
              >
                {link.icon}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/big-token/whitepaper"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[hsl(var(--ico-brand-primary))] transition-colors"
            >
              BIG Whitepaper
            </a>
            <span>|</span>
            <a
              href={ICO_CONFIG.CASPER.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[hsl(var(--ico-brand-primary))] transition-colors"
            >
              Block Explorer
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

