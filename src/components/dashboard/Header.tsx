import React from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Bell, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useICOWallet } from '@/hooks/ico/useICOWallet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface HeaderProps {
  onMenuClick: () => void;
}

// DEAD CODE (as of 2026-06-01): this component is currently unreachable.
// Import chain: Header ← DashboardLayout ← LeaseLayout ← (nobody). None of
// these are wired into App.tsx (the sole router). The auth wiring below was
// fixed to match LandlordLayout/TenantLayout so it's correct if/when this is
// reconnected, but right now it never renders. Delete the orphan chain or
// route it before relying on this.
export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { profile, signOut } = useAuth();
  const { disconnect } = useICOWallet();
  const { isMobile } = useMobileDetection();

  // Full sign-out: release the CSPR.click wallet session (await so the SDK's
  // hard disconnect completes), clear our backend session, then hard-reload to
  // wipe in-memory SDK state. Matches LandlordLayout/TenantLayout.
  const handleLogout = async () => {
    await disconnect();
    signOut();
    window.location.assign('/');
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center gap-2 sm:gap-4 border-b bg-background px-3 sm:px-6">
      <Button 
        variant="ghost" 
        size="icon" 
        className="md:hidden min-w-[48px] min-h-[48px]" 
        onClick={onMenuClick}
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle Menu</span>
      </Button>
      
      {/* Search - Hidden on small mobile, visible on larger screens */}
      {!isMobile && (
        <div className="w-full flex-1 md:w-auto md:flex-none">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[300px]"
            />
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-1 sm:gap-2 ml-auto">
        {/* Notifications */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative min-w-[48px] min-h-[48px]"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600" />
          <span className="sr-only">Notifications</span>
        </Button>
        
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full min-w-[48px] min-h-[48px]"
              aria-label="User menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar} alt={profile?.name} />
                <AvatarFallback>{profile?.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};