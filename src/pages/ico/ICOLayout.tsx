import { ClickProvider } from '@make-software/csprclick-ui';
import { CONTENT_MODE } from '@make-software/csprclick-core-types';
import type { CsprClickInitOptions } from '@make-software/csprclick-core-types';
import { ICO_CONFIG } from '@/constants/ico';

const clickOptions: CsprClickInitOptions = {
  appName: 'LeaseFi Token Sale',
  contentMode: CONTENT_MODE.IFRAME,
  providers: ['casper-wallet', 'ledger', 'metamask-snap'],
  appId: 'leasefi-ico',
};

export function ICOLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClickProvider options={clickOptions}>
      {children}
    </ClickProvider>
  );
}

export default ICOLayout;
