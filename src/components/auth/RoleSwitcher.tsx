import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole, getRoleDisplayName, getDashboardRoute, CORE_ROLES, PRE_OFFER_ROLES, POST_OFFER_ROLES } from '../../types/user';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ChevronDown, User, Users, Briefcase } from 'lucide-react';

export function RoleSwitcher() {
  const { user, switchRole } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const handleRoleSwitch = (role: UserRole) => {
    switchRole(role);
    navigate(getDashboardRoute(role));
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <User className="w-4 h-4" />
          <span className="hidden sm:inline">{getRoleDisplayName(user.role)}</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-h-96 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          Switch Role (Demo)
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Core Roles */}
        <DropdownMenuLabel className="text-xs text-gray-500 font-normal px-2 py-1">
          Core Roles
        </DropdownMenuLabel>
        {CORE_ROLES.map((role) => (
          <DropdownMenuItem
            key={role}
            onClick={() => handleRoleSwitch(role)}
            className={user.role === role ? 'bg-blue-50' : ''}
          >
            <span className="flex items-center gap-2">
              {user.role === role && <span className="w-2 h-2 bg-blue-600 rounded-full" />}
              {getRoleDisplayName(role)}
            </span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {/* Pre-Offer Professionals */}
        <DropdownMenuLabel className="text-xs text-gray-500 font-normal px-2 py-1 flex items-center gap-2">
          <Briefcase className="w-3 h-3" />
          Pre-Offer Professionals
        </DropdownMenuLabel>
        {PRE_OFFER_ROLES.map((role) => (
          <DropdownMenuItem
            key={role}
            onClick={() => handleRoleSwitch(role)}
            className={user.role === role ? 'bg-blue-50' : ''}
          >
            <span className="flex items-center gap-2">
              {user.role === role && <span className="w-2 h-2 bg-blue-600 rounded-full" />}
              {getRoleDisplayName(role)}
            </span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {/* Post-Offer Professionals */}
        <DropdownMenuLabel className="text-xs text-gray-500 font-normal px-2 py-1 flex items-center gap-2">
          <Briefcase className="w-3 h-3" />
          Post-Offer Professionals
        </DropdownMenuLabel>
        {POST_OFFER_ROLES.map((role) => (
          <DropdownMenuItem
            key={role}
            onClick={() => handleRoleSwitch(role)}
            className={user.role === role ? 'bg-blue-50' : ''}
          >
            <span className="flex items-center gap-2">
              {user.role === role && <span className="w-2 h-2 bg-blue-600 rounded-full" />}
              {getRoleDisplayName(role)}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}