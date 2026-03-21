import React, { useState } from 'react';
import { Bell, Search, Sparkles } from 'lucide-react';
import { useToast } from '../ui/Toast';

interface HeaderProps {
  onToggleAI: () => void;
  isAIOpen: boolean;
}

export function Header({ onToggleAI, isAIOpen }: HeaderProps) {
  const { addToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      addToast(`Searching for "${searchQuery}"...`, 'info');
    }
  };

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center flex-1">
        <div className="relative w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search doctors, shifts, or rules... (Press Enter)" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            className="w-full h-9 pl-9 pr-4 rounded-md bg-secondary border-transparent focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={() => addToast('You have 3 new notifications', 'info')}
          className="relative p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full"></span>
        </button>
        
        <button 
          onClick={onToggleAI}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            isAIOpen 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-primary/10 text-primary hover:bg-primary/20'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Copilot
        </button>
      </div>
    </header>
  );
}
