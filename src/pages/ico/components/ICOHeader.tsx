import { ICO_CONFIG} from '@/constants/ico';
import { MainButton } from './shared/MainButton';
import { useNavigate } from 'react-router-dom';


export function ICOHeader() {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/ico');
  }

  return (
    <header className="relative border-b h-28 z-50 border-[hsl(var(--ico-border-color))] bg-[hsl(var(--ico-bg-secondary))] shadow-md shadow-slate-900">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-row items-center justify-between gap-4">
          {/* Logo & Token Name */}
          <div className="flex items-center gap-3">
            <div className="w-20 h-20  ">
              <img src="/leaseFiLogo.png" alt="Token Logo" onClick={handleLogoClick} className="cursor-pointer" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[hsl(var(--ico-text-primary))]">
                {ICO_CONFIG.TOKEN.name}
              </h1>
              <p className="text-sm text-[hsl(var(--ico-text-secondary))]">
                {ICO_CONFIG.TOKEN.symbol} Token Sale
              </p>
            </div>
          </div>

          <MainButton text="Connect Wallet" />
        </div>
      </div>
    </header>
  );
}

export default ICOHeader;
