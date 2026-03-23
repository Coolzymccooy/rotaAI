import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, PoundSterling, Clock, Users, AlertTriangle, Loader2, Download } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuthFetch } from '../contexts/AuthContext';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function Analytics() {
  const authFetch = useAuthFetch();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [docsRes, shiftsRes, rulesRes] = await Promise.all([
          authFetch('/api/doctors?page=1&limit=1'),
          authFetch('/api/shifts'),
          authFetch('/api/rules'),
        ]);
        const docs = await docsRes.json();
        const shifts = await shiftsRes.json();
        const rules = await rulesRes.json();

        const shiftData = shifts.data || [];
        const ruleData = rules.data || [];

        // Calculate analytics
        const shiftsByType: Record<string, number> = {};
        const shiftsByDay: Record<number, number> = {};
        shiftData.forEach((s: any) => {
          shiftsByType[s.type] = (shiftsByType[s.type] || 0) + 1;
          shiftsByDay[s.dayIdx % 7] = (shiftsByDay[s.dayIdx % 7] || 0) + 1;
        });

        const locumShifts = shiftData.filter((s: any) => s.isLocum);
        const violationShifts = shiftData.filter((s: any) => s.violation);
        const locumSpend = locumShifts.length * 12 * 80;

        const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const dailyDistribution = DAYS.map((day, idx) => ({
          name: day,
          shifts: shiftsByDay[idx] || 0,
        }));

        const typeDistribution = Object.entries(shiftsByType).map(([type, count]) => ({
          name: type,
          value: count,
        }));

        setStats({
          totalDoctors: docs.total || 0,
          totalShifts: shiftData.length,
          locumShifts: locumShifts.length,
          locumSpend,
          violations: violationShifts.length,
          activeRules: ruleData.filter((r: any) => r.isActive).length,
          totalRules: ruleData.length,
          dailyDistribution,
          typeDistribution,
          complianceRate: shiftData.length > 0 ? Math.round(((shiftData.length - violationShifts.length) / shiftData.length) * 100) : 100,
        });
      } catch {} finally { setIsLoading(false); }
    };
    load();
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Analytics & Reports</h1>
          <p className="text-muted-foreground mt-1">Workforce insights for board reporting.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Download className="w-4 h-4 mr-2" />Export Report
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card><CardContent className="p-4 text-center">
          <Users className="w-6 h-6 mx-auto text-primary opacity-50 mb-2" />
          <p className="text-2xl font-bold">{stats?.totalDoctors?.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Staff</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Clock className="w-6 h-6 mx-auto text-emerald-500 opacity-50 mb-2" />
          <p className="text-2xl font-bold">{stats?.totalShifts?.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Shifts Assigned</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <PoundSterling className="w-6 h-6 mx-auto text-amber-500 opacity-50 mb-2" />
          <p className="text-2xl font-bold">&pound;{stats?.locumSpend?.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Locum Spend</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <TrendingUp className="w-6 h-6 mx-auto text-emerald-500 opacity-50 mb-2" />
          <p className="text-2xl font-bold text-emerald-500">{stats?.complianceRate}%</p>
          <p className="text-xs text-muted-foreground">EWTD Compliance</p>
        </CardContent></Card>
        <Card className={stats?.violations > 0 ? 'border-destructive/30' : ''}><CardContent className="p-4 text-center">
          <AlertTriangle className="w-6 h-6 mx-auto text-destructive opacity-50 mb-2" />
          <p className="text-2xl font-bold text-destructive">{stats?.violations}</p>
          <p className="text-xs text-muted-foreground">Violations</p>
        </CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily distribution */}
        <Card>
          <CardHeader><CardTitle>Shifts by Day of Week</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.dailyDistribution || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                  <Bar dataKey="shifts" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Shift type pie chart */}
        <Card>
          <CardHeader><CardTitle>Shift Type Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[250px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats?.typeDistribution || []} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {(stats?.typeDistribution || []).map((_: any, idx: number) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary for board */}
      <Card>
        <CardHeader><CardTitle>Board Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-secondary/30 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Workforce</h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>{stats?.totalDoctors?.toLocaleString()} staff on roster</li>
                <li>{stats?.totalShifts?.toLocaleString()} shifts assigned this period</li>
                <li>{stats?.locumShifts} locum shifts ({stats?.totalShifts > 0 ? Math.round((stats?.locumShifts / stats?.totalShifts) * 100) : 0}%)</li>
              </ul>
            </div>
            <div className="p-4 bg-secondary/30 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Compliance</h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>{stats?.complianceRate}% EWTD compliance rate</li>
                <li>{stats?.violations} active violations</li>
                <li>{stats?.activeRules}/{stats?.totalRules} rules enforced</li>
              </ul>
            </div>
            <div className="p-4 bg-secondary/30 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Finance</h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>&pound;{stats?.locumSpend?.toLocaleString()} projected locum spend</li>
                <li>&pound;{((stats?.locumShifts || 0) * 80).toLocaleString()} hourly rate cost</li>
                <li>{stats?.locumShifts} agency shifts to fill</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
