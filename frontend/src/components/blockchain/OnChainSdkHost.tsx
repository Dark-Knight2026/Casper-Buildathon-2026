/**
 * Mounts a hidden CSPR.click SDK host on demand.
 *
 * The SDK (`ClickProvider`) is NOT app-wide — only the ICO pages and the
 * wallet-link surface mount it. Any other signing surface must wrap its
 * interactive flow in this host, otherwise `useClickRef()` is null and
 * connect/sign are no-ops. The chrome is hidden; the connect/sign modal portals
 * to the document body. Mirrors the host in `PropertyOnChainRegistration`.
 */

import type { ReactNode } from 'react';
import {
  ClickProvider,
  ClickUI,
  DefaultThemes,
  buildTheme,
  ThemeModeType,
} from '@make-software/csprclick-ui';
import { CONTENT_MODE } from '@make-software/csprclick-core-types';
import type { CsprClickInitOptions } from '@make-software/csprclick-core-types';
import { ThemeProvider } from 'styled-components';
import { WALLET_PROVIDERS } from '@/pages/auth/register/constants';

const csprClickTheme = buildTheme(DefaultThemes.csprclick);

const clickOptions: CsprClickInitOptions = {
  appName: 'LeaseFi',
  contentMode: CONTENT_MODE.IFRAME,
  providers: WALLET_PROVIDERS.map((provider) => provider.key),
  appId: import.meta.env.VITE_CSPRCLICK_APP_ID ?? 'csprclick-template',
  chainName: import.meta.env.VITE_CASPER_NETWORK ?? 'casper-test',
};

export function OnChainSdkHost({ children }: { children: ReactNode }) {
  return (
    <ClickProvider options={clickOptions}>
      <ThemeProvider theme={csprClickTheme[ThemeModeType.light]}>
        <div className="hidden">
          <ClickUI
            topBarSettings={{}}
            themeMode={ThemeModeType.light}
            show1ClickModal={false}
          />
        </div>
        {children}
      </ThemeProvider>
    </ClickProvider>
  );
}
