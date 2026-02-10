/**
 * STYLING EXCEPTION: This component uses styled-components via @make-software/csprclick-ui.
 * This is the ONLY acceptable use of styled-components in the codebase.
 * All custom components MUST use Tailwind CSS. See spec.md "Styling Exception".
 */
import { ClickProvider, ClickUI, DefaultThemes, buildTheme, ThemeModeType } from '@make-software/csprclick-ui';
import { CONTENT_MODE } from '@make-software/csprclick-core-types';
import type { CsprClickInitOptions } from '@make-software/csprclick-core-types';
import { ThemeProvider } from 'styled-components';

// Use popup mode for small screens (mobile/tablet)
const isMobile = window.innerWidth < 768;

const clickOptions: CsprClickInitOptions = {
  appName: 'LeaseFi Token Sale',
  contentMode: isMobile ? CONTENT_MODE.POPUP : CONTENT_MODE.IFRAME,
  providers: ['casper-wallet', 'ledger', 'metamask-snap'],
  appId: 'csprclick-template',
  chainName: 'casper-test',
};

const theme = buildTheme(DefaultThemes.csprclick);

export function ICOLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClickProvider options={clickOptions}>
      <ThemeProvider theme={theme[ThemeModeType.light]}>
        {/* ClickUI renders modals for wallet connection; top bar is hidden */}
        <div style={{ display: 'none' }}>
          <ClickUI topBarSettings={{}} themeMode={ThemeModeType.dark} />
        </div>
        {children}
      </ThemeProvider>
    </ClickProvider>
  );
}

export default ICOLayout;
