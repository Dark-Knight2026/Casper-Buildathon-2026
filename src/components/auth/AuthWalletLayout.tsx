/**
 * STYLING EXCEPTION: This component uses styled-components via @make-software/csprclick-ui.
 * This is acceptable only here and in ICOLayout. All custom components MUST use Tailwind CSS.
 */
import { ClickProvider, ClickUI, DefaultThemes, buildTheme, ThemeModeType } from '@make-software/csprclick-ui';
import { CONTENT_MODE } from '@make-software/csprclick-core-types';
import type { CsprClickInitOptions } from '@make-software/csprclick-core-types';
import { ThemeProvider } from 'styled-components';

const theme = buildTheme(DefaultThemes.csprclick);
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const clickOptions: CsprClickInitOptions = {
  appName: 'LeaseFi',
  contentMode: CONTENT_MODE.IFRAME,
  providers: isMobile ? ['casper-wallet'] : ['casper-wallet', 'ledger', 'metamask-snap'],
  appId: import.meta.env.VITE_CSPRCLICK_APP_ID ?? 'csprclick-template',
  chainName: import.meta.env.VITE_CASPER_NETWORK ?? 'casper-test',
};

export function AuthWalletLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClickProvider options={clickOptions}>
      <ThemeProvider theme={theme[ThemeModeType.light]}>
        <div className="hidden">
          <ClickUI topBarSettings={{}} themeMode={ThemeModeType.light} />
        </div>
        {children}
      </ThemeProvider>
    </ClickProvider>
  );
}
