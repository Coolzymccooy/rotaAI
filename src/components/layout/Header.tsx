import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, Sparkles, Menu, X, Loader2 } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { ThemeToggle } from '../ThemeToggle';
import { useAuthFetch } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onToggleAI: () => void;
  isAIOpen: boolean;
  onToggleSidebar: () => void;
}

export function Header({ onToggleAI, isAIOpen, onToggleSidebar }: HeaderProps) {
  const { addToast } = useToast();
  const authFetch = useAuthFetch();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setShowResults(true);
    try {
      const res = await authFetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) setSearchResults(data.data);
    } catch {
      addToast('Search failed', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
    if (e.key === 'Escape') setShowResults(false);
  };

  const notifications = [
    { id: 1, text: 'Dr. Lisa Taylor has critical fatigue', type: 'warning', action: () => navigate('/app/workforce') },
    { id: 2, text: 'New leave request pending review', type: 'info', action: () => navigate('/app/workforce') },
    { id: 3, text: '1 EWTD violation detected on Rota Board', type: 'error', action: () => navigate('/app/rota') },
  ];

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0">
      <div className="flex items-center flex-1 gap-3">
        <button onClick={onToggleSidebar} className="lg:hidden p-2 text-muted-foreground hover:bg-secondary rounded-md transition-colors">
          <Menu className="w-5 h-5" />
        </button>

        {/* Search with live results */}
        <div ref={searchRef} className="relative w-full max-w-sm hidden sm:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search doctors, shifts, or rules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => searchResults && setShowResults(true)}
            className="w-full h-9 pl-9 pr-4 rounded-md bg-secondary border-transparent focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
          />

          {showResults && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
              {isSearching ? (
                <div className="p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Searching...
                </div>
              ) : !searchResults ? (
                <div className="p-4 text-sm text-muted-foreground text-center">Press Enter to search</div>
              ) : (
                <>
                  {searchResults.doctors?.length > 0 && (
                    <div className="p-2">
                      <p className="text-xs font-medium text-muted-foreground px-2 pb-1">Doctors</p>
                      {searchResults.doctors.map((d: any) => (
                        <button key={d.id} onClick={() => { navigate('/app/workforce'); setShowResults(false); }}
                          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors">
                          <span className="font-medium">{d.name}</span>
                          <span className="text-muted-foreground ml-2">{d.grade} &bull; {d.department}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.rules?.length > 0 && (
                    <div className="p-2 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground px-2 pb-1">Rules</p>
                      {searchResults.rules.map((r: any) => (
                        <button key={r.id} onClick={() => { navigate('/app/rules'); setShowResults(false); }}
                          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors">
                          <span className="font-medium">{r.name}</span>
                          <span className="text-muted-foreground ml-2">{r.severity}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {(!searchResults.doctors?.length && !searchResults.rules?.length) && (
                    <div className="p-4 text-sm text-muted-foreground text-center">No results for "{searchQuery}"</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <ThemeToggle />

        {/* Notifications dropdown */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-card border border-border rounded-lg shadow-lg z-50">
              <div className="p-3 border-b border-border">
                <h4 className="text-sm font-semibold">Notifications</h4>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => { n.action(); setShowNotifications(false); }}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-secondary transition-colors border-b border-border last:border-0"
                  >
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                      n.type === 'error' ? 'bg-destructive' : n.type === 'warning' ? 'bg-amber-500' : 'bg-primary'
                    }`} />
                    {n.text}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onToggleAI}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            isAIOpen ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary hover:bg-primary/20'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">Copilot</span>
        </button>
      </div>
    </header>
  );
}
