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

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch real notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await authFetch('/api/approvals/notifications');
        const data = await res.json();
        if (data.success) {
          setNotifications(data.data.notifications || []);
          setUnreadCount(data.data.unreadCount || 0);
        }
      } catch {}
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await authFetch('/api/approvals/notifications/read-all', { method: 'POST' });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {}
  };

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
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-card border border-border rounded-lg shadow-lg z-50">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <h4 className="text-sm font-semibold">Notifications {unreadCount > 0 && `(${unreadCount})`}</h4>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">No notifications</div>
                ) : (
                  notifications.map((n: any) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        if (n.link) navigate(n.link);
                        setShowNotifications(false);
                        if (!n.isRead) {
                          authFetch(`/api/approvals/notifications/${n.id}/read`, { method: 'PATCH' });
                          setUnreadCount(prev => Math.max(0, prev - 1));
                        }
                      }}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-secondary transition-colors border-b border-border last:border-0 ${
                        !n.isRead ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                        <div>
                          <p className={`text-xs ${!n.isRead ? 'font-medium' : 'text-muted-foreground'}`}>{n.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{n.message?.slice(0, 80)}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
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
