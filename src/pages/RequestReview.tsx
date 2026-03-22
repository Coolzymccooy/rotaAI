import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CheckCircle2, XCircle, Clock, Loader2, Filter, Calendar, ArrowRightLeft, AlertTriangle, FileText } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { useAuthFetch } from '../contexts/AuthContext';

export function RequestReview() {
  const authFetch = useAuthFetch();
  const { addToast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '100');

      const res = await authFetch(`/api/self-service/requests?${params.toString()}`);
      const data = await res.json();
      if (data.success) setRequests(data.data);
    } catch {} finally { setIsLoading(false); }
  };

  useEffect(() => { fetchRequests(); }, [typeFilter, statusFilter]);

  const handleReview = async (id: string, status: 'approved' | 'rejected', note?: string) => {
    setReviewingId(id);
    try {
      const res = await authFetch(`/api/self-service/requests/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reviewNote: note }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(`Request ${status}`, status === 'approved' ? 'success' : 'info');
        fetchRequests();
      } else {
        addToast(data.message || 'Failed', 'error');
      }
    } catch { addToast('Error', 'error'); }
    finally { setReviewingId(null); }
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'leave': return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'swap': return <ArrowRightLeft className="w-4 h-4 text-purple-500" />;
      case 'restriction': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default: return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Request Review</h1>
          <p className="text-muted-foreground mt-1">
            {pendingCount > 0 ? `${pendingCount} request(s) awaiting review` : 'All requests reviewed'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 px-3 rounded-md bg-secondary text-foreground border border-border text-sm outline-none">
            <option value="">All Types</option>
            <option value="leave">Leave</option>
            <option value="swap">Swap</option>
            <option value="preference">Preference</option>
            <option value="restriction">Restriction</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-md bg-secondary text-foreground border border-border text-sm outline-none">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 grid-cols-4">
        {[
          { label: 'Pending', count: requests.filter(r => r.status === 'pending').length, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Approved', count: requests.filter(r => r.status === 'approved').length, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Rejected', count: requests.filter(r => r.status === 'rejected').length, color: 'text-destructive', bg: 'bg-destructive/10' },
          { label: 'Total', count: requests.length, color: 'text-primary', bg: 'bg-primary/10' },
        ].map((s) => (
          <Card key={s.label} className={s.bg}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Request list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No requests found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {requests.map((r) => (
                <div key={r.id} className="p-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {typeIcon(r.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-medium">{r.title}</h3>
                          <Badge variant="secondary" className="text-[10px]">{r.type}{r.subType ? ` / ${r.subType}` : ''}</Badge>
                          <Badge variant={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'destructive' : 'warning'} className="text-[10px]">
                            {r.status}
                          </Badge>
                          {r.autoApprovable && <Badge variant="outline" className="text-[10px]">Auto-approvable</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">{r.doctor?.name}</span> &bull; {r.doctor?.grade} &bull; {r.doctor?.department}
                        </p>
                        {r.startDate && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(r.startDate).toLocaleDateString()} {r.endDate ? `— ${new Date(r.endDate).toLocaleDateString()}` : ''}
                          </p>
                        )}
                        {r.description && (
                          <p className="text-xs text-muted-foreground mt-1 italic">"{r.description}"</p>
                        )}
                        {r.reviewNote && (
                          <p className="text-xs mt-1">
                            <span className="font-medium">Review note:</span> {r.reviewNote}
                          </p>
                        )}
                      </div>
                    </div>

                    {r.status === 'pending' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="sm"
                          className="text-destructive border-destructive/20 hover:bg-destructive/10"
                          disabled={reviewingId === r.id}
                          onClick={() => {
                            const note = prompt('Rejection reason (optional):');
                            handleReview(r.id, 'rejected', note || undefined);
                          }}>
                          {reviewingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5 mr-1" />}
                          Reject
                        </Button>
                        <Button size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={reviewingId === r.id}
                          onClick={() => handleReview(r.id, 'approved')}>
                          {reviewingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                          Approve
                        </Button>
                      </div>
                    )}

                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
