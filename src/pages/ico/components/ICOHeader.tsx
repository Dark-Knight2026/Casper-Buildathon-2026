import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Copy, LogOut, Menu } from 'lucide-react';

import { ICO_CONFIG } from '@/constants/ico';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useICOWallet } from '@/hooks/ico/useICOWallet';
import { useToast } from '@/hooks/use-toast';

import { MainButton } from './shared/MainButton';

const truncateKey = (key: string) => `${key.slice(0, 6)}...${key.slice(-4)}`;

function getBackTarget(role: string | undefined) {
  if (role === 'landlord') return { path: '/landlord/dashboard', label: 'Back to dashboard' };
  if (role === 'tenant') return { path: '/tenant/dashboard', label: 'Back to dashboard' };
  return { path: '/', label: 'Back to LeaseFi' };
}

export function ICOHeader() {
  const { isConnected, account, isConnecting, connect, disconnect } = useICOWallet();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const back = getBackTarget(profile?.role);

  const handleBack = () => navigate(back.path);
  const handleLogoClick = () => navigate('/big-token');

  const handleCopyAddress = async () => {
    if (!account?.publicKey) return;
    try {
      await navigator.clipboard.writeText(account.publicKey);
      setCopied(true);
      toast({ title: 'Copied', description: 'Wallet address copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const handleConnect = () => {
    setMobileOpen(false);
    connect();
  };

  const handleDisconnect = async () => {
    setMobileOpen(false);
    await disconnect();
  };

  // Shared wallet controls — rendered inline on desktop, inside Dialog on mobile.
  const renderWalletControls = (variant: 'desktop' | 'mobile') => {
    if (isConnected && account) {
      return (
        <div className={variant === 'desktop' ? 'flex items-center gap-3' : 'flex flex-col gap-3 w-full'}>
          <button
            onClick={handleCopyAddress}
            aria-label="Copy wallet address"
            className={`font-mono text-sm text-[hsl(var(--ico-text-primary))] bg-[hsl(var(--ico-bg-secondary))] px-3 py-2 rounded-md border border-[hsl(var(--ico-border-color))] flex items-center gap-2 hover:bg-[hsl(var(--ico-bg-secondary))]/80 transition-colors ${variant === 'mobile' ? 'w-full justify-between' : ''}`}
          >
            <span>{truncateKey(account.publicKey)}</span>
            {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
          </button>
          <button
            onClick={handleDisconnect}
            aria-label="Disconnect wallet"
            className={`flex items-center justify-center gap-2 px-3 py-2 bg-[hsl(var(--ico-form-button))] text-white font-medium rounded-md transition-colors duration-200 hover:bg-[hsl(var(--ico-form-button-hover))] cursor-pointer ${variant === 'mobile' ? 'w-full' : ''}`}
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Disconnect</span>
          </button>
        </div>
      );
    }
    return (
      <MainButton
        text={isConnecting ? 'Connecting...' : 'Connect Wallet'}
        onClick={handleConnect}
        disabled={isConnecting}
        className={variant === 'mobile' ? 'w-full' : ''}
      />
    );
  };

  return (
    <header className="relative border-b h-24 z-10 border-[hsl(var(--ico-border-color))] bg-[hsl(var(--ico-bg-card))] shadow-sm">
      <div className="container mx-auto px-4 py-2">
        <div className="flex flex-row items-center justify-between gap-4">
          {/* Left: back (desktop only) + logo + token name */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              aria-label={back.label}
              className="hidden! md:inline-flex! items-center gap-1.5 text-sm text-[hsl(var(--ico-text-secondary))] hover:text-[hsl(var(--ico-text-primary))] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ico-brand-primary))] rounded px-2 py-1"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>{back.label}</span>
            </button>
            <button
              onClick={handleLogoClick}
              className="w-20 h-20 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ico-brand-primary))] rounded"
              aria-label="Return to dashboard overview"
            >
              <img src="/BIGLogoWB.png" alt="BIG Logo" />
            </button>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-[hsl(var(--ico-text-primary))]">
                {ICO_CONFIG.TOKEN.name}
              </h2>
              <p className="text-sm text-[hsl(var(--ico-text-secondary))]">
                Dashboard
              </p>
            </div>
          </div>

          {/* Right: desktop wallet controls */}
          <div className="hidden md:flex">{renderWalletControls('desktop')}</div>

          {/* Right: mobile burger → dialog */}
          <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
            <DialogTrigger asChild>
              <button
                className="md:hidden! p-2 rounded-md text-[hsl(var(--ico-text-primary))] hover:bg-[hsl(var(--ico-bg-secondary))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ico-brand-primary))]"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" aria-hidden="true" />
              </button>
            </DialogTrigger>
            <DialogContent className="bg-[hsl(var(--ico-bg-card))] max-w-sm">
              <DialogTitle className="text-[hsl(var(--ico-text-primary))]">Menu</DialogTitle>
              <div className="space-y-4 pt-2">
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    handleBack();
                  }}
                  className="w-full flex items-center gap-2 text-sm text-[hsl(var(--ico-text-secondary))] hover:text-[hsl(var(--ico-text-primary))] transition-colors py-2"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  <span>{back.label}</span>
                </button>
                <div className="border-t border-[hsl(var(--ico-border-color))] pt-4">
                  {renderWalletControls('mobile')}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
