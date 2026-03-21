import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Activity, AlertTriangle, CheckCircle2, Clock, Users, Flame, PoundSterling, TrendingDown, Loader2, Trophy, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useToast } from '../components/ui/Toast';
import { useNavigate } from 'react-router-dom';

const data = [
  { name: 'Mon', hours: 120 },
  { name: 'Tue', hours: 132 },
  { name: 'Wed', hours: 101 },
  { name: 'Thu', hours: 143 },
  { name: 'Fri', hours: 190 },
  { name: 'Sat', hours: 210 },
  { name: 'Sun', hours: 180 },
];

export function Dashboard() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [totalDoctors, setTotalDoctors] = useState<number | null>(null);
  const [topKarmaDoctors, setTopKarmaDoctors] = useState<any[]>([]);
  const [locumSpend, setLocumSpend] = useState<number | null>(null);
  const [burnoutRisk, setBurnoutRisk] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docsRes, shiftsRes] = await Promise.all([
          fetch('/api/doctors'),
          fetch('/api/shifts')
        ]);
        
        const docsData = await docsRes.json();
        const shiftsData = await shiftsRes.json();

        if (docsData.success) {
          setTotalDoctors(docsData.data.length);
          const sorted = [...docsData.data].sort((a, b) => b.karma - a.karma).slice(0, 3);
          setTopKarmaDoctors(sorted);
          
          // Calculate burnout risk (doctors with fatigue > 80)
          const highFatigueDocs = docsData.data.filter((d: any) => d.fatigue > 80);
          setBurnoutRisk(highFatigueDocs.length);
        }

        if (shiftsData.success) {
          // Calculate locum spend (mock calculation: £80/hr * 12hrs per locum shift)
          const locumShifts = shiftsData.data.filter((s: any) => s.isLocum);
          const spend = locumShifts.length * 12 * 80;
          setLocumSpend(spend);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your workforce and rota health.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate('/app/workforce')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {totalDoctors === null ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{totalDoctors}</div>
                <p className="text-xs text-muted-foreground">+2 from last month</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate('/app/rota')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rota Health</CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">98%</div>
            <p className="text-xs text-muted-foreground">Optimal coverage</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate('/app/rota')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Locum Spend</CardTitle>
            <PoundSterling className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {locumSpend === null ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold text-amber-500">£{locumSpend.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <TrendingDown className="w-3 h-3 text-emerald-500" />
                  -12% from last week
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:border-destructive/50 transition-colors border-destructive/20 bg-destructive/5"
          onClick={() => addToast('Viewing burnout risk analysis...', 'error')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Burnout Risk</CardTitle>
            <Flame className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {burnoutRisk === null ? (
              <Loader2 className="w-5 h-5 animate-spin text-destructive" />
            ) : (
              <>
                <div className="text-2xl font-bold text-destructive">{burnoutRisk} Staff</div>
                <p className="text-xs text-destructive/80 mt-1">Critical fatigue levels detected</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Weekly Hours Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}h`} />
                  <Tooltip 
                    cursor={{fill: 'hsl(var(--muted))'}}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Shift Karma Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {topKarmaDoctors.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                topKarmaDoctors.map((doc, index) => (
                  <div key={doc.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-amber-100 text-amber-700' :
                        index === 1 ? 'bg-slate-100 text-slate-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">{doc.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">{doc.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      {doc.karma}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
