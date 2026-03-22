import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ChevronLeft, ChevronRight, Filter, Zap, PoundSterling, TrendingDown, AlertCircle, Clock, UserX, Loader2, GripVertical, Download, Share2, Lock, Unlock, Printer, Search } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { useAuthFetch, useAuth } from '../contexts/AuthContext';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';

type ViewMode = 'week' | 'day' | 'month';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDates(offset: number): { labels: string[]; dates: Date[] } {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1 + offset * 7);

  const dates: Date[] = [];
  const labels: string[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
    labels.push(`${WEEK_DAYS[i]} ${d.getDate()}`);
  }

  return { labels, dates };
}

function getMonthDays(offset: number): { labels: string[]; dates: Date[]; monthLabel: string } {
  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  const dates: Date[] = [];
  const labels: string[] = [];

  const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(month.getFullYear(), month.getMonth(), i);
    dates.push(d);
    const dayName = SHORT_DAYS[(d.getDay() + 6) % 7]; // Mon=0
    labels.push(`${dayName} ${i}`);
  }

  const monthLabel = month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  return { labels, dates, monthLabel };
}

function DraggableShiftCell({ shift, doc, dayLabel, onClick }: {
  shift: any;
  doc: any;
  dayLabel: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`h-full rounded-md p-2 flex flex-col justify-between border cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity ${
        shift.violation
          ? 'bg-destructive/10 border-destructive/30 text-destructive'
          : shift.type === 'Night'
            ? 'bg-slate-800 border-slate-700 text-slate-200 dark:bg-slate-700 dark:border-slate-600'
            : shift.type === 'Weekend'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
              : shift.isLocum
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-400'
                : 'bg-primary/10 border-primary/20 text-primary'
      }`}
    >
      <div className="flex items-center gap-1">
        <GripVertical className="w-3 h-3 opacity-50 shrink-0" />
        <span className="text-xs font-semibold truncate">{shift.type}</span>
      </div>
      <span className="text-[10px] opacity-80">{shift.time}</span>
    </div>
  );
}

type PlanningPeriod = '1week' | '2weeks' | '1month' | '3months' | '6months' | '1year';

const PERIOD_OPTIONS: { value: PlanningPeriod; label: string; days: number }[] = [
  { value: '1week', label: '1 Week', days: 7 },
  { value: '2weeks', label: '2 Weeks', days: 14 },
  { value: '1month', label: '1 Month', days: 28 },
  { value: '3months', label: '3 Months', days: 91 },
  { value: '6months', label: '6 Months', days: 182 },
  { value: '1year', label: '1 Year', days: 364 },
];

export function RotaBoard() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [planningPeriod, setPlanningPeriod] = useState<PlanningPeriod>('1week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [dayOffset, setDayOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const { addToast } = useToast();
  const authFetch = useAuthFetch();
  const { isAdmin } = useAuth();
  const [dbDoctors, setDbDoctors] = useState<any[]>([]);
  const [dbShifts, setDbShifts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningTo, setAssigningTo] = useState<any>(null);
  const [assignFormData, setAssignFormData] = useState({ type: 'Day', time: '08:00 - 20:00' });
  const [isSaving, setIsSaving] = useState(false);
  const [locumSpend, setLocumSpend] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [recoverySteps, setRecoverySteps] = useState<any[]>([]);
  const [recoveryCandidate, setRecoveryCandidate] = useState<any>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isRotaLocked, setIsRotaLocked] = useState(false);
  const [optimizeMode, setOptimizeMode] = useState<'full' | 'partial' | 'repair'>('full');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({ type: 'Day', time: '08:00 - 20:00' });

  // Rota filters
  const [rotaSearch, setRotaSearch] = useState('');
  const [rotaSearchInput, setRotaSearchInput] = useState('');
  const [rotaDept, setRotaDept] = useState('');
  const [rotaGrade, setRotaGrade] = useState('');
  const [rotaSite, setRotaSite] = useState('');
  const [rotaPage, setRotaPage] = useState(1);
  const [rotaTotal, setRotaTotal] = useState(0);
  const [rotaTotalPages, setRotaTotalPages] = useState(1);
  const [filterOptions, setFilterOptions] = useState<any>({ grades: [], departments: [], sites: [] });
  const ROTA_PAGE_SIZE = 25;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Load filter options once
  useEffect(() => {
    authFetch('/api/doctors/filters').then(r => r.json()).then(d => {
      if (d.success) setFilterOptions(d.data);
    }).catch(() => {});
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(rotaPage));
      params.set('limit', String(ROTA_PAGE_SIZE));
      if (rotaSearch) params.set('search', rotaSearch);
      if (rotaDept) params.set('department', rotaDept);
      if (rotaGrade) params.set('grade', rotaGrade);
      if (rotaSite) params.set('site', rotaSite);

      const [docRes, shiftRes] = await Promise.all([
        authFetch(`/api/doctors?${params.toString()}`),
        authFetch('/api/shifts'),
      ]);
      const docData = await docRes.json();
      const shiftData = await shiftRes.json();

      if (docData.success) {
        setDbDoctors((docData.data || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          role: d.grade,
          department: d.department,
          specialty: d.specialty,
          site: d.site,
          type: d.contract === 'Locum' ? 'Locum' : 'Staff',
        })));
        setRotaTotal(docData.total || docData.data?.length || 0);
        setRotaTotalPages(docData.totalPages || 1);
      }

      if (shiftData.success) {
        setDbShifts(shiftData.data);
        const locumShifts = shiftData.data.filter((s: any) => s.isLocum);
        setLocumSpend(locumShifts.length * 12 * 80);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => setRotaSearch(rotaSearchInput), 400);
    return () => clearTimeout(t);
  }, [rotaSearchInput]);

  // Reset to page 1 when filters change
  useEffect(() => { setRotaPage(1); }, [rotaDept, rotaGrade, rotaSite, rotaSearch]);

  useEffect(() => {
    fetchData();
    const handler = () => fetchData();
    window.addEventListener('rota-updated', handler);
    return () => window.removeEventListener('rota-updated', handler);
  }, [rotaPage, rotaDept, rotaGrade, rotaSite, rotaSearch]);

  const getShift = (docId: string, dayIdx: number) => {
    return dbShifts.find((s: any) => (s.docId === docId || s.doctorId === docId) && s.dayIdx === dayIdx);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Parse IDs: "shift-{shiftId}" and "cell-{docId}-{dayIdx}"
    const activeData = (active.data.current as any);
    const overData = (over.data.current as any);

    if (!activeData?.shiftId || !overData) return;

    const shiftId = activeData.shiftId;
    const newDocId = overData.docId;
    const newDayIdx = overData.dayIdx;

    try {
      const res = await authFetch(`/api/shifts/${shiftId}`, {
        method: 'PUT',
        body: JSON.stringify({ doctorId: newDocId, dayIdx: newDayIdx }),
      });

      const data = await res.json();
      if (data.success) {
        addToast('Shift moved successfully', 'success');
        fetchData();
      } else {
        addToast('Failed to move shift', 'error');
      }
    } catch (error) {
      addToast('Error moving shift', 'error');
    }
  };

  const handleApplyChanges = async () => {
    setIsSaving(true);
    try {
      const response = await authFetch('/api/rota/generate', {
        method: 'POST',
        body: JSON.stringify({
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + (PERIOD_OPTIONS.find(p => p.value === planningPeriod)?.days || 7) * 24 * 60 * 60 * 1000).toISOString(),
          rules: {},
          mode: optimizeMode,
          department: optimizeMode === 'partial' ? rotaDept : undefined,
          grade: optimizeMode === 'partial' ? rotaGrade : undefined,
          site: optimizeMode === 'partial' ? rotaSite : undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        const result = data.data;
        addToast(`${optimizeMode === 'repair' ? 'Repaired' : 'Generated'}: ${result.shifts?.length || 0} shifts (fairness: ${result.fairnessScore})`, 'success');
        setIsSimModalOpen(false);
        fetchData();
      } else {
        addToast('Failed to optimize rota', 'error');
      }
    } catch (error) {
      addToast('An error occurred during optimization', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShiftClick = (shift: any, doc: any, day: string) => {
    setSelectedShift({ ...shift, doc, day });
    setIsRecoveryMode(false);
  };

  const handleAssignClick = (doc: any, dayIdx: number, day: string) => {
    if (!isAdmin || isRotaLocked) return;
    setAssigningTo({ doc, dayIdx, day });
    setAssignFormData({ type: 'Day', time: '08:00 - 20:00' });
    setIsAssignModalOpen(true);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningTo) return;
    setIsSaving(true);
    try {
      const response = await authFetch('/api/shifts', {
        method: 'POST',
        body: JSON.stringify({
          doctorId: assigningTo.doc.id,
          dayIdx: assigningTo.dayIdx,
          type: assignFormData.type,
          time: assignFormData.time,
          isLocum: assigningTo.doc.type === 'Locum',
          violation: false,
        }),
      });

      const data = await response.json();
      if (data.success) {
        addToast('Shift assigned successfully', 'success');
        setIsAssignModalOpen(false);
        fetchData();
      }
    } catch (error) {
      addToast('An error occurred while saving', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteShift = async () => {
    if (!selectedShift?.id) return;
    try {
      const response = await authFetch(`/api/shifts/${selectedShift.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        addToast('Shift deleted', 'success');
        setSelectedShift(null);
        fetchData();
      }
    } catch (error) {
      addToast('Error deleting shift', 'error');
    }
  };

  // Determine columns based on view mode
  const { columns, columnLabels } = useMemo(() => {
    if (viewMode === 'day') {
      const date = new Date();
      date.setDate(date.getDate() + dayOffset);
      const dayIdx = (date.getDay() + 6) % 7; // Mon=0
      return {
        columns: [dayIdx],
        columnLabels: [date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })],
      };
    }
    if (viewMode === 'month') {
      const { labels } = getMonthDays(monthOffset);
      return {
        columns: Array.from({ length: labels.length }, (_, i) => i),
        columnLabels: labels,
      };
    }
    const { labels } = getWeekDates(weekOffset);
    return {
      columns: [0, 1, 2, 3, 4, 5, 6],
      columnLabels: labels,
    };
  }, [viewMode, weekOffset, dayOffset, monthOffset]);

  const navLabel = useMemo(() => {
    if (viewMode === 'day') {
      const date = new Date();
      date.setDate(date.getDate() + dayOffset);
      return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    }
    if (viewMode === 'month') {
      return getMonthDays(monthOffset).monthLabel;
    }
    if (weekOffset === 0) return 'This Week';
    if (weekOffset === 1) return 'Next Week';
    if (weekOffset === -1) return 'Last Week';
    return `Week ${weekOffset > 0 ? '+' : ''}${weekOffset}`;
  }, [viewMode, weekOffset, dayOffset, monthOffset]);

  const handlePrev = () => {
    if (viewMode === 'day') setDayOffset((p) => p - 1);
    else if (viewMode === 'month') setMonthOffset((p) => p - 1);
    else setWeekOffset((p) => p - 1);
  };

  const handleNext = () => {
    if (viewMode === 'day') setDayOffset((p) => p + 1);
    else if (viewMode === 'month') setMonthOffset((p) => p + 1);
    else setWeekOffset((p) => p + 1);
  };

  // Export rota as CSV
  const handleExportRota = () => {
    const headers = ['Doctor', 'Grade', 'Day', 'Shift Type', 'Time'];
    const rows = dbShifts.map((s: any) => {
      const doc = dbDoctors.find(d => d.id === s.doctorId) || { name: 'Unknown', role: '' };
      const dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][s.dayIdx] || s.dayIdx;
      return [doc.name, doc.role, dayName, s.type, s.time].map(v => `"${v}"`).join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rota-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(`Exported ${rows.length} shifts`, 'success');
  };

  // Print rota
  const handlePrintRota = () => {
    window.print();
  };

  // Publish/Lock rota
  const handleToggleLock = () => {
    setIsRotaLocked(!isRotaLocked);
    addToast(isRotaLocked ? 'Rota unlocked for editing' : 'Rota published and locked', 'success');
  };

  // Edit shift inline
  const handleEditShift = (shift: any) => {
    setEditingShift(shift);
    setEditFormData({ type: shift.type, time: shift.time });
    setIsEditModalOpen(true);
  };

  const handleSaveEditShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShift) return;
    setIsSaving(true);
    try {
      const res = await authFetch(`/api/shifts/${editingShift.id}`, {
        method: 'PUT',
        body: JSON.stringify(editFormData),
      });
      if ((await res.json()).success) {
        addToast('Shift updated', 'success');
        setIsEditModalOpen(false);
        fetchData();
      }
    } catch { addToast('Failed to update shift', 'error'); }
    finally { setIsSaving(false); }
  };

  const gridCols = viewMode === 'month'
    ? `grid-cols-[200px_repeat(${columns.length},minmax(40px,1fr))]`
    : viewMode === 'day'
      ? 'grid-cols-[200px_1fr]'
      : 'grid-cols-[200px_repeat(7,1fr)]';

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Rota Board</h1>
          <p className="text-muted-foreground mt-1 text-sm">Showing {dbDoctors.length} of {rotaTotal.toLocaleString()} doctors (page {rotaPage}/{rotaTotalPages})</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="bg-secondary p-0.5 rounded-lg flex items-center">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                  viewMode === mode ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex items-center rounded-md border border-border p-0.5 bg-card">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrev}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-medium px-2 min-w-[80px] text-center">{navLabel}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {isAdmin && !isRotaLocked && (
            <Button size="sm" onClick={() => setIsSimModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Zap className="w-4 h-4 mr-1" />
              Auto-Optimize
            </Button>
          )}
        </div>
      </div>

      {/* Rota action bar */}
      {dbShifts.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isRotaLocked && (
              <Badge variant="success" className="text-xs"><Lock className="w-3 h-3 mr-1" />Published</Badge>
            )}
            <span className="text-xs text-muted-foreground">{dbShifts.length} shifts assigned</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportRota}>
              <Download className="w-3.5 h-3.5 mr-1" />Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrintRota}>
              <Printer className="w-3.5 h-3.5 mr-1" />Print
            </Button>
            {isAdmin && (
              <Button variant={isRotaLocked ? 'outline' : 'default'} size="sm" onClick={handleToggleLock}>
                {isRotaLocked ? <><Unlock className="w-3.5 h-3.5 mr-1" />Unlock</> : <><Lock className="w-3.5 h-3.5 mr-1" />Publish</>}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Locum spend bar */}
      <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 px-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-full">
            <PoundSterling className="w-4 h-4 text-amber-600 dark:text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-400">Live Locum Spend</p>
            <p className="text-xs text-amber-700/80 dark:text-amber-500/80">Current week projection</p>
          </div>
        </div>
        <div className="text-right">
          {locumSpend === null ? (
            <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
          ) : (
            <>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-500">&pound;{locumSpend.toLocaleString()}</p>
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-500 flex items-center justify-end gap-1">
                <TrendingDown className="w-3 h-3" />
                Below budget
              </p>
            </>
          )}
        </div>
      </div>

      {/* Filter & Pagination Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={rotaSearchInput}
            onChange={(e) => setRotaSearchInput(e.target.value)}
            placeholder="Search by name, code, email..."
            className="h-8 pl-7 pr-3 w-52 rounded-md bg-secondary text-foreground border border-border text-xs focus:border-primary outline-none"
          />
        </div>
        <select value={rotaDept} onChange={(e) => setRotaDept(e.target.value)}
          className="h-8 px-2 rounded-md bg-secondary text-foreground border border-border text-xs focus:border-primary outline-none appearance-none">
          <option value="">All Departments</option>
          {filterOptions.departments?.map((d: string) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={rotaGrade} onChange={(e) => setRotaGrade(e.target.value)}
          className="h-8 px-2 rounded-md bg-secondary text-foreground border border-border text-xs focus:border-primary outline-none appearance-none">
          <option value="">All Grades</option>
          {filterOptions.grades?.map((g: string) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={rotaSite} onChange={(e) => setRotaSite(e.target.value)}
          className="h-8 px-2 rounded-md bg-secondary text-foreground border border-border text-xs focus:border-primary outline-none appearance-none">
          <option value="">All Sites</option>
          {filterOptions.sites?.map((s: string) => <option key={s} value={s}>{s}</option>)}
        </select>
        {(rotaDept || rotaGrade || rotaSite || rotaSearch) && (
          <button onClick={() => { setRotaDept(''); setRotaGrade(''); setRotaSite(''); setRotaSearchInput(''); }} className="text-xs text-destructive hover:underline">Clear all</button>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={rotaPage <= 1} onClick={() => setRotaPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-xs text-muted-foreground min-w-[60px] text-center">{rotaPage}/{rotaTotalPages}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={rotaPage >= rotaTotalPages} onClick={() => setRotaPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Rota Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 border border-border rounded-xl bg-card overflow-hidden flex flex-col">
          {/* Header Row */}
          <div
            className={`grid border-b border-border bg-secondary/50 ${gridCols}`}
            style={viewMode === 'month' ? { gridTemplateColumns: `200px repeat(${columns.length}, minmax(40px, 1fr))` } : undefined}
          >
            <div className="p-3 font-medium text-sm text-muted-foreground border-r border-border">Doctor</div>
            {columnLabels.map((label, i) => (
              <div key={i} className="p-3 font-medium text-xs text-center border-r border-border last:border-0">
                {label}
              </div>
            ))}
          </div>

          {/* Grid Body */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              dbDoctors.map((doc) => (
                <div
                  key={doc.id}
                  className={`grid border-b border-border last:border-0 hover:bg-secondary/20 transition-colors ${gridCols}`}
                  style={viewMode === 'month' ? { gridTemplateColumns: `200px repeat(${columns.length}, minmax(40px, 1fr))` } : undefined}
                >
                  <div className="p-3 border-r border-border flex flex-col justify-center">
                    <span className="font-medium text-sm flex items-center gap-2 truncate">
                      {doc.name}
                      {doc.type === 'Locum' && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Agency</Badge>
                      )}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{doc.role}</span>
                      <span className={`text-xs font-medium ${doc.hours > 40 ? 'text-destructive' : 'text-emerald-500'}`}>
                        {doc.hours}h
                      </span>
                    </div>
                  </div>

                  {columns.map((dayIdx, colIdx) => {
                    const shift = getShift(doc.id, dayIdx);
                    const cellId = `cell-${doc.id}-${dayIdx}`;

                    return (
                      <DroppableCell
                        key={cellId}
                        id={cellId}
                        docId={doc.id}
                        dayIdx={dayIdx}
                      >
                        {shift ? (
                          <DraggableShift
                            id={`shift-${shift.id}`}
                            shiftId={shift.id}
                          >
                            <DraggableShiftCell
                              shift={shift}
                              doc={doc}
                              dayLabel={columnLabels[colIdx]}
                              onClick={() => handleShiftClick(shift, doc, columnLabels[colIdx])}
                            />
                          </DraggableShift>
                        ) : (
                          <div
                            onClick={() => handleAssignClick(doc, dayIdx, columnLabels[colIdx])}
                            className="h-full w-full rounded-md border border-dashed border-transparent group-hover:border-border transition-colors flex items-center justify-center cursor-pointer min-h-[48px]"
                          >
                            <span className="text-muted-foreground opacity-0 group-hover:opacity-100 text-xl">+</span>
                          </div>
                        )}
                      </DroppableCell>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </DndContext>

      {/* Optimization Modal */}
      <Modal isOpen={isSimModalOpen} onClose={() => setIsSimModalOpen(false)} title="Optimization Engine">
        <div className="space-y-4 py-4">
          {/* Planning period selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Rota Period</label>
            <div className="grid grid-cols-3 gap-1.5">
              {PERIOD_OPTIONS.map((p) => (
                <button key={p.value} type="button" onClick={() => setPlanningPeriod(p.value)}
                  className={`px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                    planningPeriod === p.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Generates shifts for {PERIOD_OPTIONS.find(p => p.value === planningPeriod)?.days} days from today
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Optimization Mode</label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { mode: 'full', label: 'Full Rebuild', desc: 'Wipe and regenerate entire rota', color: 'border-destructive/30 bg-destructive/5' },
              { mode: 'partial', label: 'Partial Regen', desc: 'Only regenerate current filter', color: 'border-amber-500/30 bg-amber-500/5' },
              { mode: 'repair', label: 'Repair Gaps', desc: 'Fill uncovered slots only', color: 'border-emerald-500/30 bg-emerald-500/5' },
            ].map((m) => (
              <button key={m.mode} type="button" onClick={() => setOptimizeMode(m.mode as any)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  optimizeMode === m.mode ? 'ring-2 ring-primary ' + m.color : 'border-border hover:bg-secondary'
                }`}>
                <div className="text-xs font-semibold">{m.label}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{m.desc}</div>
              </button>
            ))}
          </div>

          {optimizeMode === 'partial' && (rotaDept || rotaGrade || rotaSite) && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs">
              <p className="font-medium text-amber-600 dark:text-amber-400">Partial mode will only regenerate shifts for:</p>
              <p className="mt-1 text-muted-foreground">
                {[rotaDept && `Department: ${rotaDept}`, rotaGrade && `Grade: ${rotaGrade}`, rotaSite && `Site: ${rotaSite}`].filter(Boolean).join(' | ') || 'All (set filters above to narrow scope)'}
              </p>
            </div>
          )}

          {optimizeMode === 'repair' && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs">
              <p className="font-medium text-emerald-600 dark:text-emerald-400">Repair mode preserves existing shifts</p>
              <p className="mt-1 text-muted-foreground">Only adds new shifts to fill gaps. No existing assignments will change.</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsSimModalOpen(false)}>Cancel</Button>
          <Button onClick={handleApplyChanges} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
            {optimizeMode === 'full' ? 'Full Rebuild' : optimizeMode === 'partial' ? 'Partial Regen' : 'Repair Gaps'}
          </Button>
        </div>
      </Modal>

      {/* Assign Shift Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assign Shift">
        {assigningTo && (
          <form onSubmit={handleSaveAssignment} className="space-y-4 py-4">
            <div className="p-3 bg-secondary/50 rounded-lg border border-border">
              <p className="text-sm font-medium">{assigningTo.doc.name}</p>
              <p className="text-xs text-muted-foreground">{assigningTo.doc.role} &bull; {assigningTo.day}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Shift Type</label>
              <select
                value={assignFormData.type}
                onChange={(e) => {
                  const type = e.target.value;
                  let time = '08:00 - 20:00';
                  if (type === 'Night') time = '20:00 - 08:00';
                  if (type === 'Long Day') time = '08:00 - 22:00';
                  setAssignFormData({ type, time });
                }}
                className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="Day">Day</option>
                <option value="Long Day">Long Day</option>
                <option value="Night">Night</option>
                <option value="Weekend">Weekend</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Time</label>
              <input
                type="text"
                value={assignFormData.time}
                onChange={(e) => setAssignFormData({ ...assignFormData, time: e.target.value })}
                className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div className="pt-4 flex justify-end gap-3 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Assign Shift
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Shift Details Modal */}
      <Modal
        isOpen={!!selectedShift}
        onClose={() => { setSelectedShift(null); setIsRecoveryMode(false); }}
        title={isRecoveryMode ? 'AI Auto-Recovery' : 'Shift Details'}
      >
        {selectedShift && !isRecoveryMode && (
          <div className="space-y-6 py-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{selectedShift.doc.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedShift.doc.role} &bull; {selectedShift.day}</p>
              </div>
              <Badge variant={selectedShift.violation ? 'destructive' : 'secondary'}>
                {selectedShift.type} Shift
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-secondary/50 rounded-lg border border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" /> Time
                </div>
                <div className="font-medium">{selectedShift.time}</div>
              </div>
              <div className="p-3 bg-secondary/50 rounded-lg border border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <AlertCircle className="w-4 h-4" /> Status
                </div>
                <div className="font-medium text-emerald-500">Confirmed</div>
              </div>
            </div>

            {selectedShift.violation && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>This shift causes an EWTD violation (exceeds 48h avg).</p>
              </div>
            )}

            <div className="pt-4 border-t border-border flex justify-between items-center flex-wrap gap-2">
              {isAdmin && (
                <Button variant="destructive" size="sm" onClick={async () => {
                  setIsRecoveryMode(true);
                  setIsRecovering(true);
                  setRecoverySteps([]);
                  setRecoveryCandidate(null);

                  // Step 1: Check internal pool
                  try {
                    const res = await authFetch('/api/doctors');
                    const data = await res.json();
                    const allDocs = data.data || [];
                    const sickDocId = selectedShift.doc.id;
                    const dayIdx = selectedShift.dayIdx;

                    // Find doctors NOT already working this day
                    const busyIds = dbShifts.filter((s: any) => s.dayIdx === dayIdx).map((s: any) => s.doctorId || s.docId);
                    const available = allDocs.filter((d: any) => d.id !== sickDocId && !busyIds.includes(d.id) && d.status === 'Active');

                    if (available.length === 0) {
                      setRecoverySteps([{ title: 'Internal Pool', status: 'failed', detail: `All ${allDocs.length - 1} staff are busy or unavailable.` }]);
                      setRecoverySteps(prev => [...prev, { title: 'Recovery', status: 'failed', detail: 'No replacement found. Consider locum booking.' }]);
                    } else {
                      // Pick the one with lowest karma (fairness - give them a chance to earn)
                      const sorted = [...available].sort((a, b) => (a.karma || 0) - (b.karma || 0));
                      const candidate = sorted[0];

                      setRecoverySteps([
                        { title: 'Internal Pool Search', status: 'success', detail: `Found ${available.length} available doctor(s). Selected ${candidate.name} (lowest karma = fair distribution).` },
                      ]);
                      setRecoveryCandidate(candidate);
                    }
                  } catch {
                    setRecoverySteps([{ title: 'Internal Pool', status: 'failed', detail: 'Failed to fetch doctors.' }]);
                  } finally {
                    setIsRecovering(false);
                  }
                }}>
                  <UserX className="w-4 h-4 mr-2" />
                  Report Sick
                </Button>
              )}
              <div className="flex gap-2">
                {selectedShift.id && isAdmin && !isRotaLocked && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => { setSelectedShift(null); handleEditShift(selectedShift); }}>
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/20" onClick={handleDeleteShift}>
                      Delete
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" onClick={() => setSelectedShift(null)}>Close</Button>
              </div>
            </div>
          </div>
        )}

        {selectedShift && isRecoveryMode && (
          <div className="space-y-6 py-4">
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <h4 className="font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4" /> Auto-Recovery Initiated
              </h4>
              <p className="text-sm text-muted-foreground">
                {selectedShift.doc.name} reported sick for {selectedShift.day}. Evaluating replacement options...
              </p>
            </div>

            {isRecovering ? (
              <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin text-primary" /> Checking available staff...
              </div>
            ) : (
              <div className="space-y-3">
                {recoverySteps.map((step, i) => (
                  <div key={i} className={`p-4 rounded-lg border ${step.status === 'success' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-card'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`font-medium text-sm ${step.status === 'success' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{step.title}</h4>
                      <Badge variant={step.status === 'success' ? 'success' : 'secondary'} className="text-[10px]">
                        {step.status === 'success' ? 'Success' : 'Failed'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{step.detail}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-border flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setIsRecoveryMode(false); setRecoverySteps([]); setRecoveryCandidate(null); }}>Cancel</Button>
              {recoveryCandidate && (
                <Button onClick={async () => {
                  try {
                    const res = await authFetch(`/api/shifts/${selectedShift.id}`, {
                      method: 'PUT',
                      body: JSON.stringify({ doctorId: recoveryCandidate.id }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      addToast(`Shift reassigned to ${recoveryCandidate.name}!`, 'success');
                      setSelectedShift(null);
                      setIsRecoveryMode(false);
                      setRecoveryCandidate(null);
                      fetchData();
                    }
                  } catch { addToast('Failed to reassign shift', 'error'); }
                }} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Confirm {recoveryCandidate.name}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Shift Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Shift">
        {editingShift && (
          <form onSubmit={handleSaveEditShift} className="space-y-4 py-4">
            <div className="p-3 bg-secondary/50 rounded-lg border border-border">
              <p className="text-sm font-medium">{editingShift.doc?.name || 'Doctor'}</p>
              <p className="text-xs text-muted-foreground">{editingShift.day || `Day ${editingShift.dayIdx}`}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Shift Type</label>
              <select value={editFormData.type} onChange={(e) => {
                const type = e.target.value;
                let time = '08:00 - 20:00';
                if (type === 'Night') time = '20:00 - 08:00';
                if (type === 'Long Day') time = '08:00 - 22:00';
                setEditFormData({ type, time });
              }} className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border focus:border-primary outline-none">
                <option value="Day">Day</option>
                <option value="Long Day">Long Day</option>
                <option value="Night">Night</option>
                <option value="Weekend">Weekend</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Time</label>
              <input type="text" value={editFormData.time} onChange={(e) => setEditFormData({ ...editFormData, time: e.target.value })}
                className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border focus:border-primary outline-none" />
            </div>
            <div className="pt-4 flex justify-end gap-3 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

// DnD helper components
import { useDroppable, useDraggable } from '@dnd-kit/core';

function DroppableCell({ id, docId, dayIdx, children, ...rest }: {
  id: string;
  docId: string;
  dayIdx: number;
  children: React.ReactNode;
  [key: string]: any;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { docId, dayIdx },
  });

  return (
    <div
      ref={setNodeRef}
      className={`p-1.5 border-r border-border last:border-0 relative group min-h-[56px] transition-colors ${
        isOver ? 'bg-primary/10' : ''
      }`}
    >
      {children}
    </div>
  );
}

function DraggableShift({ id, shiftId, children }: {
  id: string;
  shiftId: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { shiftId },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="h-full">
      {children}
    </div>
  );
}
