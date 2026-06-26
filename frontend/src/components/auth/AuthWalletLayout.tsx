/**
 * STYLING EXCEPTION: This component uses styled-components via @make-software/csprclick-ui.
 * This is acceptable only here and in ICOLayout. All custom components MUST use Tailwind CSS.
 */
import { ClickProvider, ClickUI, DefaultThemes, buildTheme, ThemeModeType } from '@make-software/csprclick-ui';
import { CONTENT_MODE } from '@make-software/csprclick-core-types';
import type { CsprClickInitOptions } from '@make-software/csprclick-core-types';
import { ThemeProvider } from 'styled-components';

import { WALLET_PROVIDERS } from '@/pages/auth/register/constants';

const theme = buildTheme(DefaultThemes.csprclick);

// This provider now backs the wallet-LINKING feature (profile WalletSection),
// not the sign-up funnel. So it offers both self-custody Casper Wallet and the
// custodial social providers — the single source of truth is `WALLET_PROVIDERS`
// (constants.tsx), which the ProviderList renders, so the SDK's enabled set and
// the buttons can never drift.
const PROVIDER_KEYS = WALLET_PROVIDERS.map((provider) => provider.key);

const clickOptions: CsprClickInitOptions = {
  appName: 'LeaseFi',
  contentMode: CONTENT_MODE.IFRAME,
  providers: PROVIDER_KEYS,
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
