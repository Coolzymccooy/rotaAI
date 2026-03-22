import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Shield, CheckCircle2, XCircle, AlertTriangle, Clock, Download, Trash2, Loader2, FileText, Lock, Eye } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { useAuth, useAuthFetch } from '../contexts/AuthContext';

export function Compliance() {
  const { isAdmin } = useAuth();
  const authFetch = useAuthFetch();
  const { addToast } = useToast();
  const [dtacStatus, setDtacStatus] = useState<any>(null);
  const [changeLogs, setChangeLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dtac' | 'changelog' | 'gdpr'>('dtac');

  useEffect(() => {
    const load = async () => {
      try {
        if (isAdmin) {
          const [dtacRes, logRes] = await Promise.all([
            authFetch('/api/compliance/dtac-status'),
            authFetch('/api/compliance/changelog?limit=50'),
          ]);
          const dtac = await dtacRes.json();
          const logs = await logRes.json();
          if (dtac.success) setDtacStatus(dtac.data);
          if (logs.success) setChangeLogs(logs.logs || []);
        }
      } catch {} finally { setIsLoading(false); }
    };
    load();
  }, []);

  const handleExportMyData = async () => {
    try {
      const res = await authFetch('/api/compliance/my-data');
      const data = await res.json();
      if (data.success) {
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rotaai-my-data-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        addToast('Data exported successfully', 'success');
      }
    } catch { addToast('Export failed', 'error'); }
  };

  const handleRecordConsent = async (type: string, granted: boolean) => {
    try {
      await authFetch('/api/compliance/consent', {
        method: 'POST',
        body: JSON.stringify({ consentType: type, granted, version: '1.0' }),
      });
      addToast(`Consent ${granted ? 'granted' : 'revoked'} for ${type}`, 'success');
    } catch { addToast('Failed', 'error'); }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'review': return <Eye className="w-4 h-4 text-blue-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-muted-foreground" />;
      case 'partial': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default: return <XCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pass': return 'success';
      case 'warning': return 'warning';
      case 'review': return 'default';
      case 'pending': return 'secondary';
      default: return 'warning';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Compliance & Data Protection</h1>
          <p className="text-muted-foreground mt-1">NHS DTAC, GDPR, and CQC compliance management.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-secondary p-1 rounded-lg flex items-center">
            {(['dtac', 'changelog', 'gdpr'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                  activeTab === tab ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
                }`}>
                {tab === 'dtac' ? 'DTAC Status' : tab === 'changelog' ? 'Change Log' : 'GDPR Rights'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : activeTab === 'dtac' && dtacStatus ? (
        <>
          {/* Score banner */}
          <Card className={dtacStatus.overallScore >= 70 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">{dtacStatus.overallScore}%</h2>
                <p className="text-sm text-muted-foreground mt-1">DTAC Compliance Score ({dtacStatus.passCount}/{dtacStatus.totalChecks} checks passed)</p>
              </div>
              <Shield className={`w-16 h-16 opacity-20 ${dtacStatus.overallScore >= 70 ? 'text-emerald-500' : 'text-amber-500'}`} />
            </CardContent>
          </Card>

          {/* Checks grid */}
          <div className="grid gap-3 md:grid-cols-2">
            {dtacStatus.checks.map((check: any) => (
              <Card key={check.id} className="hover:bg-secondary/20 transition-colors">
                <CardContent className="p-4 flex items-start gap-3">
                  {statusIcon(check.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium">{check.name}</h3>
                      <Badge variant={statusBadge(check.status) as any} className="text-[10px]">{check.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{check.detail}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : activeTab === 'changelog' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />Field-Level Change History (CQC Grade)</CardTitle>
          </CardHeader>
          <CardContent>
            {changeLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No changes recorded yet. Changes will appear here as users modify data.</p>
            ) : (
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {changeLogs.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 p-2 rounded hover:bg-secondary/30 text-xs">
                    <Badge variant={log.action === 'CREATE' ? 'success' : log.action === 'DELETE' ? 'destructive' : 'warning'} className="text-[10px] shrink-0 mt-0.5">{log.action}</Badge>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{log.userName || 'System'}</span>
                      {' '}{log.action.toLowerCase()}d{' '}
                      <span className="text-foreground">{log.entity}</span>
                      {log.fieldName && (
                        <span className="text-muted-foreground"> .{log.fieldName}: <span className="line-through text-destructive/70">{log.oldValue || 'null'}</span> → <span className="text-emerald-600 dark:text-emerald-400">{log.newValue}</span></span>
                      )}
                    </div>
                    <span className="text-muted-foreground shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : activeTab === 'gdpr' ? (
        <div className="space-y-6">
          {/* Data export */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Download className="w-5 h-5 text-primary" />Your Data Rights (GDPR)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div>
                  <h4 className="font-medium text-sm">Subject Access Request (Article 15)</h4>
                  <p className="text-xs text-muted-foreground mt-1">Download all data we hold about you in portable JSON format.</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportMyData}><Download className="w-3.5 h-3.5 mr-1" />Export My Data</Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                <div>
                  <h4 className="font-medium text-sm text-destructive">Right to Erasure (Article 17)</h4>
                  <p className="text-xs text-muted-foreground mt-1">Request permanent anonymization of your personal data.</p>
                </div>
                <Button variant="outline" size="sm" className="text-destructive border-destructive/20"
                  onClick={() => { if (confirm('This will permanently anonymize your account. This cannot be undone. Continue?')) { /* handle erasure */ } }}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" />Request Erasure
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Consent management */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5 text-primary" />Consent Management</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { type: 'data_processing', label: 'Data Processing', desc: 'Allow RotaAI to process your shift and scheduling data', required: true },
                { type: 'communications', label: 'Communications', desc: 'Receive email notifications about shift changes and requests', required: false },
                { type: 'analytics', label: 'Usage Analytics', desc: 'Help improve the product with anonymous usage data', required: false },
              ].map((consent) => (
                <div key={consent.type} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium">{consent.label}</h4>
                      {consent.required && <Badge variant="destructive" className="text-[10px]">Required</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{consent.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked={consent.required}
                      onChange={(e) => handleRecordConsent(consent.type, e.target.checked)} />
                    <div className="w-11 h-6 bg-secondary rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
