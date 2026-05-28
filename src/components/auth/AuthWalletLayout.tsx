/**
 * STYLING EXCEPTION: This component uses styled-components via @make-software/csprclick-ui.
 * This is acceptable only here and in ICOLayout. All custom components MUST use Tailwind CSS.
 */
import { ClickProvider, ClickUI, DefaultThemes, buildTheme, ThemeModeType } from '@make-software/csprclick-ui';
import { CONTENT_MODE, WALLET_KEYS } from '@make-software/csprclick-core-types';
import type { CsprClickInitOptions } from '@make-software/csprclick-core-types';
import { ThemeProvider } from 'styled-components';

const theme = buildTheme(DefaultThemes.csprclick);

// Auth pages only support social providers (Google/Apple). Self-custody
// wallets (Casper Wallet, Ledger, MetaMask) are intentionally excluded —
// the LeaseFi audience is consumer-facing, not crypto-native, and forcing
// them to install a wallet extension before signing up is a friction we
// don't want on the registration funnel. Social-login users still get a
// real Casper public key (custodial via CSPR.click) and can sign messages.
const SOCIAL_PROVIDERS = [WALLET_KEYS.W3A_GOOGLE, WALLET_KEYS.W3A_APPLE];

const clickOptions: CsprClickInitOptions = {
  appName: 'LeaseFi',
  contentMode: CONTENT_MODE.IFRAME,
  providers: SOCIAL_PROVIDERS,
  appId: import.meta.env.VITE_CSPRCLICK_APP_ID ?? 'csprclick-template',
  chainName: import.meta.env.VITE_CASPER_NETWORK ?? 'casper-test',
};

export function AuthWalletLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClickProvider options={clickOptions}>
      <ThemeProvider theme={theme[ThemeModeType.light]}>
        {/* ClickUI mounts SDK's modal host. TopBar is styled compactly so it doesn't
            dominate auth pages — the modal appears on clickRef.signIn().
            show1ClickModal={false} suppresses the SDK's auto-shown "Choose an
            account to sign in" popup (top-right CSPR.click branded picker that
            lists acctmgr-known accounts). Default is true. We disable it
            because clicking a cached account in that popup internally calls
            signInWithAccount(stale_account) and lands on /api/authenticate/me
            401. Users should always go through our own ProviderList → fresh
            connect() instead. */}
        <ClickUI topBarSettings={{}} themeMode={ThemeModeType.light} show1ClickModal={false} />
        {children}
      </ThemeProvider>
    </ClickProvider>
  );
}
