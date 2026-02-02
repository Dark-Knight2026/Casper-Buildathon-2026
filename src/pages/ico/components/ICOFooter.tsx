import { ICO_CONFIG } from '@/constants/ico';

export function ICOFooter() {
  return (
    <footer className="w-full min-h-23 border-[hsl(var(--ico-form-border))] py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[hsl(var(--ico-text-secondary))]">
          <p>Powered by Casper Network</p>
          <div className="flex items-center gap-4">
            <a
              href={ICO_CONFIG.CASPER.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[hsl(var(--ico-brand-primary))] transition-colors"
            >
              Block Explorer
            </a>
            <span>|</span>
            <span>CEP-18 Token Standard</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default ICOFooter;
