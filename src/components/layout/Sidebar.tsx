import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, LayoutDashboard, Settings, Users, Stethoscope, Map as MapIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast } from '../ui/Toast';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/app' },
  { icon: CalendarDays, label: 'Rota Board', path: '/app/rota' },
  { icon: MapIcon, label: 'Live Acuity', path: '/app/map' },
  { icon: Users, label: 'Workforce', path: '/app/workforce' },
  { icon: Settings, label: 'Rules Studio', path: '/app/rules' },
];

export function Sidebar() {
  const location = useLocation();
  const { addToast } = useToast();

  return (
    <div className="w-64 bg-card border-r border-border h-full flex flex-col">
      <div className="h-14 flex items-center px-6 border-b border-border">
        <div className="flex items-center gap-2 text-primary font-semibold text-lg">
          <Stethoscope className="w-5 h-5" />
          <span>RotaAI</span>
        </div>
      </div>
      
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div 
          onClick={() => addToast('Opening user settings...', 'info')}
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary cursor-pointer transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium text-sm">
            SA
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">Segun Alabi</span>
            <span className="text-xs text-muted-foreground">Admin</span>
          </div>
        </div>
      </div>
    </div>
  );
}
