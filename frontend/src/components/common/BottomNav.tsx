import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface BottomNavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  exact?: boolean;
}

interface BottomNavProps {
  items: BottomNavItem[];
  className?: string;
}

/**
 * Bottom navigation bar for mobile devices
 * Provides quick access to main sections
 * 
 * @example
 * <BottomNav
 *   items={[
 *     { href: '/dashboard', icon: Home, label: 'Home', exact: true },
 *     { href: '/properties', icon: Building, label: 'Properties' },
 *     { href: '/calendar', icon: Calendar, label: 'Calendar' },
 *     { href: '/profile', icon: User, label: 'Profile' },
 *   ]}
 * />
 */
export function BottomNav({ items, className }: BottomNavProps) {
  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden',
        'safe-area-bottom',
        className
      )}
      role="navigation"
      aria-label="Bottom navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.exact}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]',
                'hover:bg-accent',
                isActive
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground'
              )
            }
            aria-label={item.label}
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    'h-5 w-5 transition-transform',
                    isActive && 'scale-110'
                  )}
                />
                <span className="text-xs">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}