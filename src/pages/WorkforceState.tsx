import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Users, UserCheck, UserX, AlertTriangle, Clock, RefreshCw, Loader2, Flame, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuthFetch } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function WorkforceState() {
  const authFetch = useAuthFetch();
  const navigate = useNavigate();
  const [state, setState] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchState = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch('/api/workforce-state');
      const data = await res.json();
      if (data.success) setState(data.data);
    } catch {} finally { setIsLoading(false); }
  };

  useEffect(() => { fetchState(); }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!state) {
    return <div className="text-center py-12 text-muted-foreground">Failed to load workforce state</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Workforce State</h1>
          <p className="text-muted-foreground mt-1">Real-time availability, coverage, and fatigue snapshot.</p>
          <p className="text-xs text-muted-foreground mt-0.5">Last updated: {new Date(state.timestamp).toLocaleString()}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchState}>
          <RefreshCw className="w-4 h-4 mr-2" />Refresh
        </Button>
      </div>

      {/* Top-level KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card><CardContent className="p-4 text-center">
          <Users className="w-6 h-6 mx-auto text-primary opacity-50 mb-1" />
          <p className="text-2xl font-bold">{state.totalStaff.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Total Staff</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <UserCheck className="w-6 h-6 mx-auto text-emerald-500 opacity-50 mb-1" />
          <p className="text-2xl font-bold text-emerald-500">{state.available.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Available Now</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <UserX className="w-6 h-6 mx-auto text-amber-500 opacity-50 mb-1" />
          <p className="text-2xl font-bold text-amber-500">{state.onLeave}</p>
          <p className="text-[10px] text-muted-foreground">On Leave</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <AlertTriangle className="w-6 h-6 mx-auto text-destructive opacity-50 mb-1" />
          <p className="text-2xl font-bold text-destructive">{state.coverageGaps.length}</p>
          <p className="text-[10px] text-muted-foreground">Coverage Gaps</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Clock className="w-6 h-6 mx-auto text-muted-foreground opacity-50 mb-1" />
          <p className="text-2xl font-bold">{state.recentChanges}</p>
          <p className="text-[10px] text-muted-foreground">Changes (24h)</p>
        </CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Department coverage */}
        <Card>
          <CardHeader><CardTitle>Department Coverage</CardTitle></CardHeader>
          <CardContent>
            {state.byDepartment.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No department data</p>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={state.byDepartment.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={v => `${v}%`} />
                    <YAxis type="category" dataKey="department" width={120} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} formatter={(v: any) => `${v}%`} />
                    <Bar dataKey="coverage" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grade breakdown */}
        <Card>
          <CardHeader><CardTitle>Staff by Grade</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {state.byGrade.slice(0, 12).map((g: any) => (
                <div key={g.grade} className="flex items-center justify-between">
                  <span className="text-sm">{g.grade}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-secondary rounded-full h-2">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${g.total > 0 ? (g.available / g.total) * 100 : 0}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-16 text-right">{g.available}/{g.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coverage gaps */}
      {state.coverageGaps.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Coverage Gaps ({state.coverageGaps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {state.coverageGaps.map((gap: any, i: number) => (
                <div key={i} className="p-3 bg-card rounded-lg border border-border">
                  <h4 className="text-sm font-medium">{gap.department}</h4>
                  <p className="text-xs text-muted-foreground">{gap.shiftType} shift</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs">Need: <strong>{gap.required}</strong></span>
                    <span className="text-xs">Have: <strong className="text-emerald-500">{gap.filled}</strong></span>
                    <Badge variant="destructive" className="text-[10px]">Gap: {gap.gap}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* High fatigue */}
      {state.highFatigue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500" />
              High Fatigue Risk ({state.highFatigue.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {state.highFatigue.map((staff: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/30">
                  <div>
                    <p className="text-sm font-medium">{staff.name}</p>
                    <p className="text-xs text-muted-foreground">{staff.grade} &bull; {staff.department}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span>{staff.hoursLast7}h <span className="text-muted-foreground">/ 7 days</span></span>
                    <span>{staff.nightsYtd} <span className="text-muted-foreground">nights YTD</span></span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
