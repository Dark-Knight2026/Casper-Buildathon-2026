import { ICO_CONFIG} from '@/constants/ico';
import { MainButton } from './shared/MainButton';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/lib/toast';


export function ICOHeader() {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/ico');
  }

  const handleConnectWallet = () => {
    toast.info('Wallet connection coming soon');
  };

  return (
    <header className="relative border-b h-28 z-50 border-[hsl(var(--ico-border-color))] bg-[hsl(var(--ico-bg-secondary))] shadow-md shadow-slate-900">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-row items-center justify-between gap-4">
          {/* Logo & Token Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogoClick}
              className="w-20 h-20 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
              aria-label="Return to ICO overview"
            >
              <img src="/leaseFiLogo.png" alt="" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-[hsl(var(--ico-text-primary))]">
                {ICO_CONFIG.TOKEN.name}
              </h2>
              <p className="text-sm text-[hsl(var(--ico-text-secondary))]">
                {ICO_CONFIG.TOKEN.symbol} Token Sale
              </p>
            </div>
          </div>

          <MainButton text="Connect Wallet" onClick={handleConnectWallet} />
        </div>
      </div>
    </header>
  );
}

export default ICOHeader;
