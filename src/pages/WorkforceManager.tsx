import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Download, Upload, Plus, Search, Award, Star, Flame, Loader2, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { useAuthFetch, useAuth } from '../contexts/AuthContext';

function parseCSV(text: string): any[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
  return lines.slice(1).map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue; }
      current += char;
    }
    values.push(current.trim());
    const obj: any = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
}

function toCSV(data: any[]): string {
  if (data.length === 0) return '';
  const headers = ['name', 'grade', 'department', 'specialty', 'site', 'contract', 'fte', 'status', 'karma', 'fatigue', 'maxHours'];
  const rows = data.map(d => headers.map(h => `"${(d[h] ?? '').toString().replace(/"/g, '""')}"`).join(','));
  return [headers.join(','), ...rows].join('\n');
}

export function WorkforceManager() {
  const { addToast } = useToast();
  const authFetch = useAuthFetch();
  const { isAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination & filter state
  const [staff, setStaff] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');

  // Filter options from API
  const [filterOptions, setFilterOptions] = useState<any>({ grades: [], departments: [], specialties: [], sites: [] });

  // Modal state
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [formData, setFormData] = useState({
    name: '', grade: 'Registrar', department: 'A&E', contract: '100%', fte: '1.0', status: 'Active', maxHours: 48,
  });

  const LIMIT = 30;

  // Fetch filter options once
  useEffect(() => {
    authFetch('/api/doctors/filters').then(r => r.json()).then(d => {
      if (d.success) setFilterOptions(d.data);
    }).catch(() => {});
  }, []);

  // Fetch staff with pagination + filters
  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(LIMIT));
      if (searchQuery) params.set('search', searchQuery);
      if (gradeFilter) params.set('grade', gradeFilter);
      if (deptFilter) params.set('department', deptFilter);
      if (specialtyFilter) params.set('specialty', specialtyFilter);
      if (siteFilter) params.set('site', siteFilter);

      const res = await authFetch(`/api/doctors?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        setStaff(result.data);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, gradeFilter, deptFilter, specialtyFilter, siteFilter, authFetch]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [searchQuery, gradeFilter, deptFilter, specialtyFilter, siteFilter]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleOpenModal = (person?: any) => {
    if (person) {
      setEditingStaff(person);
      setFormData({
        name: person.name, grade: person.grade || 'Registrar', department: person.department || 'A&E',
        contract: person.contract || '100%', fte: person.fte || '1.0', status: person.status || 'Active', maxHours: person.maxHours || 48,
      });
    } else {
      setEditingStaff(null);
      setFormData({ name: '', grade: 'Registrar', department: 'A&E', contract: '100%', fte: '1.0', status: 'Active', maxHours: 48 });
    }
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const url = editingStaff ? `/api/doctors/${editingStaff.id}` : '/api/doctors';
      const method = editingStaff ? 'PUT' : 'POST';
      const response = await authFetch(url, { method, body: JSON.stringify(formData) });
      const data = await response.json();
      if (data.success) {
        addToast(`Staff member ${editingStaff ? 'updated' : 'added'}`, 'success');
        setIsStaffModalOpen(false);
        fetchStaff();
      } else {
        addToast(data.message || 'Failed to save', 'error');
      }
    } catch { addToast('Error saving', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Delete this staff member?')) return;
    try {
      const res = await authFetch(`/api/doctors/${id}`, { method: 'DELETE' });
      if ((await res.json()).success) { addToast('Deleted', 'success'); fetchStaff(); }
    } catch { addToast('Error deleting', 'error'); }
  };

  const handleExport = async () => {
    try {
      const res = await authFetch('/api/import/doctors/export');
      const data = await res.json();
      if (data.success) {
        const csv = toCSV(data.data);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rotaai-workforce-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        addToast(`Exported ${data.data.length} staff`, 'success');
      }
    } catch { addToast('Export failed', 'error'); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const parsed = parseCSV(evt.target?.result as string);
      setImportPreview(parsed);
      setIsImportModalOpen(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportConfirm = async () => {
    setIsImporting(true);
    try {
      const res = await authFetch('/api/import/doctors', {
        method: 'POST',
        body: JSON.stringify({ doctors: importPreview }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(`Imported ${data.data.imported} doctors`, 'success');
        setIsImportModalOpen(false);
        setImportPreview([]);
        fetchStaff();
      }
    } catch { addToast('Import failed', 'error'); }
    finally { setIsImporting(false); }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Workforce</h1>
          <p className="text-muted-foreground mt-1">{total.toLocaleString()} staff members</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-2" />Export</Button>
          {isAdmin && (
            <>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-2" />Import</Button>
              <Button size="sm" onClick={() => handleOpenModal()}><Plus className="w-4 h-4 mr-2" />Add</Button>
            </>
          )}
        </div>
      </div>

      {/* Filters bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Search by name, code, email..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                className="w-full h-9 pl-9 pr-4 rounded-md bg-secondary text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm" />
            </div>
            <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}
              className="h-9 px-3 rounded-md bg-secondary text-foreground border border-border text-sm focus:border-primary outline-none min-w-[120px]">
              <option value="">All Grades</option>
              {filterOptions.grades.map((g: string) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
              className="h-9 px-3 rounded-md bg-secondary text-foreground border border-border text-sm focus:border-primary outline-none min-w-[140px]">
              <option value="">All Departments</option>
              {filterOptions.departments.map((d: string) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={specialtyFilter} onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="h-9 px-3 rounded-md bg-secondary text-foreground border border-border text-sm focus:border-primary outline-none min-w-[160px]">
              <option value="">All Specialties</option>
              {filterOptions.specialties.map((s: string) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}
              className="h-9 px-3 rounded-md bg-secondary text-foreground border border-border text-sm focus:border-primary outline-none min-w-[140px]">
              <option value="">All Sites</option>
              {filterOptions.sites.map((s: string) => <option key={s} value={s}>{s}</option>)}
            </select>
            {(gradeFilter || deptFilter || specialtyFilter || siteFilter || searchQuery) && (
              <button onClick={() => { setGradeFilter(''); setDeptFilter(''); setSpecialtyFilter(''); setSiteFilter(''); setSearchInput(''); }}
                className="text-xs text-destructive hover:underline px-2">Clear all</button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile card view */}
        <div className="flex-1 overflow-auto md:hidden p-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : staff.map((p) => (
            <div key={p.id} className="p-3 border border-border rounded-lg bg-card space-y-2">
              <div className="flex items-center justify-between">
                <div><p className="font-medium text-sm">{p.name}</p><p className="text-xs text-muted-foreground">{p.grade} &bull; {p.department}{p.specialty ? ` &bull; ${p.specialty}` : ''}</p></div>
                <Badge variant={p.status === 'Active' ? 'success' : 'warning'}>{p.status}</Badge>
              </div>
              {isAdmin && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  <button onClick={() => handleOpenModal(p)} className="text-xs text-primary hover:underline">Edit</button>
                  <button onClick={() => handleDeleteStaff(p.id)} className="text-xs text-destructive hover:underline">Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="flex-1 overflow-auto hidden md:block">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Grade</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Specialty</th>
                <th className="px-4 py-3 font-medium">Site</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Karma</th>
                {isAdmin && <th className="px-4 py-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading...</td></tr>
              ) : staff.length > 0 ? staff.map((p) => (
                <tr key={p.id} className="bg-card hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    <div>{p.name}</div>
                    {p.doctorCode && <div className="text-xs text-muted-foreground font-mono">{p.doctorCode}</div>}
                  </td>
                  <td className="px-4 py-3">{p.grade}</td>
                  <td className="px-4 py-3">{p.department}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.specialty || '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.site || '-'}</td>
                  <td className="px-4 py-3"><Badge variant={p.status === 'Active' ? 'success' : 'warning'}>{p.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-500">
                      <Star className="w-3 h-3 fill-current" />{p.karma || 0}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleOpenModal(p)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteStaff(p.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              )) : (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No staff found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3 border-t border-border bg-secondary/30 flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {staff.length} of {total.toLocaleString()}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      <Modal isOpen={isStaffModalOpen} onClose={() => setIsStaffModalOpen(false)} title={editingStaff ? 'Edit Staff' : 'Add Staff'}>
        <form onSubmit={handleSaveStaff} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Grade</label>
              <select value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border outline-none">
                {(filterOptions.grades.length > 0 ? filterOptions.grades : ['Consultant', 'Registrar', 'SHO', 'FY2', 'FY1']).map((g: string) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <select value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border outline-none">
                {(filterOptions.departments.length > 0 ? filterOptions.departments : ['A&E', 'ICU', 'Surgery', 'Medicine']).map((d: string) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Contract</label>
              <select value={formData.contract} onChange={(e) => setFormData({ ...formData, contract: e.target.value })}
                className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border outline-none">
                <option value="100%">100%</option><option value="80%">80%</option><option value="60%">60%</option><option value="Locum">Locum</option><option value="48h">48h</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Hours</label>
              <input type="number" value={formData.maxHours} onChange={(e) => setFormData({ ...formData, maxHours: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border outline-none" />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsStaffModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{editingStaff ? 'Save' : 'Add'}</Button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={isImportModalOpen} onClose={() => { setIsImportModalOpen(false); setImportPreview([]); }} title="Import Doctors from CSV">
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">{importPreview.length} records to import</p>
          <div className="max-h-48 overflow-auto border border-border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-secondary/50 sticky top-0"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Grade</th><th className="px-3 py-2">Dept</th></tr></thead>
              <tbody className="divide-y divide-border">
                {importPreview.slice(0, 15).map((d, i) => <tr key={i}><td className="px-3 py-1.5">{d.name || `${d.first_name} ${d.last_name}`}</td><td className="px-3 py-1.5">{d.grade}</td><td className="px-3 py-1.5">{d.department}</td></tr>)}
              </tbody>
            </table>
            {importPreview.length > 15 && <p className="p-2 text-xs text-muted-foreground text-center">...and {importPreview.length - 15} more</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => { setIsImportModalOpen(false); setImportPreview([]); }}>Cancel</Button>
            <Button onClick={handleImportConfirm} disabled={isImporting}>
              {isImporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Import {importPreview.length}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
