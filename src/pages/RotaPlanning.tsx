import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Plus, Calendar, CalendarDays, CalendarRange, Clock, Zap, Lock, Unlock, Send, Loader2, Trash2, ArrowRight } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { useAuth, useAuthFetch } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const MODES = [
  { value: 'annual', label: 'Annual Master Plan', icon: CalendarRange, desc: '12-month strategic planning', color: 'text-purple-500' },
  { value: 'quarterly', label: 'Quarterly Rota', icon: CalendarDays, desc: '3-month operational cycle', color: 'text-blue-500' },
  { value: 'monthly', label: 'Monthly Rota', icon: Calendar, desc: 'Month-by-month scheduling', color: 'text-emerald-500' },
  { value: 'weekly', label: 'Weekly Schedule', icon: Clock, desc: 'Week-to-week operations', color: 'text-amber-500' },
  { value: 'live', label: 'Live Adjustment', icon: Zap, desc: 'Day-of changes and repairs', color: 'text-destructive' },
];

const STATUS_BADGE: Record<string, { variant: any; label: string }> = {
  draft: { variant: 'secondary', label: 'Draft' },
  published: { variant: 'success', label: 'Published' },
  locked: { variant: 'default', label: 'Locked' },
  archived: { variant: 'outline', label: 'Archived' },
};

export function RotaPlanning() {
  const { isAdmin } = useAuth();
  const authFetch = useAuthFetch();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [periods, setPeriods] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', mode: 'monthly', startDate: '', endDate: '', notes: '',
  });

  const fetchPeriods = async () => {
    try {
      const res = await authFetch('/api/rota-periods');
      const data = await res.json();
      if (data.success) setPeriods(data.data);
    } catch {} finally { setIsLoading(false); }
  };

  useEffect(() => { fetchPeriods(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await authFetch('/api/rota-periods', {
        method: 'POST', body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        addToast('Planning period created', 'success');
        setIsCreateOpen(false);
        setForm({ name: '', mode: 'monthly', startDate: '', endDate: '', notes: '' });
        fetchPeriods();
      } else {
        addToast(data.message || 'Failed', 'error');
      }
    } catch { addToast('Error', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleAction = async (id: string, action: 'publish' | 'lock' | 'unlock') => {
    try {
      const res = await authFetch(`/api/rota-periods/${id}/${action}`, { method: 'PATCH' });
      if ((await res.json()).success) {
        addToast(`Period ${action}ed`, 'success');
        fetchPeriods();
      }
    } catch { addToast('Error', 'error'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this planning period?')) return;
    try {
      await authFetch(`/api/rota-periods/${id}`, { method: 'DELETE' });
      addToast('Deleted', 'success');
      fetchPeriods();
    } catch { addToast('Error', 'error'); }
  };

  const handleGenerate = (period: any) => {
    navigate(`/app/rota?mode=${period.mode}&start=${period.startDate}&end=${period.endDate}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Rota Planning</h1>
          <p className="text-muted-foreground mt-1">Create and manage planning periods across all horizons.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />New Period</Button>
        )}
      </div>

      {/* Mode overview */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        {MODES.map((m) => {
          const count = periods.filter(p => p.mode === m.value).length;
          return (
            <Card key={m.value} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setForm({ ...form, mode: m.value })}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <m.icon className={`w-4 h-4 ${m.color}`} />
                  <span className="text-xs font-semibold">{m.label}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                {count > 0 && <Badge variant="secondary" className="mt-2 text-[10px]">{count} period(s)</Badge>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Periods list */}
      <Card>
        <CardHeader>
          <CardTitle>Planning Periods</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-20"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : periods.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarRange className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No planning periods yet. Create one to start scheduling.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {periods.map((period) => {
                const mode = MODES.find(m => m.value === period.mode);
                const status = STATUS_BADGE[period.status] || STATUS_BADGE.draft;
                return (
                  <div key={period.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-4">
                      {mode && <mode.icon className={`w-5 h-5 ${mode.color} shrink-0`} />}
                      <div>
                        <h3 className="font-medium">{period.name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{mode?.label}</span>
                          <span>{new Date(period.startDate).toLocaleDateString()} — {new Date(period.endDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      {isAdmin && (
                        <>
                          {period.status === 'draft' && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleGenerate(period)}>
                                <Zap className="w-3.5 h-3.5 mr-1" />Generate
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleAction(period.id, 'publish')}>
                                <Send className="w-3.5 h-3.5 mr-1" />Publish
                              </Button>
                            </>
                          )}
                          {period.status === 'published' && (
                            <Button variant="outline" size="sm" onClick={() => handleAction(period.id, 'lock')}>
                              <Lock className="w-3.5 h-3.5 mr-1" />Lock
                            </Button>
                          )}
                          {period.status === 'locked' && (
                            <Button variant="outline" size="sm" onClick={() => handleAction(period.id, 'unlock')}>
                              <Unlock className="w-3.5 h-3.5 mr-1" />Unlock
                            </Button>
                          )}
                          {period.status === 'draft' && (
                            <button onClick={() => handleDelete(period.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-md">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Period Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Planning Period">
        <form onSubmit={handleCreate} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Period Name</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border outline-none text-sm"
              placeholder="e.g. Q2 2026 Rota" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Planning Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map((m) => (
                <button key={m.value} type="button" onClick={() => setForm({ ...form, mode: m.value })}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    form.mode === m.value ? 'border-primary bg-primary/10' : 'border-border hover:bg-secondary'
                  }`}>
                  <div className="flex items-center gap-2">
                    <m.icon className={`w-4 h-4 ${m.color}`} />
                    <span className="text-xs font-medium">{m.label}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border outline-none text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <input type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border outline-none text-sm" />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create Period
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
