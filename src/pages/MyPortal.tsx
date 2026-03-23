import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Calendar, Clock, CalendarOff, FileText, Loader2, Plus, CheckCircle2, XCircle, AlertTriangle, Star, ChevronLeft, ChevronRight, RefreshCw, Link as LinkIcon } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { useAuth, useAuthFetch } from '../contexts/AuthContext';

// Shift type → short code + color (Loop-style)
const SHIFT_CODES: Record<string, { code: string; bg: string; text: string }> = {
  'Day':      { code: 'D',  bg: 'bg-emerald-500', text: 'text-white' },
  'Long Day': { code: 'LD', bg: 'bg-emerald-600', text: 'text-white' },
  'Night':    { code: 'N',  bg: 'bg-slate-700',   text: 'text-slate-100' },
  'Weekend':  { code: 'WE', bg: 'bg-amber-500',   text: 'text-white' },
  'On-call':  { code: 'OC', bg: 'bg-purple-500',  text: 'text-white' },
};

function getShiftBadge(type: string, time?: string) {
  const config = SHIFT_CODES[type] || { code: type.slice(0, 2).toUpperCase(), bg: 'bg-secondary', text: 'text-foreground' };
  const shortTime = time ? time.split(' - ')[0]?.slice(0, 5) : '';
  return { ...config, shortTime };
}

// Get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

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
  const [calendarTab, setCalendarTab] = useState<'personal' | 'team'>('personal');
  const [monthOffset, setMonthOffset] = useState(0);
  const [icalUrl, setIcalUrl] = useState('');

  const [requestForm, setRequestForm] = useState({
    type: 'leave', subType: 'annual', title: '', description: '', startDate: '', endDate: '', priority: 'normal',
  });
  const [availForm, setAvailForm] = useState({
    type: 'unavailable', startDate: '', endDate: '', reason: '', isRecurring: false, recurringDay: '',
  });

  const fetchData = async () => {
    try {
      const [shiftsRes, requestsRes, availRes, statsRes, icalRes] = await Promise.all([
        authFetch('/api/self-service/my-shifts'),
        authFetch('/api/self-service/requests'),
        authFetch('/api/self-service/availability'),
        authFetch('/api/self-service/my-stats'),
        authFetch('/api/export/ical-url'),
      ]);
      setShifts((await shiftsRes.json()).data || []);
      setRequests((await requestsRes.json()).data || []);
      setAvailability((await availRes.json()).data || []);
      setStats((await statsRes.json()).data);
      const icalData = await icalRes.json();
      if (icalData.success && icalData.data?.url) setIcalUrl(icalData.data.url);
    } catch {} finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // Build calendar data for the current month
  const calendarData = useMemo(() => {
    const now = new Date();
    const month = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const monthLabel = month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

    // Build weeks
    const weeks: { weekNum: number; days: { date: number; dayOfWeek: number; isToday: boolean; shifts: any[] }[] }[] = [];
    let currentWeek: any[] = [];
    let currentWeekNum = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(month.getFullYear(), month.getMonth(), day);
      const dayOfWeek = (d.getDay() + 6) % 7; // Mon=0, Sun=6
      const weekNum = getWeekNumber(d);

      if (day === 1 || dayOfWeek === 0) {
        if (currentWeek.length > 0) {
          weeks.push({ weekNum: currentWeekNum, days: currentWeek });
        }
        currentWeek = [];
        currentWeekNum = weekNum;

        // Pad start of first week with empty days
        if (day === 1 && dayOfWeek > 0) {
          for (let i = 0; i < dayOfWeek; i++) {
            currentWeek.push({ date: 0, dayOfWeek: i, isToday: false, shifts: [] });
          }
        }
      }

      const dayShifts = shifts.filter((s: any) => s.dayIdx % 7 === dayOfWeek || s.dayIdx === day - 1);
      const isToday = d.toDateString() === now.toDateString();

      currentWeek.push({ date: day, dayOfWeek, isToday, shifts: dayShifts });
    }
    if (currentWeek.length > 0) {
      weeks.push({ weekNum: currentWeekNum, days: currentWeek });
    }

    return { monthLabel, weeks, month };
  }, [monthOffset, shifts]);

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

  const statusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'pending': return <Clock className="w-4 h-4 text-amber-500" />;
      default: return <AlertTriangle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Portal</h1>
          <p className="text-muted-foreground mt-1 text-sm">Last updated: {new Date().toLocaleDateString('en-GB')} at {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="flex items-center gap-2">
          {icalUrl && (
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(icalUrl); addToast('Calendar URL copied!', 'success'); }}>
              <LinkIcon className="w-3.5 h-3.5 mr-1" />Sync Calendar
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setIsAvailOpen(true)}>
            <CalendarOff className="w-3.5 h-3.5 mr-1" />Availability
          </Button>
          <Button size="sm" onClick={() => setIsRequestOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />Request
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid gap-3 grid-cols-4">
            <Card><CardContent className="p-3 text-center">
              <p className="text-xl font-bold">{stats?.totalShifts || 0}</p>
              <p className="text-[10px] text-muted-foreground">Shifts</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-amber-500">{stats?.pendingRequests || 0}</p>
              <p className="text-[10px] text-muted-foreground">Pending</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-xl font-bold">{stats?.historicalLoad?.hoursWorkedLast7 || 0}h</p>
              <p className="text-[10px] text-muted-foreground">Hours (7d)</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-emerald-500">{Math.round((stats?.historicalLoad?.complianceScore || 1) * 100)}%</p>
              <p className="text-[10px] text-muted-foreground">Compliance</p>
            </CardContent></Card>
          </div>

          {/* ==========================================
              LOOP-STYLE CALENDAR
              ========================================== */}
          <Card>
            <CardContent className="p-4">
              {/* Month header + tabs */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold">{calendarData.monthLabel}</h2>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setMonthOffset(p => p - 1)} className="p-1 hover:bg-secondary rounded"><ChevronLeft className="w-4 h-4" /></button>
                    <button onClick={() => setMonthOffset(0)} className="text-xs text-primary hover:underline px-1">Today</button>
                    <button onClick={() => setMonthOffset(p => p + 1)} className="p-1 hover:bg-secondary rounded"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="flex items-center bg-secondary rounded-lg p-0.5">
                  <button onClick={() => setCalendarTab('personal')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${calendarTab === 'personal' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>
                    Personal
                  </button>
                  <button onClick={() => setCalendarTab('team')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${calendarTab === 'team' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>
                    Team
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-[40px_repeat(7,1fr)] gap-0 mb-1">
                <div />
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <div key={i} className={`text-center text-xs font-bold py-1 ${i >= 5 ? 'text-amber-500' : 'text-muted-foreground'}`}>{d}</div>
                ))}
              </div>

              {/* Week rows */}
              <div className="space-y-1">
                {calendarData.weeks.map((week) => (
                  <div key={week.weekNum} className="grid grid-cols-[40px_repeat(7,1fr)] gap-0">
                    {/* Week number */}
                    <div className="flex items-center justify-center text-xs text-muted-foreground font-medium">
                      W{week.weekNum}
                    </div>

                    {/* Days */}
                    {Array.from({ length: 7 }, (_, i) => {
                      const dayData = week.days.find(d => d.dayOfWeek === i);
                      if (!dayData || dayData.date === 0) {
                        return <div key={i} className="min-h-[44px]" />;
                      }

                      const hasShift = dayData.shifts.length > 0;
                      const shift = dayData.shifts[0];
                      const badge = shift ? getShiftBadge(shift.type, shift.time) : null;

                      return (
                        <div key={i} className={`min-h-[44px] flex flex-col items-center justify-center rounded-md mx-0.5 transition-colors ${
                          dayData.isToday ? 'ring-2 ring-primary' : ''
                        } ${i >= 5 ? 'bg-secondary/30' : ''}`}>
                          <span className={`text-[10px] ${dayData.isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                            {dayData.date}
                          </span>
                          {hasShift && badge ? (
                            <div className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${badge.bg} ${badge.text} leading-none`}>
                              {badge.code}
                              {badge.shortTime && <div className="text-[8px] font-normal opacity-80 mt-0.5">{badge.shortTime}</div>}
                            </div>
                          ) : (
                            <div className="mt-0.5 px-1.5 py-0.5 rounded text-[10px] text-muted-foreground/40 font-medium">
                              OFF
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border flex-wrap">
                {Object.entries(SHIFT_CODES).map(([type, config]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <span className={`inline-block w-5 h-4 rounded text-[9px] font-bold text-center leading-4 ${config.bg} ${config.text}`}>{config.code}</span>
                    <span className="text-[10px] text-muted-foreground">{type}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-5 h-4 rounded text-[9px] text-center leading-4 text-muted-foreground/40 border border-border">OFF</span>
                  <span className="text-[10px] text-muted-foreground">Day Off</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* My Requests */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />My Requests</CardTitle></CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No requests yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {requests.slice(0, 5).map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center gap-2">
                        {statusIcon(r.status)}
                        <div>
                          <p className="text-xs font-medium">{r.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {r.type}{r.startDate ? ` · ${new Date(r.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'destructive' : 'warning'} className="text-[10px]">{r.status}</Badge>
                        {r.status === 'pending' && (
                          <button onClick={() => handleCancelRequest(r.id)} className="text-[10px] text-destructive hover:underline">Cancel</button>
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
              className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border outline-none text-sm" placeholder="e.g. Annual leave - family holiday" />
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
            <label className="text-sm font-medium">Notes</label>
            <textarea value={requestForm.description} onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
              className="w-full h-20 px-3 py-2 rounded-md bg-secondary text-foreground border border-border outline-none text-sm resize-none" placeholder="Optional details..." />
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsRequestOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Submit</Button>
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
              <option value="restriction">Restriction</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start</label>
              <input type="date" required value={availForm.startDate} onChange={(e) => setAvailForm({ ...availForm, startDate: e.target.value })}
                className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border outline-none text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End</label>
              <input type="date" required value={availForm.endDate} onChange={(e) => setAvailForm({ ...availForm, endDate: e.target.value })}
                className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border outline-none text-sm" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason</label>
            <input type="text" value={availForm.reason} onChange={(e) => setAvailForm({ ...availForm, reason: e.target.value })}
              className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border outline-none text-sm" placeholder="e.g. Training, childcare" />
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
