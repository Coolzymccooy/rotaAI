import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Activity, AlertTriangle, Users, Map as MapIcon, ArrowRightLeft, Stethoscope, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { useAuthFetch } from '../contexts/AuthContext';

export function LiveMap() {
  const { addToast } = useToast();
  const authFetch = useAuthFetch();
  const [wards, setWards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRebalancing, setIsRebalancing] = useState(false);

  const fetchWards = async () => {
    try {
      const res = await authFetch('/api/wards');
      const data = await res.json();
      if (data.success) setWards(data.data);
    } catch (error) {
      console.error('Failed to fetch wards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchWards(); }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await authFetch('/api/wards/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setWards(data.data);
        addToast(data.message || 'EHR data synced successfully.', 'success');
      }
    } catch (error) {
      addToast('Failed to sync EHR data', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRebalance = async () => {
    setIsRebalancing(true);
    try {
      const res = await authFetch('/api/wards/rebalance', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setWards(data.data.wards);
        addToast(data.data.message, data.data.moves.length > 0 ? 'success' : 'info');
      }
    } catch (error) {
      addToast('Failed to rebalance staff', 'error');
    } finally {
      setIsRebalancing(false);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Live Acuity Map</h1>
          <p className="text-muted-foreground mt-1">Real-time patient load vs. staffing levels.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sync EHR
          </Button>
          <Button size="sm" onClick={handleRebalance} disabled={isRebalancing} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {isRebalancing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}
            Auto-Balance
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {wards.map((ward) => (
            <Card key={ward.id} className={`transition-all ${
              ward.status === 'critical' ? 'border-destructive/50 bg-destructive/5' :
              ward.status === 'warning' ? 'border-amber-500/50 bg-amber-500/5' :
              ward.status === 'overstaffed' ? 'border-indigo-500/50 bg-indigo-500/5' :
              'border-emerald-500/20 bg-emerald-500/5'
            }`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold">{ward.name}</CardTitle>
                  {ward.status === 'critical' && <AlertTriangle className="w-5 h-5 text-destructive animate-pulse" />}
                  {ward.status === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                  {ward.status === 'stable' && <Activity className="w-5 h-5 text-emerald-500" />}
                  {ward.status === 'overstaffed' && <Users className="w-5 h-5 text-indigo-500" />}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Patient Load</span>
                      <span className={`font-medium ${ward.patients > ward.capacity ? 'text-destructive' : ''}`}>{ward.patients} / {ward.capacity}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className={`h-2 rounded-full ${ward.patients > ward.capacity ? 'bg-destructive' : 'bg-primary'}`}
                        style={{ width: `${Math.min((ward.patients / ward.capacity) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{ward.staff} Docs</span>
                    </div>
                    <Badge variant={ward.staff < ward.required ? 'destructive' : ward.staff > ward.required ? 'secondary' : 'success'}>
                      {ward.staff < ward.required ? `Need +${ward.required - ward.staff}` : ward.staff > ward.required ? `+${ward.staff - ward.required}` : 'Optimal'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="flex-1 min-h-[300px] relative overflow-hidden bg-secondary/20 border-border/50 flex items-center justify-center">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="text-center space-y-4 relative z-10 p-8">
          <MapIcon className="w-16 h-16 text-muted-foreground/50 mx-auto" />
          <h3 className="text-xl font-medium text-muted-foreground">Interactive 3D Floorplan</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Spatial view renders a real-time hospital layout. Use the buttons above to sync patient data and rebalance staff.
          </p>
        </div>
      </Card>
    </div>
  );
}
