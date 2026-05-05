/**
 * STYLING EXCEPTION: This component uses styled-components via @make-software/csprclick-ui.
 * This is the ONLY acceptable use of styled-components in the codebase.
 * All custom components MUST use Tailwind CSS. See spec.md "Styling Exception".
 */
import { ClickProvider, ClickUI, DefaultThemes, buildTheme, ThemeModeType } from '@make-software/csprclick-ui';
import { CONTENT_MODE } from '@make-software/csprclick-core-types';
import type { CsprClickInitOptions } from '@make-software/csprclick-core-types';
import { ThemeProvider } from 'styled-components';

const theme = buildTheme(DefaultThemes.csprclick);

const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const clickOptions: CsprClickInitOptions = {
  appName: 'LeaseFi Token Sale',
  contentMode: CONTENT_MODE.IFRAME,
  providers: isMobile
    ? ['casper-wallet', 'csprclick-w3a-google', 'csprclick-w3a-apple']
    : ['casper-wallet', 'ledger', 'metamask-snap', 'csprclick-w3a-google', 'csprclick-w3a-apple'],
  appId: import.meta.env.VITE_CSPRCLICK_APP_ID ?? 'csprclick-template',
  chainName: import.meta.env.VITE_CASPER_NETWORK ?? 'casper-test',
};

export function ICOLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClickProvider options={clickOptions}>
      <ThemeProvider theme={theme[ThemeModeType.light]}>
        {/* ClickUI renders modals for wallet connection; top bar is hidden */}
        <div className="hidden">
          <ClickUI topBarSettings={{}} themeMode={ThemeModeType.light} />
        </div>
        {children}
      </ThemeProvider>
    </ClickProvider>
  );
}

export default ICOLayout;
