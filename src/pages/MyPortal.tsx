import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Calendar, Clock, CalendarOff, ArrowRightLeft, FileText, Loader2, Plus, CheckCircle2, XCircle, AlertTriangle, Star } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { useAuth, useAuthFetch } from '../contexts/AuthContext';

export function MyPortal() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const { addToast } = useToast();

  const [shifts, setShifts] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [isAvailOpen, setIsAvailOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [requestForm, setRequestForm] = useState({
    type: 'leave', subType: 'annual', title: '', description: '', startDate: '', endDate: '', priority: 'normal',
  });
  const [availForm, setAvailForm] = useState({
    type: 'unavailable', startDate: '', endDate: '', reason: '', isRecurring: false, recurringDay: '',
  });

  const fetchData = async () => {
    try {
      const [shiftsRes, requestsRes, availRes, statsRes] = await Promise.all([
        authFetch('/api/self-service/my-shifts'),
        authFetch('/api/self-service/requests'),
        authFetch('/api/self-service/availability'),
        authFetch('/api/self-service/my-stats'),
      ]);
      setShifts((await shiftsRes.json()).data || []);
      setRequests((await requestsRes.json()).data || []);
      setAvailability((await availRes.json()).data || []);
      setStats((await statsRes.json()).data);
    } catch {} finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await authFetch('/api/self-service/requests', {
        method: 'POST', body: JSON.stringify(requestForm),
      });
      const data = await res.json();
      if (data.success) {
        addToast('Request submitted', 'success');
        setIsRequestOpen(false);
        fetchData();
      } else { addToast(data.message || 'Failed', 'error'); }
    } catch { addToast('Error', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleAddAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await authFetch('/api/self-service/availability', {
        method: 'POST', body: JSON.stringify(availForm),
      });
      if ((await res.json()).success) {
        addToast('Availability updated', 'success');
        setIsAvailOpen(false);
        fetchData();
      }
    } catch { addToast('Error', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleCancelRequest = async (id: string) => {
    try {
      await authFetch(`/api/self-service/requests/${id}`, { method: 'DELETE' });
      addToast('Request cancelled', 'success');
      fetchData();
    } catch { addToast('Error', 'error'); }
  };

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const statusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'pending': return <Clock className="w-4 h-4 text-amber-500" />;
      default: return <AlertTriangle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Portal</h1>
          <p className="text-muted-foreground mt-1">View your shifts, submit requests, and manage availability.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsAvailOpen(true)}>
            <CalendarOff className="w-4 h-4 mr-2" />Set Availability
          </Button>
          <Button size="sm" onClick={() => setIsRequestOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />New Request
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div><p className="text-xs text-muted-foreground">My Shifts</p><p className="text-2xl font-bold mt-1">{stats?.totalShifts || 0}</p></div>
                  <Calendar className="w-8 h-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div><p className="text-xs text-muted-foreground">Pending Requests</p><p className="text-2xl font-bold mt-1">{stats?.pendingRequests || 0}</p></div>
                  <Clock className="w-8 h-8 text-amber-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div><p className="text-xs text-muted-foreground">Hours (Last 7d)</p><p className="text-2xl font-bold mt-1">{stats?.historicalLoad?.hoursWorkedLast7 || 0}h</p></div>
                  <Star className="w-8 h-8 text-emerald-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div><p className="text-xs text-muted-foreground">Compliance</p><p className="text-2xl font-bold mt-1">{Math.round((stats?.historicalLoad?.complianceScore || 1) * 100)}%</p></div>
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* My shifts this week */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" />My Shifts This Week</CardTitle></CardHeader>
            <CardContent>
              {shifts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No shifts assigned yet.</p>
              ) : (
                <div className="grid grid-cols-7 gap-2">
                  {DAYS.map((day, idx) => {
                    const dayShifts = shifts.filter((s: any) => s.dayIdx === idx);
                    return (
                      <div key={day} className="text-center">
                        <p className="text-xs font-medium text-muted-foreground mb-2">{day}</p>
                        {dayShifts.length > 0 ? dayShifts.map((s: any) => (
                          <div key={s.id} className={`p-2 rounded-md text-xs mb-1 ${
                            s.type === 'Night' ? 'bg-slate-700 text-slate-200' :
                            s.type === 'Weekend' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                            'bg-primary/10 text-primary'
                          }`}>
                            <div className="font-medium">{s.type}</div>
                            <div className="text-[10px] opacity-75">{s.time}</div>
                          </div>
                        )) : (
                          <div className="p-2 text-[10px] text-muted-foreground">Off</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Requests */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />My Requests</CardTitle></CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No requests yet. Click "New Request" to submit one.</p>
              ) : (
                <div className="space-y-2">
                  {requests.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center gap-3">
                        {statusIcon(r.status)}
                        <div>
                          <p className="text-sm font-medium">{r.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <Badge variant="secondary" className="text-[10px]">{r.type}</Badge>
                            {r.startDate && <span>{new Date(r.startDate).toLocaleDateString()}</span>}
                            {r.endDate && <span>— {new Date(r.endDate).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'destructive' : 'warning'}>{r.status}</Badge>
                        {r.status === 'pending' && (
                          <button onClick={() => handleCancelRequest(r.id)} className="text-xs text-destructive hover:underline">Cancel</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* New Request Modal */}
      <Modal isOpen={isRequestOpen} onClose={() => setIsRequestOpen(false)} title="Submit Request">
        <form onSubmit={handleSubmitRequest} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Request Type</label>
              <select value={requestForm.type} onChange={(e) => setRequestForm({ ...requestForm, type: e.target.value })}
                className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border outline-none text-sm">
                <option value="leave">Leave Request</option>
                <option value="swap">Shift Swap</option>
                <option value="preference">Preference Change</option>
                <option value="restriction">Temporary Restriction</option>
              </select>
            </div>
            {requestForm.type === 'leave' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Leave Type</label>
                <select value={requestForm.subType} onChange={(e) => setRequestForm({ ...requestForm, subType: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border outline-none text-sm">
                  <option value="annual">Annual Leave</option>
                  <option value="study">Study Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="compassionate">Compassionate</option>
                </select>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <input type="text" required value={requestForm.title} onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })}
              className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border outline-none text-sm"
              placeholder="e.g. Annual leave - family holiday" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <input type="date" value={requestForm.startDate} onChange={(e) => setRequestForm({ ...requestForm, startDate: e.target.value })}
                className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border outline-none text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <input type="date" value={requestForm.endDate} onChange={(e) => setRequestForm({ ...requestForm, endDate: e.target.value })}
                className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border outline-none text-sm" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (optional)</label>
            <textarea value={requestForm.description} onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
              className="w-full h-20 px-3 py-2 rounded-md bg-secondary text-foreground border border-border outline-none text-sm resize-none"
              placeholder="Any additional details..." />
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsRequestOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Submit Request</Button>
          </div>
        </form>
      </Modal>

      {/* Availability Modal */}
      <Modal isOpen={isAvailOpen} onClose={() => setIsAvailOpen(false)} title="Set Availability">
        <form onSubmit={handleAddAvailability} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <select value={availForm.type} onChange={(e) => setAvailForm({ ...availForm, type: e.target.value })}
              className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border outline-none text-sm">
              <option value="unavailable">Unavailable</option>
              <option value="preferred_off">Preferred Off</option>
              <option value="preferred_on">Prefer to Work</option>
              <option value="restriction">Restriction (e.g., no nights)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <input type="date" required value={availForm.startDate} onChange={(e) => setAvailForm({ ...availForm, startDate: e.target.value })}
                className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border outline-none text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <input type="date" required value={availForm.endDate} onChange={(e) => setAvailForm({ ...availForm, endDate: e.target.value })}
                className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border outline-none text-sm" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason</label>
            <input type="text" value={availForm.reason} onChange={(e) => setAvailForm({ ...availForm, reason: e.target.value })}
              className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border outline-none text-sm"
              placeholder="e.g. Training course, childcare" />
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsAvailOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
