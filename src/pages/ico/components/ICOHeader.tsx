import { ICO_CONFIG } from '@/constants/ico';
import { MainButton } from './shared/MainButton';
import { useNavigate } from 'react-router-dom';
import { useICOWallet } from '@/hooks/ico/useICOWallet';
import { LogOut } from 'lucide-react';


export function ICOHeader() {
  const { isConnected, account, isConnecting, connect, disconnect } = useICOWallet();

  const truncateKey = (key: string) => `${key.slice(0, 6)}...${key.slice(-4)}`;

  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/ico');
  }

  return (
    <header className="relative border-b h-24 z-50 border-[hsl(var(--ico-border-color))] bg-[hsl(var(--ico-bg-card))] shadow-sm">
      <div className="container mx-auto px-4 py-2">
        <div className="flex flex-row items-center justify-between gap-4">
          {/* Logo & Token Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogoClick}
              className="w-20 h-20 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ico-brand-primary))] rounded"
              aria-label="Return to ICO overview"
            >
              <img src="/BIGLogoWB.png" alt="BIG Logo" />
            </button>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-[hsl(var(--ico-text-primary))]">
                {ICO_CONFIG.TOKEN.name}
              </h2>
              <p className="text-sm text-[hsl(var(--ico-text-secondary))]">
                {ICO_CONFIG.TOKEN.symbol} Token Sale
              </p>
            </div>
          </div>

          {isConnected && account ? (
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-[hsl(var(--ico-text-primary))] bg-[hsl(var(--ico-bg-secondary))] px-3 py-1 rounded-md border border-[hsl(var(--ico-border-color))]">
                {truncateKey(account.publicKey)}
              </span>
              <button
                onClick={disconnect}
                aria-label="Disconnect wallet"
                className="flex items-center gap-2 px-3 py-2 bg-[hsl(var(--ico-form-button))] text-white font-medium rounded-md transition-colors duration-200 hover:bg-[hsl(var(--ico-form-button-hover))] cursor-pointer"
              >
                {/* INTENTIONAL (client request): icon-only on mobile to save header space.
                    aria-label="Disconnect wallet" above provides the accessible name.
                    Do not add visible text on mobile without client approval. */}
                <LogOut className="w-4 h-4 sm:hidden" />
                <span className="hidden sm:inline">Disconnect</span>
              </button>
            </div>
          ) : (
            <MainButton
              text={isConnecting ? 'Connecting...' : 'Connect Wallet'}
              onClick={connect}
              disabled={isConnecting}
            />
          )}
        </div>
      </div>
    </header>
  );
}

