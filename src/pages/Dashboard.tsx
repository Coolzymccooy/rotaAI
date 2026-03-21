import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Activity, Flame, PoundSterling, TrendingDown, Loader2, Trophy, Star, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuthFetch, useAuth } from '../contexts/AuthContext';

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
  const navigate = useNavigate();
  const authFetch = useAuthFetch();
  const { user } = useAuth();
  const [totalDoctors, setTotalDoctors] = useState<number | null>(null);
  const [topKarmaDoctors, setTopKarmaDoctors] = useState<any[]>([]);
  const [locumSpend, setLocumSpend] = useState<number | null>(null);
  const [burnoutRisk, setBurnoutRisk] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Use paginated endpoint for count (page=1, limit=1 just for total)
        const [countRes, topKarmaRes, shiftsRes] = await Promise.all([
          authFetch('/api/doctors?page=1&limit=1'),
          authFetch('/api/doctors?page=1&limit=5'),  // Small page for top karma
          authFetch('/api/shifts'),
        ]);

        const countData = await countRes.json();
        const topData = await topKarmaRes.json();
        const shiftsData = await shiftsRes.json();

        if (countData.success) {
          setTotalDoctors(countData.total || 0);
        }

        if (topData.success) {
          const sorted = [...(topData.data || [])].sort((a: any, b: any) => (b.karma || 0) - (a.karma || 0)).slice(0, 3);
          setTopKarmaDoctors(sorted);
          // Burnout is approximate from this small sample
          setBurnoutRisk(0);
        }

        if (shiftsData.success) {
          const locumShifts = shiftsData.data.filter((s: any) => s.isLocum);
          setLocumSpend(locumShifts.length * 12 * 80);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      }
    };
    fetchData();
  }, [authFetch]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Welcome back, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground mt-1">Overview of your workforce and rota health.</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Locum Spend</CardTitle>
            <PoundSterling className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {locumSpend === null ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold text-amber-500">&pound;{locumSpend.toLocaleString()}</div>
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
                <p className="text-xs text-destructive/80 mt-1">Critical fatigue levels</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
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
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
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
                topKarmaDoctors.map((doc: any, index: number) => (
                  <div key={doc.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : index === 1
                            ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">{doc.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">{doc.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md">
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
