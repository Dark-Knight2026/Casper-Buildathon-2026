import React from 'react';

export const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export type ProviderDef = {
  key: string;
  label: string;
  icon: React.ReactNode;
};

// Provider-status-update values that mean "user cancelled / failed"
export const TERMINAL_PROVIDER_STATUSES = new Set([
  'rejected-by-user',              // MetaMask Snap: user denied connection
  'error-while-connecting',        // MetaMask Snap: connection error
  'transport-open-user-cancelled', // Ledger: user cancelled USB selection
  'error-opening-device',          // Ledger: device error
  'timeout',                       // Ledger: device not responding
  'no-device-found',               // Ledger: no hardware wallet detected
]);

export const WALLET_PROVIDERS: ProviderDef[] = [
  {
    key: 'casper-wallet',
    label: 'Casper Wallet',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    key: 'ledger',
    label: 'Ledger',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M3 10h6M3 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <rect x="13" y="9" width="5" height="6" rx="1" fill="currentColor" opacity="0.4"/>
      </svg>
    ),
  },
  {
    key: 'metamask-snap',
    label: 'MetaMask Snap',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M20.5 3L13.5 8.3l1.3-3.1L20.5 3z" opacity="0.8"/>
        <path d="M3.5 3l6.9 5.4L9.2 5.2 3.5 3z" opacity="0.6"/>
        <path d="M17.9 16.4l-1.8 2.8 3.9 1.1 1.1-3.8-3.2-.1z" opacity="0.8"/>
        <path d="M2.9 16.5l1.1 3.8 3.9-1.1-1.8-2.8-3.2.1z" opacity="0.6"/>
        <path d="M7.6 10.8L6.5 12.5l3.9.2-.1-4.3-2.7 2.4z"/>
        <path d="M16.4 10.8l-2.8-2.5-.1 4.4 3.9-.2-1-1.7z"/>
        <path d="M7.9 19.2l2.4-1.1-2-1.6-.4 2.7z"/>
        <path d="M13.7 18.1l2.3 1.1-.3-2.7-2 1.6z"/>
      </svg>
    ),
  },
];

// Social login — requires CSPR Click paid plan.
// To enable: add key to clickOptions.providers in AuthWalletLayout,
// then call clickRef.connect(key) like wallet providers.
export const SOCIAL_PROVIDERS: ProviderDef[] = [
  {
    key: 'csprclick-w3agoogle',
    label: 'Google',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    key: 'csprclick-customjwt',
    label: 'Email',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2 7l10 7 10-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    key: 'torus',
    label: 'Twitter / Discord / GitHub',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="5" cy="17" r="2" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="19" cy="17" r="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7 16c1-3 8-3 10 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M9 10c-2 2-2 4-2 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M15 10c2 2 2 4 2 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];
