import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ClipboardList, Filter, Loader2, Download } from 'lucide-react';
import { useAuthFetch } from '../contexts/AuthContext';

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  createdAt: string;
  user?: { name: string; email: string; role: string };
}

export function AuditLog() {
  const authFetch = useAuthFetch();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityFilter) params.set('entity', entityFilter);
      if (actionFilter) params.set('action', actionFilter);
      params.set('limit', '100');

      const res = await authFetch(`/api/audit?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data.logs);
        setTotal(data.data.total);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [entityFilter, actionFilter]);

  const actionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'success';
      case 'UPDATE': return 'warning';
      case 'DELETE': return 'destructive';
      case 'LOGIN': return 'default';
      case 'REVIEW': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground mt-1">Track all changes and compliance events.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="h-9 px-3 rounded-md bg-secondary text-foreground border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          >
            <option value="">All Entities</option>
            <option value="Shift">Shifts</option>
            <option value="Doctor">Doctors</option>
            <option value="Rule">Rules</option>
            <option value="LeaveRequest">Leave Requests</option>
            <option value="ShiftSwap">Shift Swaps</option>
          </select>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-9 px-3 rounded-md bg-secondary text-foreground border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          >
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="LOGIN">Login</option>
            <option value="REVIEW">Review</option>
          </select>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              Activity Log ({total} entries)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No audit entries found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors border border-transparent hover:border-border">
                  <Badge variant={actionColor(log.action) as any} className="mt-0.5 shrink-0">
                    {log.action}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      <span className="text-muted-foreground">{log.user?.name || 'System'}</span>
                      {' '}{log.action.toLowerCase()}d{' '}
                      <span className="text-foreground">{log.entity}</span>
                      {log.entityId && <span className="text-muted-foreground text-xs ml-1">({log.entityId.slice(0, 8)})</span>}
                    </p>
                    {log.details && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {log.details}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
