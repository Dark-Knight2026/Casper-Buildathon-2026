import { ClickProvider, ClickUI, DefaultThemes, buildTheme, ThemeModeType } from '@make-software/csprclick-ui';
import { CONTENT_MODE } from '@make-software/csprclick-core-types';
import type { CsprClickInitOptions } from '@make-software/csprclick-core-types';
import { ThemeProvider } from 'styled-components';

const clickOptions: CsprClickInitOptions = {
  appName: 'LeaseFi Token Sale',
  contentMode: CONTENT_MODE.IFRAME,
  providers: ['casper-wallet', 'ledger', 'metamask-snap'],
  appId: 'csprclick-template',
};

const theme = buildTheme(DefaultThemes.csprclick);

export function ICOLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClickProvider options={clickOptions}>
      <ThemeProvider theme={theme[ThemeModeType.dark]}>
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
