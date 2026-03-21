import React from 'react';
import { Calendar, Users, Settings, BarChart2, Activity } from 'lucide-react';

export type ViewType = 'dashboard' | 'rota' | 'workforce' | 'rules' | 'analytics';

interface SidebarProps {
  activeView: ViewType;
  onNavigate: (view: ViewType) => void;
}

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  return (
    <aside className="w-64 border-r border-gray-200 bg-white flex flex-col shrink-0">
      <div className="h-14 border-b border-gray-200 flex items-center px-4">
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl tracking-tight">
          <Activity className="w-6 h-6" />
          RotaAI
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        <NavItem icon={<Activity />} label="Dashboard" active={activeView === 'dashboard'} onClick={() => onNavigate('dashboard')} />
        <NavItem icon={<Calendar />} label="Rota Board" active={activeView === 'rota'} onClick={() => onNavigate('rota')} />
        <NavItem icon={<Users />} label="Workforce" active={activeView === 'workforce'} onClick={() => onNavigate('workforce')} />
        <NavItem icon={<Settings />} label="Rules Studio" active={activeView === 'rules'} onClick={() => onNavigate('rules')} />
        <NavItem icon={<BarChart2 />} label="Analytics" active={activeView === 'analytics'} onClick={() => onNavigate('analytics')} />
      </nav>
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold">
            JD
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-900">Dr. John Doe</p>
            <p className="text-gray-500 text-xs">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
    >
      {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}
      {label}
    </button>
  );
}
