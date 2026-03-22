import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, LayoutDashboard, Settings as SettingsIcon, Users, Stethoscope, Map as MapIcon, ClipboardList, LogOut, X, Upload, Cog, Plug, UserPlus, CalendarRange, UserCircle, Inbox, Shield } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  // Staff see: Dashboard, My Portal, Rota Board (view only), Settings
  // Admins see: everything
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/app' },
    { icon: UserCircle, label: 'My Portal', path: '/app/portal' },
    { icon: CalendarDays, label: 'Rota Board', path: '/app/rota' },
    ...(isAdmin ? [
      { icon: CalendarRange, label: 'Rota Planning', path: '/app/planning' },
      { icon: MapIcon, label: 'Live Acuity', path: '/app/map' },
      { icon: Users, label: 'Workforce', path: '/app/workforce' },
      { icon: SettingsIcon, label: 'Rules Studio', path: '/app/rules' },
      { icon: Inbox, label: 'Requests', path: '/app/requests' },
      { icon: UserPlus, label: 'Team', path: '/app/team' },
      { icon: Upload, label: 'Bulk Import', path: '/app/import' },
      { icon: Plug, label: 'Integrations', path: '/app/integrations' },
      { icon: Shield, label: 'Compliance', path: '/app/compliance' },
      { icon: ClipboardList, label: 'Audit Log', path: '/app/audit' },
    ] : []),
    { icon: Cog, label: 'Settings', path: '/app/settings' },
  ];

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <div
      className={cn(
        'bg-card border-r border-border h-full flex flex-col shrink-0 z-50 transition-all duration-300',
        'fixed lg:relative lg:translate-x-0 w-64',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <div className="h-14 flex items-center justify-between px-6 border-b border-border">
        <div className="flex items-center gap-2 text-primary font-semibold text-lg">
          <Stethoscope className="w-5 h-5" />
          <span>RotaAI</span>
        </div>
        <button onClick={onClose} className="lg:hidden p-1 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        <Link
          to="/app/settings"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium text-sm">
            {initials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-foreground truncate">{user?.name}</span>
            <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
          </div>
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
