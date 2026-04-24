/**
 * STYLING EXCEPTION: This component uses styled-components via @make-software/csprclick-ui.
 * This is acceptable only here and in ICOLayout. All custom components MUST use Tailwind CSS.
 */
import { ClickProvider, ClickUI, DefaultThemes, buildTheme, ThemeModeType } from '@make-software/csprclick-ui';
import { CONTENT_MODE, WALLET_KEYS } from '@make-software/csprclick-core-types';
import type { CsprClickInitOptions } from '@make-software/csprclick-core-types';
import { ThemeProvider } from 'styled-components';

const theme = buildTheme(DefaultThemes.csprclick);
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const SOCIAL_PROVIDERS = [WALLET_KEYS.W3A_GOOGLE, WALLET_KEYS.W3A_APPLE];

const clickOptions: CsprClickInitOptions = {
  appName: 'LeaseFi',
  contentMode: CONTENT_MODE.IFRAME,
  providers: isMobile
    ? [WALLET_KEYS.CASPER_WALLET, ...SOCIAL_PROVIDERS]
    : [WALLET_KEYS.CASPER_WALLET, WALLET_KEYS.LEDGER, WALLET_KEYS.METAMASK_SNAP, ...SOCIAL_PROVIDERS],
  appId: import.meta.env.VITE_CSPRCLICK_APP_ID ?? 'csprclick-template',
  chainName: import.meta.env.VITE_CASPER_NETWORK ?? 'casper-test',
};

export function AuthWalletLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClickProvider options={clickOptions}>
      <ThemeProvider theme={theme[ThemeModeType.light]}>
        {/* ClickUI mounts SDK's modal host. TopBar is styled compactly so it doesn't
            dominate auth pages — the modal appears on clickRef.signIn(). */}
        <ClickUI topBarSettings={{}} themeMode={ThemeModeType.light} />
        {children}
      </ThemeProvider>
    </ClickProvider>
  );
}
