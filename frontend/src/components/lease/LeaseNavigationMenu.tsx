/**
 * Lease Navigation Menu
 * Comprehensive navigation for lease management features
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Settings,
  BookOpen,
  Sparkles,
  Shield,
  Users,
  Clock,
  TrendingUp,
  Archive,
  AlertCircle,
  CheckCircle,
  FileCheck,
  Briefcase,
  Home,
  Building
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaseNavigationMenuProps {
  onCreateNew?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  activeLeaseCount?: number;
  draftCount?: number;
  expiringCount?: number;
}

export default function LeaseNavigationMenu({
  onCreateNew,
  onImport,
  onExport,
  activeLeaseCount = 0,
  draftCount = 0,
  expiringCount = 0
}: LeaseNavigationMenuProps) {
  const location = useLocation();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const mainNavItems = [
    {
      label: 'All Leases',
      path: '/leases',
      icon: <FileText className="h-4 w-4" />,
      count: activeLeaseCount
    },
    {
      label: 'Drafts',
      path: '/leases/drafts',
      icon: <Clock className="h-4 w-4" />,
      count: draftCount,
      badge: draftCount > 0 ? 'warning' : undefined
    },
    {
      label: 'Expiring Soon',
      path: '/leases/expiring',
      icon: <AlertCircle className="h-4 w-4" />,
      count: expiringCount,
      badge: expiringCount > 0 ? 'destructive' : undefined
    },
    {
      label: 'Templates',
      path: '/leases/templates',
      icon: <BookOpen className="h-4 w-4" />
    },
    {
      label: 'Archive',
      path: '/leases/archive',
      icon: <Archive className="h-4 w-4" />
    }
  ];

  const toolsMenuItems = [
    {
      label: 'AI Clause Generator',
      icon: <Sparkles className="h-4 w-4" />,
      description: 'Generate smart lease clauses',
      action: () => {}
    },
    {
      label: 'Compliance Checker',
      icon: <Shield className="h-4 w-4" />,
      description: 'Verify legal compliance',
      action: () => {}
    },
    {
      label: 'Collaboration Hub',
      icon: <Users className="h-4 w-4" />,
      description: 'Work with your team',
      action: () => {}
    },
    {
      label: 'Analytics Dashboard',
      icon: <TrendingUp className="h-4 w-4" />,
      description: 'View lease insights',
      action: () => {}
    }
  ];

  const quickActionsMenuItems = [
    {
      label: 'Residential Lease',
      icon: <Home className="h-4 w-4" />,
      description: 'Create residential lease',
      action: () => onCreateNew?.()
    },
    {
      label: 'Commercial Lease',
      icon: <Building className="h-4 w-4" />,
      description: 'Create commercial lease',
      action: () => onCreateNew?.()
    },
    {
      label: 'Short-term Rental',
      icon: <Clock className="h-4 w-4" />,
      description: 'Create short-term lease',
      action: () => onCreateNew?.()
    },
    {
      label: 'From Template',
      icon: <BookOpen className="h-4 w-4" />,
      description: 'Use existing template',
      action: () => {}
    }
  ];

  return (
    <div className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900 hidden sm:block">
                Lease Management
              </h1>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1 ml-8">
              {mainNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive(item.path)
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <Badge
                      variant={item.badge === 'warning' ? 'outline' : item.badge === 'destructive' ? 'destructive' : 'secondary'}
                      className="ml-1"
                    >
                      {item.count}
                    </Badge>
                  )}
                </Link>
              ))}
            </nav>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Search */}
            <Button variant="ghost" size="sm" aria-label="Search leases">
              <Search className="h-4 w-4" />
            </Button>

            {/* Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="Filter leases">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filter By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Active Leases
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Clock className="h-4 w-4 mr-2" />
                    Draft Leases
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Expiring Soon
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Property Type</DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <Home className="h-4 w-4 mr-2" />
                    Residential
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Building className="h-4 w-4 mr-2" />
                    Commercial
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Briefcase className="h-4 w-4 mr-2" />
                    Industrial
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Tools Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Sparkles className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Tools</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>AI-Powered Tools</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {toolsMenuItems.map((item) => (
                  <DropdownMenuItem
                    key={item.label}
                    onClick={item.action}
                    className="cursor-pointer"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5">{item.icon}</div>
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-xs text-gray-500">{item.description}</p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Import/Export */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" aria-label="Import or export leases">
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Import/Export</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onImport}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Leases
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export All Leases
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FileCheck className="h-4 w-4 mr-2" />
                    Export Format
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>PDF</DropdownMenuItem>
                    <DropdownMenuItem>Word (DOCX)</DropdownMenuItem>
                    <DropdownMenuItem>Excel (XLSX)</DropdownMenuItem>
                    <DropdownMenuItem>CSV</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Create New - Primary Action */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">New Lease</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {quickActionsMenuItems.map((item) => (
                  <DropdownMenuItem
                    key={item.label}
                    onClick={item.action}
                    className="cursor-pointer"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5">{item.icon}</div>
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-xs text-gray-500">{item.description}</p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings */}
            <Button variant="ghost" size="sm" aria-label="Settings">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-4">
          <nav className="flex items-center space-x-2 overflow-x-auto">
            {mainNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors',
                  isActive(item.path)
                    ? 'bg-blue-100 text-blue-900'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <Badge
                    variant={item.badge === 'warning' ? 'outline' : item.badge === 'destructive' ? 'destructive' : 'secondary'}
                    className="ml-1"
                  >
                    {item.count}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}