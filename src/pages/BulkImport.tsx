import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2, AlertTriangle, Users, Calendar, Settings2, Clock, Building2, Stethoscope, Heart } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { useAuthFetch } from '../contexts/AuthContext';

function parseCSV(text: string): any[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
  return lines.slice(1).map(line => {
    // Handle quoted values with commas inside
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

interface FileSlot {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  required: boolean;
  expectedColumns: string[];
  data: any[] | null;
  fileName: string | null;
}

export function BulkImport() {
  const { addToast } = useToast();
  const authFetch = useAuthFetch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);

  const [files, setFiles] = useState<FileSlot[]>([
    { key: 'doctors', label: 'Doctors / Medical Staff', description: 'Consultants, registrars, SHOs, FY1/FY2, GPs, locums', icon: Stethoscope, required: false, expectedColumns: ['doctor_id', 'first_name', 'last_name', 'grade'], data: null, fileName: null },
    { key: 'nurses', label: 'Nurses & Midwives', description: 'Staff nurses, sisters, ANPs, CNS, midwives, nursing associates', icon: Heart, required: false, expectedColumns: ['staff_id', 'first_name', 'last_name', 'clinical_role', 'band'], data: null, fileName: null },
    { key: 'supportStaff', label: 'Support Workers & Care Staff', description: 'HCAs, care workers, nursing assistants, therapy assistants, porters', icon: Users, required: false, expectedColumns: ['staff_id', 'first_name', 'last_name', 'clinical_role', 'band'], data: null, fileName: null },
    { key: 'ahps', label: 'Allied Health Professionals', description: 'Physios, OTs, SLTs, radiographers, ODPs, PAs, pharmacists, paramedics', icon: Users, required: false, expectedColumns: ['staff_id', 'first_name', 'last_name', 'clinical_role', 'registration_body'], data: null, fileName: null },
    { key: 'leaveRequests', label: 'Leave Requests', description: 'Annual/study/sick leave for all staff', icon: Calendar, required: false, expectedColumns: ['leave_id', 'staff_id', 'leave_type', 'start_date'], data: null, fileName: null },
    { key: 'doctorPreferences', label: 'Staff Preferences', description: 'Shift and fairness preferences for all roles', icon: Settings2, required: false, expectedColumns: ['staff_id', 'preferred_shift', 'fairness_weight'], data: null, fileName: null },
    { key: 'historicalLoad', label: 'Historical Load', description: 'YTD nights, weekends, on-calls', icon: Clock, required: false, expectedColumns: ['staff_id', 'weekends_ytd', 'nights_ytd'], data: null, fileName: null },
    { key: 'shiftTemplates', label: 'Shift Templates', description: 'Standard shift type definitions', icon: FileSpreadsheet, required: false, expectedColumns: ['shift_template_id', 'shift_type', 'start_time'], data: null, fileName: null },
    { key: 'serviceRequirements', label: 'Service Requirements', description: 'Minimum staffing by site/dept/role', icon: Building2, required: false, expectedColumns: ['site', 'specialty', 'department', 'shift_type'], data: null, fileName: null },
  ]);

  const handleFileClick = (key: string) => {
    setActiveSlot(key);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSlot) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const parsed = parseCSV(text);

      setFiles(prev => prev.map(f =>
        f.key === activeSlot ? { ...f, data: parsed, fileName: file.name } : f
      ));
      addToast(`Loaded ${parsed.length} rows from ${file.name}`, 'success');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRemoveFile = (key: string) => {
    setFiles(prev => prev.map(f => f.key === key ? { ...f, data: null, fileName: null } : f));
  };

  const totalRows = files.reduce((sum, f) => sum + (f.data?.length || 0), 0);
  const hasRequiredFiles = files.filter(f => f.required).every(f => f.data !== null);

  const handleImport = async () => {
    if (!hasRequiredFiles) {
      addToast('Please upload the required doctors.csv file', 'error');
      return;
    }

    setIsImporting(true);
    setImportResults(null);

    try {
      const payload: any = {};
      files.forEach(f => {
        if (f.data) payload[f.key] = f.data;
      });

      const res = await authFetch('/api/import/bulk', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setImportResults(data.data);
        const totalImported = Object.values(data.data as Record<string, any>).reduce((sum: number, r: any) => sum + r.imported, 0);
        addToast(`Bulk import complete! ${totalImported} records imported.`, 'success');
      } else {
        addToast(data.message || 'Import failed', 'error');
      }
    } catch (error) {
      addToast('Import failed - check server logs', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Bulk Data Import</h1>
        <p className="text-muted-foreground mt-1">Upload CSV files to populate the system with workforce data.</p>
      </div>

      <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />

      {/* File slots grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {files.map((slot) => (
          <Card
            key={slot.key}
            className={`cursor-pointer transition-all hover:border-primary/50 ${
              slot.data ? 'border-emerald-500/50 bg-emerald-500/5' : ''
            }`}
            onClick={() => !slot.data && handleFileClick(slot.key)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <slot.icon className={`w-5 h-5 ${slot.data ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex items-center gap-2">
                  {slot.required && <Badge variant="destructive" className="text-[10px]">Required</Badge>}
                  {slot.data && <Badge variant="success">{slot.data.length} rows</Badge>}
                </div>
              </div>

              <h3 className="font-semibold mb-1">{slot.label}</h3>
              <p className="text-xs text-muted-foreground mb-3">{slot.description}</p>

              {slot.data ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {slot.fileName}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveFile(slot.key); }}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Upload className="w-3.5 h-3.5" />
                  Click to upload CSV
                </div>
              )}

              {!slot.data && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  Expected: {slot.expectedColumns.join(', ')}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Import action */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg">Ready to Import</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {totalRows > 0
                  ? `${files.filter(f => f.data).length} file(s) loaded with ${totalRows.toLocaleString()} total rows`
                  : 'Upload at least the doctors.csv file to begin'}
              </p>
            </div>
            <Button
              onClick={handleImport}
              disabled={!hasRequiredFiles || isImporting}
              className="min-w-[200px]"
            >
              {isImporting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" />Import {totalRows.toLocaleString()} Records</>
              )}
            </Button>
          </div>

          {!hasRequiredFiles && totalRows === 0 && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Upload <strong>doctors.csv</strong> first. Other files reference doctor IDs and will be linked automatically.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import results */}
      {importResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(importResults).map(([key, val]: [string, any]) => (
                <div key={key} className="p-4 rounded-lg border border-border bg-secondary/30">
                  <h4 className="font-medium capitalize mb-2">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">{val.imported} imported</span>
                    {val.skipped > 0 && (
                      <span className="text-amber-600 dark:text-amber-400">{val.skipped} skipped</span>
                    )}
                  </div>
                  {val.errors?.length > 0 && (
                    <div className="mt-2 text-xs text-destructive max-h-20 overflow-y-auto">
                      {val.errors.slice(0, 3).map((e: string, i: number) => <p key={i}>{e}</p>)}
                      {val.errors.length > 3 && <p>...and {val.errors.length - 3} more</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
