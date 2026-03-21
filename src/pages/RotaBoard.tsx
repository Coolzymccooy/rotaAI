import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ChevronLeft, ChevronRight, Filter, Zap, PoundSterling, TrendingDown, AlertCircle, CheckCircle2, GitMerge, Clock, UserX, Loader2 } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';

const days = ['Mon 12', 'Tue 13', 'Wed 14', 'Thu 15', 'Fri 16', 'Sat 17', 'Sun 18'];
const doctors = [
  { id: 1, name: 'Dr. Sarah Smith', role: 'Consultant', hours: 38, type: 'Staff' },
  { id: 2, name: 'Dr. James Wilson', role: 'Registrar', hours: 42, type: 'Staff' },
  { id: 3, name: 'Dr. Emily Chen', role: 'SHO', hours: 36, type: 'Staff' },
  { id: 4, name: 'Dr. Michael Brown', role: 'Consultant', hours: 40, type: 'Staff' },
  { id: 5, name: 'Dr. Lisa Taylor', role: 'Registrar', hours: 45, type: 'Staff' }, // Over hours
  { id: 6, name: 'Agency Locum', role: 'Any', hours: 12, type: 'Locum' },
];

const shifts = [
  { docId: 1, dayIdx: 0, type: 'Day', time: '08:00 - 20:00' },
  { docId: 1, dayIdx: 1, type: 'Day', time: '08:00 - 20:00' },
  { docId: 2, dayIdx: 2, type: 'Night', time: '20:00 - 08:00' },
  { docId: 2, dayIdx: 3, type: 'Night', time: '20:00 - 08:00' },
  { docId: 3, dayIdx: 5, type: 'Weekend', time: '08:00 - 20:00' },
  { docId: 5, dayIdx: 4, type: 'Day', time: '08:00 - 20:00', violation: true },
  { docId: 6, dayIdx: 6, type: 'Night', time: '20:00 - 08:00', isLocum: true },
];

export function RotaBoard() {
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const { addToast } = useToast();
  const [dbDoctors, setDbDoctors] = useState<any[]>([]);
  const [dbShifts, setDbShifts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningTo, setAssigningTo] = useState<any>(null);
  const [assignFormData, setAssignFormData] = useState({
    type: 'Day',
    time: '08:00 - 20:00'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [locumSpend, setLocumSpend] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const [docRes, shiftRes] = await Promise.all([
        fetch('/api/doctors'),
        fetch('/api/shifts')
      ]);
      const docData = await docRes.json();
      const shiftData = await shiftRes.json();

      if (docData.success && shiftData.success) {
        if (docData.data.length === 0) {
          // Use static data if DB is empty
          setDbDoctors(doctors);
          setDbShifts(shifts);
          setLocumSpend(1020);
        } else {
          // Map DB doctors to the format expected by the UI
          const mappedDoctors = docData.data.map((d: any, index: number) => ({
            id: d.id,
            name: d.name,
            role: d.grade,
            hours: Math.floor(Math.random() * 15) + 30, // Mock hours for now
            type: d.contract === '100%' ? 'Staff' : 'Locum',
          }));
          
          // Add the agency locum
          mappedDoctors.push({ id: 'locum-1', name: 'Agency Locum', role: 'Any', hours: 12, type: 'Locum' });
          
          setDbDoctors(mappedDoctors);

          // Map DB shifts if they exist, otherwise use static shifts mapped to new doctor IDs
          if (shiftData.data.length > 0) {
             setDbShifts(shiftData.data);
             // Calculate locum spend
             const locumShifts = shiftData.data.filter((s: any) => s.isLocum);
             const spend = locumShifts.length * 12 * 80;
             setLocumSpend(spend);
          } else {
             // Map static shifts to the new DB doctor IDs
             const mappedShifts = shifts.map(s => {
               const docIndex = s.docId - 1;
               const newDocId = mappedDoctors[docIndex] ? mappedDoctors[docIndex].id : s.docId;
               return { ...s, docId: newDocId };
             });
             setDbShifts(mappedShifts);
             setLocumSpend(1020);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setDbDoctors(doctors);
      setDbShifts(shifts);
      setLocumSpend(1020);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleRotaUpdated = () => {
      fetchData();
    };

    window.addEventListener('rota-updated', handleRotaUpdated);
    return () => {
      window.removeEventListener('rota-updated', handleRotaUpdated);
    };
  }, []);

  const getShift = (docId: string | number, dayIdx: number) => {
    return dbShifts.find(s => (s.docId === docId || s.doctorId === docId) && s.dayIdx === dayIdx);
  };

  const handleApplyChanges = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/rota/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          rules: {}
        })
      });
      
      const data = await response.json();
      if (data.success) {
        addToast('Optimization applied successfully. Rota updated.', 'success');
        setIsSimModalOpen(false);
        fetchData();
      } else {
        addToast('Failed to optimize rota', 'destructive');
      }
    } catch (error) {
      console.error('Optimize error:', error);
      addToast('An error occurred during optimization', 'destructive');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShiftClick = (shift: any, doc: any, day: string) => {
    setSelectedShift({ ...shift, doc, day });
    setIsRecoveryMode(false);
  };

  const handleAssignClick = (doc: any, dayIdx: number, day: string) => {
    setAssigningTo({ doc, dayIdx, day });
    setAssignFormData({ type: 'Day', time: '08:00 - 20:00' });
    setIsAssignModalOpen(true);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningTo) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: assigningTo.doc.id,
          dayIdx: assigningTo.dayIdx,
          type: assignFormData.type,
          time: assignFormData.time,
          isLocum: assigningTo.doc.type === 'Locum',
          violation: false
        })
      });
      
      const data = await response.json();
      if (data.success) {
        addToast('Shift assigned successfully', 'success');
        setIsAssignModalOpen(false);
        fetchData();
      } else {
        addToast('Failed to assign shift', 'destructive');
      }
    } catch (error) {
      console.error('Save error:', error);
      addToast('An error occurred while saving', 'destructive');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReportSick = () => {
    setIsRecoveryMode(true);
    addToast('Initiating AI Auto-Recovery...', 'info');
  };

  const handleApplyRecovery = () => {
    setSelectedShift(null);
    setIsRecoveryMode(false);
    addToast('Shift recovered successfully. Dr. Chen assigned.', 'success');
  };

  const handleDeleteShift = async () => {
    if (!selectedShift || !selectedShift.id) {
      addToast('Cannot delete static mock shift', 'warning');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this shift?')) return;
    
    try {
      const response = await fetch(`/api/shifts/${selectedShift.id}`, { method: 'DELETE' });
      const data = await response.json();
      
      if (data.success) {
        addToast('Shift deleted', 'success');
        setSelectedShift(null);
        fetchData();
      } else {
        addToast('Failed to delete shift', 'destructive');
      }
    } catch (error) {
      console.error('Delete error:', error);
      addToast('An error occurred while deleting', 'destructive');
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rota Board</h1>
          <p className="text-muted-foreground mt-1">Manage and optimize shifts for Oct 12 - Oct 18.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => addToast('Opening filters...', 'info')}>
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <div className="flex items-center rounded-md border border-border p-1 bg-card">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => addToast('Navigating to previous week...', 'info')}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm font-medium px-3">This Week</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => addToast('Navigating to next week...', 'info')}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <Button onClick={() => setIsSimModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Zap className="w-4 h-4 mr-2" />
            Auto-Optimize
          </Button>
        </div>
      </div>

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
              <p className="text-lg font-bold text-amber-600 dark:text-amber-500">£{locumSpend.toLocaleString()}</p>
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-500 flex items-center justify-end gap-1">
                <TrendingDown className="w-3 h-3" />
                Below budget
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 border border-border rounded-xl bg-card overflow-hidden flex flex-col">
        {/* Header Row */}
        <div className="grid grid-cols-8 border-b border-border bg-secondary/50">
          <div className="p-4 font-medium text-sm text-muted-foreground border-r border-border">Doctor</div>
          {days.map((day, i) => (
            <div key={i} className="p-4 font-medium text-sm text-center border-r border-border last:border-0">
              {day}
            </div>
          ))}
        </div>

        {/* Grid Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            dbDoctors.map((doc) => (
              <div key={doc.id} className="grid grid-cols-8 border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                <div className="p-4 border-r border-border flex flex-col justify-center">
                  <span className="font-medium text-sm flex items-center gap-2">
                    {doc.name}
                    {doc.type === 'Locum' && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Agency</Badge>}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{doc.role}</span>
                    <span className={`text-xs font-medium ${doc.hours > 40 ? 'text-destructive' : 'text-emerald-500'}`}>
                      {doc.hours}h
                    </span>
                  </div>
                </div>
                
                {days.map((_, dayIdx) => {
                  const shift = getShift(doc.id, dayIdx);
                  return (
                    <div key={dayIdx} className="p-2 border-r border-border last:border-0 relative group">
                      {shift ? (
                        <div 
                          onClick={() => handleShiftClick(shift, doc, days[dayIdx])}
                          className={`h-full rounded-md p-2 flex flex-col justify-between border cursor-pointer hover:opacity-80 transition-opacity ${
                          shift.violation 
                            ? 'bg-destructive/10 border-destructive/30 text-destructive'
                            : shift.type === 'Night' 
                              ? 'bg-slate-800 border-slate-700 text-slate-200 dark:bg-slate-700 dark:border-slate-600'
                              : shift.type === 'Weekend'
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                                : shift.isLocum
                                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-400'
                                  : 'bg-primary/10 border-primary/20 text-primary'
                        }`}>
                          <span className="text-xs font-semibold">{shift.type}</span>
                          <span className="text-[10px] opacity-80">{shift.time}</span>
                        </div>
                      ) : (
                        <div 
                          onClick={() => handleAssignClick(doc, dayIdx, days[dayIdx])}
                          className="h-full w-full rounded-md border border-dashed border-transparent group-hover:border-border transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <span className="text-muted-foreground opacity-0 group-hover:opacity-100 text-xl">+</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      <Modal isOpen={isSimModalOpen} onClose={() => setIsSimModalOpen(false)} title="Optimization Simulator">
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            The AI engine has found a more optimal schedule. Here is the projected impact:
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-border p-4 bg-secondary/50">
              <div className="text-sm font-medium text-muted-foreground mb-1">Rule Violations</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-destructive line-through opacity-50">3</span>
                <span className="text-2xl font-bold text-emerald-500">0</span>
              </div>
            </div>
            <div className="rounded-lg border border-border p-4 bg-secondary/50">
              <div className="text-sm font-medium text-muted-foreground mb-1">Locum Spend</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-destructive line-through opacity-50">£1,020</span>
                <span className="text-2xl font-bold text-emerald-500">£0</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <h4 className="text-sm font-medium mb-3">Key Changes</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <span>Swapped Dr. Taylor (Fri) with Dr. Chen to resolve hours violation.</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <span>Assigned Dr. Brown to uncovered Sunday night shift.</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsSimModalOpen(false)}>Cancel</Button>
          <Button onClick={handleApplyChanges} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Apply Changes
          </Button>
        </div>
      </Modal>

      {/* Assign Shift Modal */}
      <Modal 
        isOpen={isAssignModalOpen} 
        onClose={() => setIsAssignModalOpen(false)} 
        title="Assign Shift"
      >
        {assigningTo && (
          <form onSubmit={handleSaveAssignment} className="space-y-4 py-4">
            <div className="p-3 bg-secondary/50 rounded-lg border border-border mb-4">
              <p className="text-sm font-medium">{assigningTo.doc.name}</p>
              <p className="text-xs text-muted-foreground">{assigningTo.doc.role} • {assigningTo.day}</p>
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
                className="w-full h-10 px-3 rounded-md bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
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
                onChange={(e) => setAssignFormData({...assignFormData, time: e.target.value})}
                className="w-full h-10 px-3 rounded-md bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder="e.g. 08:00 - 20:00"
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsAssignModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Assign Shift
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Shift Details & Auto-Recovery Modal */}
      <Modal 
        isOpen={!!selectedShift} 
        onClose={() => { setSelectedShift(null); setIsRecoveryMode(false); }} 
        title={isRecoveryMode ? "AI Auto-Recovery" : "Shift Details"}
      >
        {selectedShift && !isRecoveryMode && (
          <div className="space-y-6 py-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{selectedShift.doc.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedShift.doc.role} • {selectedShift.day}</p>
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

            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <Zap className="w-4 h-4" />
                AI Rationale
              </div>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  Optimal match based on {selectedShift.doc.name}'s preferred shift patterns.
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  Maintains 11h minimum rest period from previous shift.
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  Balances weekend fairness across the {selectedShift.doc.role} cohort.
                </li>
                {selectedShift.isLocum && (
                  <li className="flex items-start gap-2 text-amber-600 dark:text-amber-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    Assigned to locum due to staff shortage.
                  </li>
                )}
              </ul>
            </div>

            {selectedShift.violation && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>This shift causes a European Working Time Directive (EWTD) violation (exceeds 48h avg).</p>
              </div>
            )}

            <div className="pt-4 border-t border-border flex justify-between items-center">
              <Button variant="destructive" onClick={handleReportSick}>
                <UserX className="w-4 h-4 mr-2" />
                Report Sick / No-Show
              </Button>
              <div className="space-x-2">
                {selectedShift.id && (
                  <Button variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20" onClick={handleDeleteShift}>
                    Delete
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedShift(null)}>Close</Button>
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
                {selectedShift.doc.name} reported sick for {selectedShift.day} ({selectedShift.time}). 
                The AI is evaluating replacement options.
              </p>
            </div>

            <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              {/* Explainable AI Decision Tree Steps */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-secondary text-muted-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <GitMerge className="w-4 h-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-lg border border-border bg-card shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-sm">Step 1: Internal Pool</h4>
                    <Badge variant="secondary" className="text-[10px]">Failed</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Checked 12 available staff. 10 lack required specialty. 2 would trigger EWTD violations.</p>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-secondary text-muted-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <GitMerge className="w-4 h-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-lg border border-border bg-card shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-sm">Step 2: Bank Staff</h4>
                    <Badge variant="secondary" className="text-[10px]">Failed</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Broadcasted to Bank. No responses within 15 minute SLA window.</p>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-emerald-500/20 text-emerald-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-sm text-emerald-600 dark:text-emerald-400">Step 3: Shift Bidding</h4>
                    <Badge variant="success" className="text-[10px]">Success</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Offered +50 Karma bonus. Dr. Emily Chen accepted the shift.</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end items-center gap-3">
              <Button variant="outline" onClick={() => setIsRecoveryMode(false)}>Cancel</Button>
              <Button onClick={handleApplyRecovery} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Confirm Dr. Chen
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
